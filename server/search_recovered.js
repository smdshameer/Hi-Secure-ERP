const fs = require('fs');
const path = require('path');

const recoveredDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered';

function search() {
  const files = fs.readdirSync(recoveredDir);
  for (const file of files) {
    if (!file.startsWith('raw_') || !file.endsWith('.json')) continue;
    const fullPath = path.join(recoveredDir, file);
    try {
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
        
        if (decoded.includes('/test-ai') || decoded.includes('testNvidiaConnection') || decoded.includes('AiService')) {
          console.log(`[FOUND in ${file}]`);
          console.log(`  Step Index: ${obj.step_index}, Type: ${obj.type}`);
          console.log(`  Length: ${decoded.length} chars`);
          
          const previewIndex = decoded.indexOf('test-ai') !== -1 ? decoded.indexOf('test-ai') : decoded.indexOf('AiService');
          console.log(`  Context preview: ${decoded.substring(Math.max(0, previewIndex - 200), previewIndex + 200).replace(/\n/g, ' ')}`);
        }
      }
    } catch (e) {}
  }
}

search();
