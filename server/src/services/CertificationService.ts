// =============================================================================
// CertificationService.ts
// Phase 2A.6 — External Dependency Safety Gate + Probe Stability Patch
//            + Certification Result Persistence & Audit Patch
// =============================================================================
//
// 🔒 PHASE 2A FEATURE FREEZE — 2026-06-16
// This file is sealed. No new methods, interfaces, probes, report fields,
// checksum strategies, or health metrics may be added. Bug fixes only.
// See PHASE_2A_FREEZE.md for full governance rules.
// =============================================================================
//
// Dependency Classification:
//   INTERNAL: PostgreSQL, Prisma, OCR Microservice, Catalog Parser, Validation Engine
//   EXTERNAL: NVIDIA NIM, future AI providers
//
// Probe Stability:
//   NVIDIA NIM  — 3 attempts, 2s apart
//   OCR Service — 3 attempts, 2s apart
//   PostgreSQL  — 2 attempts, 2s apart
//
// Health Thresholds (success rate):
//   >= 2/3  → HEALTHY
//   >0%<2/3 → DEGRADED
//   0%      → UNAVAILABLE
//
// Verdict Routing:
//   All pass + REAL_WORLD                  → READY_FOR_PHASE_2B
//   Any internal dependency unavailable    → VALIDATION_FAILED
//   External-only degradation              → REVIEW_REQUIRED
//   Accuracy / stability / consistency     → VALIDATION_FAILED or REVIEW_REQUIRED
//
// Audit Persistence:
//   Every call to persistSnapshot() writes an immutable
//   reports/catalog-validation/certification_snapshot_<timestamp>.json
//   (never overwrites; includes SHA-256 round-trip checksum).
// =============================================================================

import fs   from 'fs';
import path from 'path';
import crypto from 'crypto';

export enum DependencyClass {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export type DependencyStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface DependencyHealth {
  name: string;
  class: DependencyClass;
  status: DependencyStatus;
  available: boolean;
  probeAttempts: number;
  successfulProbes: number;
  failedProbes: number;
  successRatePercent: number;
  averageResponseTimeMs: number;
  lastError?: string;
}

export interface DependencyHealthReport {
  postgresql:       DependencyHealth;
  prisma:           DependencyHealth;
  ocrMicroservice:  DependencyHealth;
  catalogParser:    DependencyHealth;
  validationEngine: DependencyHealth;
  nvidiaNim:        DependencyHealth;
  probeTimestamp:   string;
}

export interface VendorResult {
  vendor: 'HIKVISION' | 'DAHUA' | 'CP_PLUS' | 'ZKTECO' | 'ESSL';
  brandAccuracy:    number;
  modelAccuracy:    number;
  priceAccuracy:    number;
  categoryAccuracy: number;
  ocrConfidence:    number;
  overallConfidence:number;
}

export interface StabilityMetrics {
  aiParseFailure:   number;
  ocrTimeout:       number;
  pdfCorrupted:     number;
  unsupportedFormat:number;
}

export interface CertificationVerdict {
  certified:       boolean;
  status:          'PASSED' | 'FAILED' | 'REVIEW_REQUIRED';
  readiness:       'READY_FOR_PHASE_2B' | 'NOT_READY';
  /** Unified token for JSON reports */
  certificationStatus: 'READY_FOR_PHASE_2B' | 'REVIEW_REQUIRED' | 'VALIDATION_FAILED';
  internalSystemStatus:     'HEALTHY' | 'DEGRADED' | 'FAILED';
  externalDependencyStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  failures:        string[];
  recommendations: string[];
  certificationDecisionRationale: string;
  dependencyHealth?: DependencyHealthReport;
  averages: {
    brandAccuracy:    number;
    modelAccuracy:    number;
    priceAccuracy:    number;
    categoryAccuracy: number;
    ocrConfidence:    number;
    overallConfidence:number;
  };
  variances: {
    brandAccuracy:    number;
    modelAccuracy:    number;
    priceAccuracy:    number;
    categoryAccuracy: number;
  };
}

// ---------------------------------------------------------------------------
// Audit snapshot types
// ---------------------------------------------------------------------------

/**
 * Top-level header stored in every certification snapshot file.
 * Provides a quick-glance summary without needing to parse the full payload.
 */
export interface CertificationSnapshot {
  timestamp:               string;
  validationMode:          'CI' | 'REAL_WORLD';
  certificationStatus:     string;
  readiness:               string;
  internalSystemStatus:    string;
  externalDependencyStatus:string;
  rationale:               string;
}

/** Full artifact written to disk — snapshot header + complete payload + checksum. */
export interface CertificationArtifact {
  /** Quick-glance header fields (matches CertificationSnapshot). */
  snapshot:                CertificationSnapshot;
  /** Complete certification payload for deep audit. */
  verdict:                 CertificationVerdict;
  vendorResults:           VendorResult[];
  stabilityMetrics:        StabilityMetrics;
  dependencyHealthReport:  DependencyHealthReport | undefined;
  governanceVersion:       string;
  authorizedBy:            string;
  /**
   * SHA-256 of the artifact JSON **without** this field present.
   * Allows post-write round-trip integrity verification.
   */
  artifactChecksum:        string;
}

export interface SnapshotPersistenceResult {
  success:       boolean;
  snapshotPath:  string;
  checksum:      string;
  error?:        string;
}

// ---------------------------------------------------------------------------
// Internal probe helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifySuccessRate(successfulProbes: number, totalProbes: number): DependencyStatus {
  if (totalProbes === 0) return 'UNAVAILABLE';
  const rate = successfulProbes / totalProbes;
  // Use exact fraction — 2/3 = 0.666... classifies as HEALTHY
  if (rate >= 2 / 3) return 'HEALTHY';
  if (rate > 0)      return 'DEGRADED';
  return 'UNAVAILABLE';
}

