const fs = require('fs');
const path = require('path');

const recoveredDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered';

function processFiles() {
  const files = fs.readdirSync(recoveredDir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const fullPath = path.join(recoveredDir, file);
    try {
      const data = fs.readFileSync(fullPath, 'utf8');
      const obj = JSON.parse(data);
      console.log(`\n==================================================`);
      console.log(`File: ${file}`);
      console.log(`Step Index: ${obj.step_index}, Source: ${obj.source}, Type: ${obj.type}`);
      
      // If it's a MODEL response containing tool calls or text
      if (obj.tool_calls) {
        console.log(`Contains tool calls: ${obj.tool_calls.map(tc => tc.name).join(', ')}`);
      }
      
      // Look for any string resembling code in content
      const content = obj.content || '';
      if (content.length > 1000) {
        console.log(`Content length: ${content.length}`);
        // If content is a double-escaped string, try to decode it
        let decoded = content;
        try {
          if (content.startsWith('"') && content.endsWith('"')) {
            decoded = JSON.parse(content);
          }
        } catch {}
        
        const preview = decoded.substring(0, 500);
        console.log(`--- Preview (first 500 chars) ---`);
        console.log(preview);
        
        // Write the decoded content to a separate text file
        const outPath = path.join(recoveredDir, `decoded_${file.replace('.json', '.tsx')}`);
        fs.writeFileSync(outPath, decoded);
        console.log(`Saved decoded content to: ${outPath}`);
      }
      
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }
}

processFiles();
