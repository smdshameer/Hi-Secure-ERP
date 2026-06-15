const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\.system_generated\\logs\\transcript_full.jsonl';
const recoveryDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered';

async function search() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let index = 0;
  for await (const line of rl) {
    index++;
    // Line 3950 is what we want to inspect
    if (index === 3950) {
      console.log(`[Line 3950] length: ${line.length}`);
      const obj = JSON.parse(line);
      
      let decoded = '';
      if (obj.content) decoded = obj.content;
      else if (obj.tool_calls) {
        const tc = obj.tool_calls[0] || {};
        const args = tc.args || {};
        decoded = args.CodeContent || args.ReplacementContent || args.Code || '';
      }
      
      try {
        if (decoded.startsWith('"') && decoded.endsWith('"')) {
          decoded = JSON.parse(decoded);
        }
      } catch {}
      
      fs.writeFileSync(path.join(recoveryDir, 'line_3950_decoded.txt'), decoded);
      console.log('Saved line 3950 decoded content.');
    }
  }
}

search().then(() => console.log('Finished.')).catch(console.error);