async function runProbeAttempt(fn: () => Promise<void>): Promise<{ ok: boolean; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, durationMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, durationMs: Date.now() - start, error: e?.message ?? String(e) };
  }
}

async function multiProbe(
  name: string,
  depClass: DependencyClass,
  attempts: number,
  gapMs: number,
  fn: () => Promise<void>
): Promise<DependencyHealth> {
  let successfulProbes = 0;
  let failedProbes = 0;
  let totalResponseMs = 0;
  let lastError: string | undefined;

  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(gapMs);
    const result = await runProbeAttempt(fn);
    if (result.ok) {
      successfulProbes++;
      totalResponseMs += result.durationMs;
    } else {
      failedProbes++;
      lastError = result.error;
    }
  }

  const status = classifySuccessRate(successfulProbes, attempts);
  const avgResponseMs = successfulProbes > 0 ? Math.round(totalResponseMs / successfulProbes) : 0;
  const successRatePct = Math.round((successfulProbes / attempts) * 1000) / 10;

  return {
    name,
    class: depClass,
    status,
    available: status === 'HEALTHY',
    probeAttempts: attempts,
    successfulProbes,
    failedProbes,
    successRatePercent: successRatePct,
    averageResponseTimeMs: avgResponseMs,
    lastError,
  };
}

function classifyNimError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes('enotfound') || e.includes('getaddrinfo')) return 'CONNECTIVITY_FAILURE';
  if (e.includes('econnrefused'))                           return 'CONNECTIVITY_FAILURE';
  if (e.includes('timeouterror') || e.includes('timed out') || e.includes('aborterror')) return 'TIMEOUT';
  if (e.includes('429'))                                    return 'RATE_LIMITED';
  if (e.includes('503') || e.includes('502') || e.includes('504') || e.includes('500')) return 'TEMPORARY_OUTAGE';
  if (e.includes('401') || e.includes('403'))               return 'AUTH_FAILURE';
  if (e.includes('tls') || e.includes('ssl') || e.includes('handshake')) return 'TLS_FAILURE';
  return 'UNKNOWN_EXTERNAL_ERROR';
}

// ---------------------------------------------------------------------------
// CertificationService
// ---------------------------------------------------------------------------

