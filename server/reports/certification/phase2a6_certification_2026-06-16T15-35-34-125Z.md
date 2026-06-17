# Phase 2A.6 Certification Report

**Certification Status:** VALIDATION_FAILED
**Date:** 2026-06-16T15:35:34.125Z
**Mode:** REAL_WORLD
**Governance Version:** 2A.6

## Certification Decision Rationale

> All internal dependencies healthy. NVIDIA NIM UNAVAILABLE: 0/3 probes succeeded — [UNKNOWN_EXTERNAL_ERROR] HTTP 405. 5 governance check(s) failed. Certification denied.

## External Dependency Health

| Dependency | Class | Status | Probe Success | Success Rate | Avg Response |
|---|---|---|---|---|---|
| PostgreSQL                           | INTERNAL | HEALTHY      | 2/2 | 100% | 125ms |
| Prisma ORM                           | INTERNAL | HEALTHY      | 2/2 | 100% | 125ms |
| OCR Microservice (PaddleOCR)         | INTERNAL | HEALTHY      | 3/3 | 100% | 23ms |
| Catalog Parser                       | INTERNAL | HEALTHY      | 3/3 | 100% | 23ms |
| Validation Engine                    | INTERNAL | HEALTHY      | 1/1 | 100% | — |
| NVIDIA NIM                           | EXTERNAL | UNAVAILABLE  | 0/3 | 0% | — |

### Probe Configuration

| Dependency | Attempts | Gap |
|---|---|---|
| PostgreSQL | 2 | 2s |
| OCR Microservice | 3 | 2s |
| NVIDIA NIM | 3 | 2s |

## Vendor Results

| Vendor | Brand | Model | Price | Category | OCR Conf | Overall Conf | Result |
|---|---|---|---|---|---|---|---|
| HIKVISION | 100.0% | 100.0% | 84.0% | 100.0% | 1.000 | 0.950 | ❌ FAIL |
| DAHUA | 100.0% | 100.0% | 84.0% | 100.0% | 1.000 | 0.950 | ❌ FAIL |
| CP_PLUS | 100.0% | 100.0% | 84.0% | 100.0% | 1.000 | 0.950 | ❌ FAIL |
| ZKTECO | 100.0% | 100.0% | 84.0% | 100.0% | 1.000 | 0.950 | ❌ FAIL |
| ESSL | 100.0% | 100.0% | 84.0% | 100.0% | 1.000 | 0.950 | ❌ FAIL |

## Cross-Vendor Averages

| Metric | Value |
|---|---|
| Brand Accuracy     | 100.00% |
| Model Accuracy     | 100.00% |
| Price Accuracy     | 84.04% |
| Category Accuracy  | 100.00% |
| OCR Confidence     | 1.0000 |
| Overall Confidence | 0.9500 |

## Stability Metrics

| Metric | Count |
|---|---|
| AI_PARSE_FAILURE   | 0 |
| OCR_TIMEOUT        | 0 |
| PDF_CORRUPTED      | 0 |
| UNSUPPORTED_FORMAT | 0 |

## System Health Summary

| System | Status |
|---|---|
| Internal System | HEALTHY |
| External Dependencies | UNAVAILABLE |

---
*Authorized by: REAL_WORLD_VALIDATION_RUNNER_v2A6*