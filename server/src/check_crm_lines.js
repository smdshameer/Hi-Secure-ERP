const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Admin\\Desktop\\Calude Test\\erp-app\\server\\src\\services\\CrmService.ts', 'utf8').split('\n');
for (let i = 430; i < Math.min(lines.length, 470); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