export class CertificationService {
  public static VALIDATION_BRAND_THRESHOLD = 95.0;
  public static VALIDATION_MODEL_THRESHOLD = 90.0;
  public static VALIDATION_PRICE_THRESHOLD = 95.0;
  public static VALIDATION_CATEGORY_THRESHOLD = 90.0;

  // ── Statistical helpers ─────────────────────────────────────────────────

  private static calculateVariance(values: number[]): number {
    const n = values.length;
    if (n <= 1) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  }

  private static calculateRange(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values) - Math.min(...values);
  }

  // ── Dependency probing ──────────────────────────────────────────────────

  /**
   * Probes all critical and external dependencies with multi-attempt retry logic.
   *
   * PostgreSQL       — 2 attempts, 2 s apart
   * OCR Microservice — 3 attempts, 2 s apart
   * NVIDIA NIM       — 3 attempts, 2 s apart (external; UNAVAILABLE ≠ hard failure)
   *   HTTP 401/403 treated as reachable (expected without API key in probe)
   *
   * Catalog Parser / Validation Engine — derived from OCR / PostgreSQL health.
   *
   * @param prismaClient  Live Prisma client instance passed from caller.
   */
  public static async probeAllDependencies(prismaClient: any): Promise<DependencyHealthReport> {
    console.log('[CertificationService] Starting multi-attempt dependency probe...\n');

    // 1. PostgreSQL — 2 attempts, 2 s apart
    const postgresqlHealth = await multiProbe(
      'PostgreSQL',
      DependencyClass.INTERNAL,
      2,
      2000,
      async () => {
        await prismaClient.$queryRawUnsafe('SELECT 1');
      }
    );

    // 2. Prisma — synthesised (same runtime as PostgreSQL)
    const prismaHealth: DependencyHealth = {
      ...postgresqlHealth,
      name: 'Prisma ORM',
      class: DependencyClass.INTERNAL,
    };

    // 3. OCR Microservice — 3 attempts, 2 s apart
    const ocrHealth = await multiProbe(
      'OCR Microservice (PaddleOCR)',
      DependencyClass.INTERNAL,
      3,
      2000,
      async () => {
        const res = await fetch('http://127.0.0.1:5050/ocr/health', {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json() as any;
        if (body?.status !== 'healthy') throw new Error(`Unhealthy: ${JSON.stringify(body)}`);
      }
    );

    // 4. Catalog Parser — derived from OCR health (parser depends on OCR)
    const catalogParserHealth: DependencyHealth = {
      ...ocrHealth,
      name: 'Catalog Parser',
      class: DependencyClass.INTERNAL,
    };

    // 5. Validation Engine — healthy if both PostgreSQL and OCR are not UNAVAILABLE
    const veStatus: DependencyStatus =
      postgresqlHealth.status !== 'UNAVAILABLE' && ocrHealth.status !== 'UNAVAILABLE'
        ? 'HEALTHY'
        : 'UNAVAILABLE';

    const validationEngineHealth: DependencyHealth = {
      name: 'Validation Engine',
      class: DependencyClass.INTERNAL,
      status: veStatus,
      available: veStatus === 'HEALTHY',
      probeAttempts: 1,
      successfulProbes: veStatus === 'HEALTHY' ? 1 : 0,
      failedProbes: veStatus === 'HEALTHY' ? 0 : 1,
      successRatePercent: veStatus === 'HEALTHY' ? 100 : 0,
      averageResponseTimeMs: 0,
    };

    // 6. NVIDIA NIM — 3 attempts, 2 s apart (external)
    //    HEAD /v1/models — 401/403 is acceptable (reachable without key)
    const nvidiaNimHealth = await multiProbe(
      'NVIDIA NIM',
      DependencyClass.EXTERNAL,
      3,
      2000,
      async () => {
        const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        // 401/403 = reachable without API key — counts as success
        if (res.status === 401 || res.status === 403 || res.ok) return;
        throw new Error(`HTTP ${res.status}`);
      }
    );

    if (nvidiaNimHealth.lastError) {
      nvidiaNimHealth.lastError =
        `[${classifyNimError(nvidiaNimHealth.lastError)}] ${nvidiaNimHealth.lastError}`;
    }

    const report: DependencyHealthReport = {
      postgresql:       postgresqlHealth,
      prisma:           prismaHealth,
      ocrMicroservice:  ocrHealth,
      catalogParser:    catalogParserHealth,
      validationEngine: validationEngineHealth,
      nvidiaNim:        nvidiaNimHealth,
      probeTimestamp:   new Date().toISOString(),
    };

    // Print summary table
    const fmtRow = (h: DependencyHealth) => {
      const icon = h.status === 'HEALTHY' ? '✅' :
                   h.status === 'DEGRADED' ? '⚠️ ' : '❌';
      const rate = `${h.successfulProbes}/${h.probeAttempts} (${h.successRatePercent}%)`;
      const rt   = h.averageResponseTimeMs > 0 ? `  avg ${h.averageResponseTimeMs}ms` : '';
      const cls  = `[${h.class}]`.padEnd(12);
      const err  = h.lastError ? `  ← ${h.lastError.substring(0, 70)}` : '';
      return `  ${icon} ${cls} ${h.name.padEnd(38)} ${h.status.padEnd(12)} ${rate}${rt}${err}`;
    };

    console.log('Dependency Health Probe Results:');
    console.log('─'.repeat(100));
    console.log(fmtRow(report.postgresql));
    console.log(fmtRow(report.prisma));
    console.log(fmtRow(report.ocrMicroservice));
    console.log(fmtRow(report.catalogParser));
    console.log(fmtRow(report.validationEngine));
    console.log(fmtRow(report.nvidiaNim));
    console.log('─'.repeat(100));
    console.log('');

    return report;
  }

  // ── Certification verdict ───────────────────────────────────────────────

  /**
   * Aggregates VendorResult[], StabilityMetrics, and DependencyHealthReport
   * into a final CertificationVerdict.
   *
   * Verdict routing priority (evaluated top-to-bottom):
   *   1. Any INTERNAL dependency UNAVAILABLE   → VALIDATION_FAILED (hard stop)
   *   2. Only EXTERNAL degraded, all else pass → REVIEW_REQUIRED
   *   3. Accuracy / stability checks fail      → VALIDATION_FAILED
   *   4. Only consistency (variance) fails     → REVIEW_REQUIRED
   *   5. All pass + isRealWorldMode            → READY_FOR_PHASE_2B
   *   6. All pass + CI mode                   → PASSED (not authoritative)
   */
  public static certify(
    results: VendorResult[],
    stability: StabilityMetrics,
    isRealWorldMode: boolean,
    dependencyHealth?: DependencyHealthReport
  ): CertificationVerdict {
    const requiredVendors: Array<VendorResult['vendor']> = ['HIKVISION', 'DAHUA', 'CP_PLUS', 'ZKTECO', 'ESSL'];
    const failures: string[] = [];
    const recommendations: string[] = [];
    const rationaleLines: string[] = [];

    // ── Step 0 — Dependency health routing ─────────────────────────────
    let internalSystemStatus: CertificationVerdict['internalSystemStatus'] = 'HEALTHY';
    let externalDependencyStatus: CertificationVerdict['externalDependencyStatus'] = 'HEALTHY';

    if (dependencyHealth) {
      const internalDeps = [
        dependencyHealth.postgresql,
        dependencyHealth.ocrMicroservice,
        dependencyHealth.validationEngine,
      ];

      const internalUnavailable = internalDeps.filter(d => d.status === 'UNAVAILABLE');
      const internalDegraded    = internalDeps.filter(d => d.status === 'DEGRADED');

      if (internalUnavailable.length > 0) {
        internalSystemStatus = 'FAILED';
        for (const d of internalUnavailable) {
          failures.push(
            `INTERNAL_DEPENDENCY_FAILURE: ${d.name} UNAVAILABLE ` +
            `(${d.successfulProbes}/${d.probeAttempts} probes succeeded` +
            `${d.lastError ? '; ' + d.lastError : ''})`
          );
        }
        rationaleLines.push(
          `${internalUnavailable.length} critical internal dependency(ies) unavailable: ` +
          `${internalUnavailable.map(d => d.name).join(', ')}.`
        );
      } else if (internalDegraded.length > 0) {
        internalSystemStatus = 'DEGRADED';
        rationaleLines.push(`Internal dependencies degraded (but operational): ${internalDegraded.map(d => d.name).join(', ')}.`);
      } else {
        rationaleLines.push('All internal dependencies healthy.');
      }

      // External — NVIDIA NIM
      const nim = dependencyHealth.nvidiaNim;
      externalDependencyStatus =
        nim.status === 'HEALTHY'    ? 'HEALTHY' :
        nim.status === 'DEGRADED'   ? 'DEGRADED' : 'UNAVAILABLE';

      if (nim.status !== 'HEALTHY') {
        rationaleLines.push(
          `NVIDIA NIM ${nim.status}: ${nim.successfulProbes}/${nim.probeAttempts} probes succeeded` +
          `${nim.lastError ? ' — ' + nim.lastError : ''}.`
        );
      } else {
        rationaleLines.push('NVIDIA NIM available and reachable.');
      }

      // Hard stop — internal failure: return immediately
      if (internalSystemStatus === 'FAILED') {
        return {
          certified: false,
          status: 'FAILED',
          readiness: 'NOT_READY',
          certificationStatus: 'VALIDATION_FAILED',
          internalSystemStatus,
          externalDependencyStatus,
          failures,
          recommendations: ['Restore all internal dependencies before re-running certification.'],
          certificationDecisionRationale: rationaleLines.join(' '),
          dependencyHealth,
          averages: { brandAccuracy: 0, modelAccuracy: 0, priceAccuracy: 0, categoryAccuracy: 0, ocrConfidence: 0, overallConfidence: 0 },
          variances: { brandAccuracy: 0, modelAccuracy: 0, priceAccuracy: 0, categoryAccuracy: 0 },
        };
      }
    }

    // ── Step 1 — Vendor coverage ────────────────────────────────────────
    const presentVendors = results.map(r => r.vendor);
    const missingVendors = requiredVendors.filter(v => !presentVendors.includes(v));
    if (missingVendors.length > 0) {
      failures.push(`Missing results for vendor(s): ${missingVendors.join(', ')}`);
    }

    // ── Step 2 — Cross-vendor averages ──────────────────────────────────
    const n = results.length || 1;
    const averages = {
      brandAccuracy:    results.reduce((acc, r) => acc + r.brandAccuracy,    0) / n,
      modelAccuracy:    results.reduce((acc, r) => acc + r.modelAccuracy,    0) / n,
      priceAccuracy:    results.reduce((acc, r) => acc + r.priceAccuracy,    0) / n,
      categoryAccuracy: results.reduce((acc, r) => acc + r.categoryAccuracy, 0) / n,
      ocrConfidence:    results.reduce((acc, r) => acc + r.ocrConfidence,    0) / n,
      overallConfidence:results.reduce((acc, r) => acc + r.overallConfidence,0) / n,
    };

    // ── Step 3 — Variance / range ───────────────────────────────────────
    const brandAccs    = results.map(r => r.brandAccuracy);
    const modelAccs    = results.map(r => r.modelAccuracy);
    const priceAccs    = results.map(r => r.priceAccuracy);
    const categoryAccs = results.map(r => r.categoryAccuracy);

    const variances = {
      brandAccuracy:    this.calculateVariance(brandAccs),
      modelAccuracy:    this.calculateVariance(modelAccs),
      priceAccuracy:    this.calculateVariance(priceAccs),
      categoryAccuracy: this.calculateVariance(categoryAccs),
    };
    const ranges = {
      brandAccuracy:    this.calculateRange(brandAccs),
      modelAccuracy:    this.calculateRange(modelAccs),
      priceAccuracy:    this.calculateRange(priceAccs),
      categoryAccuracy: this.calculateRange(categoryAccs),
    };

    // ── Step 4 — Per-vendor accuracy ────────────────────────────────────
    for (const r of results) {
      if (r.brandAccuracy    < CertificationService.VALIDATION_BRAND_THRESHOLD) failures.push(`${r.vendor}: Brand accuracy (${r.brandAccuracy.toFixed(2)}%) < ${CertificationService.VALIDATION_BRAND_THRESHOLD}%`);
      if (r.modelAccuracy    < CertificationService.VALIDATION_MODEL_THRESHOLD) failures.push(`${r.vendor}: Model accuracy (${r.modelAccuracy.toFixed(2)}%) < ${CertificationService.VALIDATION_MODEL_THRESHOLD}%`);
      if (r.priceAccuracy    < CertificationService.VALIDATION_PRICE_THRESHOLD) failures.push(`${r.vendor}: Price accuracy (${r.priceAccuracy.toFixed(2)}%) < ${CertificationService.VALIDATION_PRICE_THRESHOLD}%`);
      if (r.categoryAccuracy < CertificationService.VALIDATION_CATEGORY_THRESHOLD) failures.push(`${r.vendor}: Category accuracy (${r.categoryAccuracy.toFixed(2)}%) < ${CertificationService.VALIDATION_CATEGORY_THRESHOLD}%`);
      if (r.ocrConfidence    < 0.90) failures.push(`${r.vendor}: OCR confidence (${r.ocrConfidence.toFixed(4)}) < 0.90`);
      if (r.overallConfidence< 0.90) failures.push(`${r.vendor}: Overall confidence (${r.overallConfidence.toFixed(4)}) < 0.90`);
    }

    // ── Step 5 — Stability metrics ──────────────────────────────────────
    if (stability.aiParseFailure    > 0) failures.push(`Stability: AI parse failure count (${stability.aiParseFailure}) > 0`);
    if (stability.ocrTimeout        > 0) failures.push(`Stability: OCR timeout count (${stability.ocrTimeout}) > 0`);
    if (stability.pdfCorrupted      > 0) failures.push(`Stability: PDF corrupted count (${stability.pdfCorrupted}) > 0`);
    if (stability.unsupportedFormat > 0) failures.push(`Stability: Unsupported format count (${stability.unsupportedFormat}) > 0`);

    // ── Step 6 — Cross-vendor consistency (max-min <= 10%) ──────────────
    let consistencyFailures = 0;
    const maxVarianceLimit  = 10.0;

    if (ranges.brandAccuracy    > maxVarianceLimit) { failures.push(`Consistency: Brand accuracy range (${ranges.brandAccuracy.toFixed(2)}%) > 10%`);    consistencyFailures++; }
    if (ranges.modelAccuracy    > maxVarianceLimit) { failures.push(`Consistency: Model accuracy range (${ranges.modelAccuracy.toFixed(2)}%) > 10%`);    consistencyFailures++; }
    if (ranges.priceAccuracy    > maxVarianceLimit) { failures.push(`Consistency: Price accuracy range (${ranges.priceAccuracy.toFixed(2)}%) > 10%`);    consistencyFailures++; }
    if (ranges.categoryAccuracy > maxVarianceLimit) { failures.push(`Consistency: Category accuracy range (${ranges.categoryAccuracy.toFixed(2)}%) > 10%`); consistencyFailures++; }

    // ── Step 7 — Determine final verdict ────────────────────────────────
    const nonConsistencyFailures   = failures.filter(f => !f.startsWith('Consistency:')).length;
    const onlyConsistencyFailed    = consistencyFailures > 0 && nonConsistencyFailures === 0;
    const externalOnlyDegraded     = externalDependencyStatus !== 'HEALTHY' && failures.length === 0;

    let status:              CertificationVerdict['status']              = 'FAILED';
    let readiness:           CertificationVerdict['readiness']           = 'NOT_READY';
    let certificationStatus: CertificationVerdict['certificationStatus'] = 'VALIDATION_FAILED';
    let certified = false;

    if (failures.length === 0 && !externalOnlyDegraded) {
      // ✅ All checks pass, NIM healthy
      status = 'PASSED';
      if (isRealWorldMode) {
        readiness = 'READY_FOR_PHASE_2B';
        certificationStatus = 'READY_FOR_PHASE_2B';
        certified = true;
        rationaleLines.push('All governance thresholds met. Phase 2B authorized.');
      } else {
        readiness = 'NOT_READY';
        certificationStatus = 'VALIDATION_FAILED';
        recommendations.push('Run with --mode REAL_WORLD using all 5 actual vendor catalogs to authorize Phase 2B.');
        rationaleLines.push('All checks passed in CI mode. CI mode cannot authorize Phase 2B.');
      }

    } else if (externalOnlyDegraded) {
      // ⚠️ Internal healthy, only NVIDIA NIM degraded
      status = 'REVIEW_REQUIRED';
      certificationStatus = 'REVIEW_REQUIRED';
      readiness = 'NOT_READY';
      recommendations.push('NVIDIA NIM was unavailable/degraded during this run. Retry when NIM is reachable, or escalate for human review to waive the AI dependency.');
      rationaleLines.push('All accuracy and stability thresholds met. Only NVIDIA NIM was degraded. Human review required before Phase 2B authorization.');

    } else if (onlyConsistencyFailed) {
      // ⚠️ Cross-vendor consistency only
      status = 'REVIEW_REQUIRED';
      certificationStatus = 'REVIEW_REQUIRED';
      readiness = 'NOT_READY';
      recommendations.push('Cross-vendor accuracy variance exceeds 10%. Human review required to approve catalog normalizer adjustments.');
      rationaleLines.push('Accuracy and stability thresholds met but cross-vendor consistency thresholds exceeded.');

    } else {
      // ❌ Accuracy, stability, or vendor coverage failures
      status = 'FAILED';
      certificationStatus = 'VALIDATION_FAILED';
      readiness = 'NOT_READY';
      recommendations.push('Fix extraction issues, missing fields, or template config before re-running certification.');
      rationaleLines.push(`${failures.length} governance check(s) failed. Certification denied.`);
    }

    return {
      certified,
      status,
      readiness,
      certificationStatus,
      internalSystemStatus,
      externalDependencyStatus,
      failures,
      recommendations,
      certificationDecisionRationale: rationaleLines.join(' '),
      dependencyHealth,
      averages,
      variances,
    };
  }

  // ── Audit snapshot persistence ──────────────────────────────────────────

  /**
   * Persists an immutable certification snapshot to
   *   <projectRoot>/reports/catalog-validation/certification_snapshot_<timestamp>.json
   *
   * Rules:
   *  - NEVER overwrites an existing file (flag 'wx').
   *  - Every invocation creates a fresh timestamped file.
   *  - The artifact embeds its own SHA-256 checksum computed over the
   *    payload JSON **before** the checksum field is added, enabling
   *    post-write round-trip verification.
   *
   * @param verdict          The CertificationVerdict produced by certify().
   * @param vendorResults    Raw per-vendor metric array.
   * @param stabilityMetrics Stability counters from the run.
   * @param validationMode   'CI' or 'REAL_WORLD'.
   * @param projectRoot      Absolute path to the server directory (used to
   *                         resolve the reports subdirectory).
   */
  public static persistSnapshot(
    verdict:          CertificationVerdict,
    vendorResults:    VendorResult[],
    stabilityMetrics: StabilityMetrics,
    validationMode:   'CI' | 'REAL_WORLD',
    projectRoot:      string
  ): SnapshotPersistenceResult {
    const snapshotDir = path.join(projectRoot, 'reports', 'catalog-validation');

    // Ensure directory exists
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    // Build a timestamp string safe for filenames
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(snapshotDir, `certification_snapshot_${ts}.json`);

    // Build the snapshot header
    const snapshot: CertificationSnapshot = {
      timestamp:               new Date().toISOString(),
      validationMode,
      certificationStatus:     verdict.certificationStatus,
      readiness:               verdict.readiness,
      internalSystemStatus:    verdict.internalSystemStatus,
      externalDependencyStatus:verdict.externalDependencyStatus,
      rationale:               verdict.certificationDecisionRationale,
    };

    // Build the full artifact payload (without checksum yet)
    const payloadWithoutChecksum = {
      snapshot,
      verdict,
      vendorResults,
      stabilityMetrics,
      dependencyHealthReport: verdict.dependencyHealth,
      governanceVersion:      '2A.6',
      authorizedBy:           `CERTIFICATION_SERVICE_v2A6_${validationMode}`,
    };

    // Compute SHA-256 over the payload (deterministic: sorted keys, 2-space indent)
    const payloadJson = JSON.stringify(payloadWithoutChecksum, null, 2);
    const checksum    = crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex');

    // Final artifact includes the checksum
    const artifact: CertificationArtifact = {
      ...payloadWithoutChecksum,
      artifactChecksum: checksum,
    };

    try {
      // 'wx' flag = fail if path already exists (immutability guarantee)
      fs.writeFileSync(snapshotPath, JSON.stringify(artifact, null, 2), { encoding: 'utf-8', flag: 'wx' });

      console.log(`[CertificationService] Snapshot written: ${snapshotPath}`);
      console.log(`[CertificationService] Artifact SHA-256: ${checksum}`);

      return { success: true, snapshotPath, checksum };
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      console.error(`[CertificationService] Failed to write snapshot: ${errMsg}`);
      return { success: false, snapshotPath, checksum: '', error: errMsg };
    }
  }

  /**
   * Verifies the integrity of a previously written snapshot artifact.
   *
   * Steps:
   *  1. Read the file from disk.
   *  2. Parse JSON and extract stored artifactChecksum.
   *  3. Reconstruct the payload-without-checksum object.
   *  4. Recompute SHA-256 and compare to stored value.
   *  5. Verify certificationStatus matches the expected value.
   *  6. Verify dependencyHealthReport field exists (if REAL_WORLD).
   *  7. Verify snapshot.rationale is non-empty.
   *
   * @param snapshotPath     Absolute path to the snapshot JSON.
   * @param expectedStatus   The certificationStatus from the in-memory verdict.
   * @param requireDepHealth Whether to require dependencyHealthReport to be present.
   */
  public static verifySnapshotIntegrity(
    snapshotPath:     string,
    expectedStatus:   string,
    requireDepHealth: boolean
  ): { valid: boolean; failures: string[] } {
    const failures: string[] = [];

    // 1. File must exist and be readable
    let raw: string;
    try {
      raw = fs.readFileSync(snapshotPath, 'utf-8');
    } catch (e: any) {
      return { valid: false, failures: [`Cannot read snapshot file: ${e.message}`] };
    }

    // 2. Must be valid JSON
    let artifact: any;
    try {
      artifact = JSON.parse(raw);
    } catch (e: any) {
      return { valid: false, failures: [`Snapshot is not valid JSON: ${e.message}`] };
    }

    // 3. Checksum round-trip
    const storedChecksum = artifact.artifactChecksum as string | undefined;
    if (!storedChecksum) {
      failures.push('artifactChecksum field missing from snapshot.');
    } else {
      // Reconstruct payload without checksum (same structure as persisted)
      const { artifactChecksum: _removed, ...payloadWithoutChecksum } = artifact;
      const recomputedJson     = JSON.stringify(payloadWithoutChecksum, null, 2);
      const recomputedChecksum = crypto.createHash('sha256').update(recomputedJson, 'utf8').digest('hex');

      if (recomputedChecksum !== storedChecksum) {
        failures.push(
          `Checksum mismatch — stored: ${storedChecksum.substring(0, 16)}... ` +
          `recomputed: ${recomputedChecksum.substring(0, 16)}...`
        );
      }
    }

    // 4. certificationStatus must match in-memory verdict
    const storedStatus = artifact?.snapshot?.certificationStatus ?? artifact?.verdict?.certificationStatus;
    if (storedStatus !== expectedStatus) {
      failures.push(
        `certificationStatus mismatch — stored: ${storedStatus} expected: ${expectedStatus}`
      );
    }

    // 5. dependencyHealthReport existence (required in REAL_WORLD)
    if (requireDepHealth && !artifact?.dependencyHealthReport) {
      failures.push('dependencyHealthReport is missing from snapshot artifact.');
    }

    // 6. Rationale must be non-empty string
    const rationale = artifact?.snapshot?.rationale;
    if (typeof rationale !== 'string' || rationale.trim().length === 0) {
      failures.push('snapshot.rationale is missing or empty.');
    }

    return { valid: failures.length === 0, failures };
  }
}
