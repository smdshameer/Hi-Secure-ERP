#!/usr/bin/env node
/**
 * HiSecure ERP — Architecture Diagram Generator
 *
 * Usage:
 *   node generate-arch-diagrams.js          # Generate all sections as SVG
 *   node generate-arch-diagrams.js 1        # Generate only section 1
 *   node generate-arch-diagrams.js --html   # Generate a self-contained HTML viewer
 *
 * Requires: npx mmdc (Mermaid CLI) globally available
 *   Install: npm install -g @mermaid-js/mermaid-cli
 *
 * Falls back to writing section .mmd files + a README viewer if mmdc is absent.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname);
const MMD_FILE = path.join(ROOT, 'ERP-ARCHITECTURE.mmd');
const OUT_DIR = path.join(ROOT, 'arch-diagrams');

// ── Section markers ──────────────────────────────────────────────────────────
const SECTIONS = [
  { key: '1_high_level',      label: 'High-Level System Topology' },
  { key: '2_database_schema', label: 'Database Entity-Relationship' },
  { key: '3_transaction_flow',label: 'Core Transaction & Workflow Flows' },
  { key: '4_rbac_matrix',     label: 'RBAC Role-Permission Matrix' },
  { key: '5_ci_pipeline',     label: 'CI/CD Validation Pipeline' },
  { key: '6_module_breakdown',label: 'Module Functional Breakdown' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractSection(mmdContent, key) {
  const start = mmdContent.indexOf(`section ${key}`);
  if (start === -1) return null;
  // find the next 'section' or end of file
  let end = mmdContent.indexOf('\nsection ', start + 1);
  if (end === -1) end = mmdContent.length;
  return mmdContent.substring(start, end).trim();
}

function hasMmdc() {
  try { execSync('npx mmdc --version', { stdio: 'pipe' }); return true; }
  catch { return false; }
}

function splitMmdcSections() {
  const raw = fs.readFileSync(MMD_FILE, 'utf-8');
  const result = [];
  for (const sec of SECTIONS) {
    const content = extractSection(raw, sec.key);
    if (content) result.push({ ...sec, content });
  }
  return result;
}

// ── Render with mmdc ──────────────────────────────────────────────────────────
function renderSection(sec, outDir) {
  const tmpFile = path.join(outDir, `${sec.key}.mmd`);
  const outFile = path.join(outDir, `${sec.key}.svg`);
  fs.writeFileSync(tmpFile, sec.content, 'utf-8');
  try {
    execSync(
      `npx mmdc -i "${tmpFile}" -o "${outFile}" -b transparent -t neutral --scale 2`,
      { stdio: 'pipe', cwd: outDir }
    );
    console.log(`  ✓ ${sec.label} → ${path.basename(outFile)}`);
    return outFile;
  } catch (e) {
    // Sometimes mermaid-cli exits non-zero even on success with large diagrams;
    // check whether the file was actually written.
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
      console.log(`  ✓ ${sec.label} → ${path.basename(outFile)} (exit code ignored)`);
      return outFile;
    }
    console.warn(`  ✗ ${sec.label} — render failed (${e.message?.split('\n')[0]})`);
    return null;
  }
}

// ── Fallback: write section mmd files + viewer ────────────────────────────────
function writeFallbackViewer(sections, outDir) {
  // Write each section to its own .mmd file
  sections.forEach(sec => {
    fs.writeFileSync(path.join(outDir, `${sec.key}.mmd`), sec.content, 'utf-8');
  });

  const viewerPath = path.join(outDir, 'viewer.html');
  const sectionCards = sections.map(sec => `
  <div class="card" id="card-${sec.key}">
    <h2>${sec.label}</h2>
    <div class="mermaid">
${sec.content}
    </div>
  </div>`).join('\n');

  fs.writeFileSync(viewerPath, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HiSecure ERP — Architecture</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script>
<style>
  :root { --bg:#0f1117; --card:#1a1d27; --border:#2a2d3a; --text:#e2e4e9; --accent:#4a9eff; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 2rem; }
  h1 { text-align:center; margin-bottom:.5rem; }
  .subtitle { text-align:center; color:#888; margin-bottom:2rem; font-size:.9rem; }
  nav { display:flex; flex-wrap:wrap; gap:.5rem; justify-content:center; margin-bottom:2rem; }
  nav a { color: var(--accent); text-decoration:none; padding:.35rem .7rem; border:1px solid var(--border); border-radius:6px; font-size:.85rem; }
  nav a:hover { background:var(--card); }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:2rem; scroll-margin-top:1rem; }
  .card h2 { font-size:1.1rem; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:.5rem; }
  .mermaid { display:flex; justify-content:center; }
</style>
</head>
<body>
  <h1>🏢 HiSecure ERP — Architecture Overview</h1>
  <p class="subtitle">HiSecure ERP v2.0 · React 19 · Express · PostgreSQL · Prisma</p>
  <nav>
    ${sections.map(s => `<a href="#card-${s.key}">${s.label}</a>`).join('\n    ')}
  </nav>
${sectionCards}
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose', flowchart: { useMaxWidth: true } });
<\/script>
</body>
</html>`, 'utf-8');

  console.log(`\n  📄 Fallback viewer written → ${viewerPath}`);
  console.log('     Open in a browser. Requires internet for Mermaid CDN.\n');
}

// ── Master index HTML ─────────────────────────────────────────────────────────
function writeMasterIndex(sections, outDir, rendered) {
  const cards = sections.map((sec, i) => {
    const svg = rendered[i];
    const imgTag = svg
      ? `<img src="${path.basename(svg)}" alt="${sec.label}" style="max-width:100%;height:auto;border-radius:8px;">`
      : `<p style="color:#888;">[Render pending — run <code>npx mmdc</code>]</p>`;
    return `
  <div class="card" id="card-${sec.key}">
    <h2>${i + 1}. ${sec.label}</h2>
    <div class="diagram">${imgTag}</div>
  </div>`;
  }).join('\n');

  const indexPath = path.join(outDir, 'index.html');
  fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HiSecure ERP — Architecture Diagrams</title>
<style>
  :root { --bg:#0f1117; --card:#1a1d27; --border:#2a2d3a; --text:#e2e4e9; --accent:#4a9eff; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; padding:2rem; max-width:1400px; margin:0 auto; }
  h1 { text-align:center; margin-bottom:.3rem; }
  .subtitle { text-align:center; color:#888; margin-bottom:1.5rem; font-size:.9rem; }
  nav { display:flex; flex-wrap:wrap; gap:.5rem; justify-content:center; margin-bottom:2rem; }
  nav a { color:var(--accent); text-decoration:none; padding:.35rem .7rem; border:1px solid var(--border); border-radius:6px; font-size:.85rem; }
  nav a:hover { background:var(--card); }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:2rem; scroll-margin-top:1rem; }
  .card h2 { font-size:1.1rem; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:.5rem; }
  .diagram { display:flex; justify-content:center; overflow:auto; }
</style>
</head>
<body>
  <h1>🏢 HiSecure ERP — Architecture Diagrams</h1>
  <p class="subtitle">HiSecure ERP v2.0 · React 19 + Express + PostgreSQL · Generated from codebase</p>
  <nav>
    ${sections.map((s, i) => `<a href="#card-${s.key}">${i + 1}. ${s.label}</a>`).join('\n    ')}
  </nav>
${cards}
</body>
</html>`, 'utf-8');

  console.log(`\n  📄 Master index written → ${indexPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  const wantAll = !arg || arg === 'all';
  const wantHtml = arg === '--html';
  const wantIndex = arg === '--index';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('\n📐 HiSecure ERP — Architecture Diagram Generator\n');
  console.log(`   Source : ${MMD_FILE}`);
  console.log(`   Output : ${OUT_DIR}\n`);

  const sections = wantAll ? splitMmdcSections() : [];
  let selected = sections;
  if (!wantAll && !wantHtml && !wantIndex) {
    const matched = sections.find(s => s.key === arg || s.label.toLowerCase().includes(arg.toLowerCase()));
    selected = matched ? [matched] : sections;
  }

  if (wantHtml || wantIndex) {
    // Write everything needed and generate a viewer we can open immediately.
    const allSections = splitMmdcSections();
    const mmdcAvailable = hasMmdc();
    let rendered = [];

    if (mmdcAvailable) {
      console.log('🔧 Mermaid CLI detected — rendering SVGs…\n');
      rendered = allSections.map(sec => renderSection(sec, OUT_DIR)).filter(Boolean);
    } else {
      console.log('⚠️  Mermaid CLI not found — skipping SVG render, generating fallback viewer.\n');
      console.log('   Install with: npm install -g @mermaid-js/mermaid-cli\n');
    }

    writeMasterIndex(allSections, OUT_DIR, allSections.map((_, i) => rendered[i] || null));

    if (!mmdcAvailable) {
      writeFallbackViewer(allSections, OUT_DIR);
    }

    console.log('Done.\n');
    return;
  }

  // SVG render mode
  const mmdcAvailable = hasMmdc();
  if (!mmdcAvailable) {
    console.log('⚠️  Mermaid CLI not available — writing section .mmd files + fallback viewer instead.\n');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    writeFallbackViewer(sections, OUT_DIR);
    console.log('Done.\n');
    return;
  }

  console.log('🔧 Rendering sections with Mermaid CLI…\n');
  const rendered = [];
  for (const sec of selected) {
    const fp = renderSection(sec, OUT_DIR);
    if (fp) rendered.push(fp);
  }

  if (rendered.length > 0) {
    writeMasterIndex(selected, OUT_DIR, rendered);
  }

  console.log(`\n✅ Generated ${rendered.length} diagram(s) in ${OUT_DIR}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
