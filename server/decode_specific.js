const fs = require('fs');
const path = require('path');

const recoveredDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered';

function decodeFile(name) {
  const fullPath = path.join(recoveredDir, name);
  if (!fs.existsSync(fullPath)) {
    console.log(`File does not exist: ${name}`);
    return;
  }
  const data = fs.readFileSync(fullPath, 'utf8');
  const obj = JSON.parse(data);
  let content = '';
  if (obj.content) content = obj.content;
  else if (obj.tool_calls) {
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
    
    // Write out the raw content
    const outPath = path.join(recoveredDir, `decoded_${name.replace('.json', '.txt')}`);
    fs.writeFileSync(outPath, decoded);
    console.log(`Saved decoded ${name} to ${outPath} (${decoded.length} chars)`);
  }
}

decodeFile('raw_SettingsTsx_line_559.json');
decodeFile('raw_SettingsTsx_line_561.json');
decodeFile('raw_settingsTs_line_3238.json');
decodeFile('raw_searchTs_line_3452.json');
