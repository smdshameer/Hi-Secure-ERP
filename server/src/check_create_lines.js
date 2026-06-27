const fs = require('fs');
function dumpLines(filePath, search) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (line.includes(search)) {
      console.log(`\n--- ${filePath} : Line ${idx + 1} ---`);
      for (let i = Math.max(0, idx - 10); i < Math.min(lines.length, idx + 15); i++) {
        console.log(`${i+1}: ${lines[i]}`);
      }
    }
  });
}
dumpLines('C:\\Users\\Admin\\Desktop\\Calude Test\\erp-app\\server\\src\\services\\AmcAutomationService.ts', 'quotation.create');
dumpLines('C:\\Users\\Admin\\Desktop\\Calude Test\\erp-app\\server\\src\\services\\CrmService.ts', 'quotation.create');
