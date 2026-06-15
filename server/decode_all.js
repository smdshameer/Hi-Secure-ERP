const fs = require('fs');
const path = require('path');

const recoveredDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered';

function processFiles() {
  const files = fs.readdirSync(recoveredDir);
  // Sort files by size descending
  const sortedFiles = files
    .map(f => ({ name: f, size: fs.statSync(path.join(recoveredDir, f)).size }))
    .sort((a, b) => b.size - a.size);

  console.log('Top 15 largest files:');
  sortedFiles.slice(0, 15).forEach(f => {
    console.log(`- ${f.name} (${(f.size / 1024).toFixed(2)} KB)`);
  });

  // Decode the largest raw files for Settings.tsx, settings.ts, and search.ts
  const targets = {
    'SettingsTsx': null,
    'settingsTs': null,
    'searchTs': null
  };

  for (const f of sortedFiles) {
    if (!f.name.startsWith('raw_') || !f.name.endsWith('.json')) continue;
    
    if (f.name.includes('SettingsTsx') && !targets.SettingsTsx) {
      targets.SettingsTsx = f.name;
    }
    if (f.name.includes('settingsTs') && !targets.settingsTs) {
      targets.settingsTs = f.name;
    }
    if (f.name.includes('searchTs') && !targets.searchTs) {
      targets.searchTs = f.name;
    }
  }

  console.log('\nDecoding chosen targets:');
  for (const [key, fileName] of Object.entries(targets)) {
    if (!fileName) {
      console.log(`No file found for ${key}`);
      continue;
    }
    const fullPath = path.join(recoveredDir, fileName);
    try {
      const data = fs.readFileSync(fullPath, 'utf8');
      const obj = JSON.parse(data);
      console.log(`Target: ${key} -> ${fileName} (Step: ${obj.step_index}, Type: ${obj.type})`);
      
      let content = '';
      if (obj.content) {
        content = obj.content;
      } else if (obj.tool_calls) {
        const tc = obj.tool_calls[0] || {};
        const args = tc.args || {};
        content = args.CodeContent || args.ReplacementContent || args.Code || '';
      }
      
      if (content) {
        let decoded = content;
        try {
          if (content.startsWith('"') && content.endsWith('"')) {
            decoded = JSON.parse(content);
          }
        } catch {}
        
        const outPath = path.join(recoveredDir, `decoded_${key}_${fileName.replace('.json', '.txt')}`);
        fs.writeFileSync(outPath, decoded);
        console.log(`  -> Saved decoded to ${outPath} (${decoded.length} chars)`);
        console.log(`  -> Preview: ${decoded.substring(0, 300).replace(/\n/g, ' ')}...`);
      }
    } catch (e) {
      console.error(`Error decoding ${fileName}:`, e.message);
    }
  }
}

processFiles();
