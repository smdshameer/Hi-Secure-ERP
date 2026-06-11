const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public/css/print-themes.css');
let content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');
const out = [];
let inVarBlock = false;
let varDepth = 0;

for (const line of lines) {
  const trimmed = line.trim();

  // Track variable declaration blocks: [data-print-theme="..."] { ... }
  if (/^\[data-print-theme=/.test(trimmed) && trimmed.includes('{')) {
    inVarBlock = true;
    varDepth = 1;
    out.push(line);
    continue;
  }
  if (inVarBlock) {
    out.push(line);
    varDepth += (trimmed.match(/\{/g) || []).length;
    varDepth -= (trimmed.match(/\}/g) || []).length;
    if (varDepth <= 0) {
      inVarBlock = false;
      varDepth = 0;
    }
    continue;
  }

  // Skip variable blocks, media queries, regular CSS rules, comments, empty lines
  if (/^\[data-print-theme=/.test(trimmed) && trimmed.includes('{')) {
    out.push(line);
    continue;
  }
  if (trimmed.startsWith('@media') || trimmed.startsWith('@page') ||
      trimmed.startsWith('}') || trimmed === '' ||
      trimmed.startsWith('/*') || trimmed.startsWith('*') ||
      trimmed.startsWith('body') || trimmed.startsWith('.print-toolbar') ||
      trimmed.startsWith('.btn-')) {
    out.push(line);
    continue;
  }

  // Lines starting with [data-print-theme that have selectors after them
  // Need to scope to .container
  if (/^\[data-print-theme/.test(trimmed)) {
    // Insert .container after the closing bracket of the attribute selector
    const modified = line.replace(/^(\s*\[data-print-theme[^\]]+\]\s+)/, '$1.container ');
    out.push(modified);
  } else {
    out.push(line);
  }
}

const newContent = out.join('\n');
if (newContent !== content) {
  fs.writeFileSync(cssPath, newContent);
  console.log('Done - scoped all theme selectors to .container');
} else {
  console.log('No changes needed');
}
