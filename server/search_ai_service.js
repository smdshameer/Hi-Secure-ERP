const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\.system_generated\\logs\\transcript_full.jsonl';

async function search() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let index = 0;
  for await (const line of rl) {
    index++;
    if (line.includes('testNvidiaConnection')) {
      console.log(`[Line ${index}] mentions testNvidiaConnection (${line.length} chars)`);
      if (line.includes('AiService.ts') && line.length > 5000) {
        console.log(`  -> Likely contains AiService.ts source code!`);
        fs.writeFileSync(`C:\\Users\\Admin\\.gemini\\antigravity\\brain\\c6d9149a-2661-4924-9a7c-8fd2a5d2520e\\scratch\\recovered\\raw_AiService_line_${index}.json`, line);
      }
    }
  }
}

search().then(() => console.log('Search finished.')).catch(console.error);
