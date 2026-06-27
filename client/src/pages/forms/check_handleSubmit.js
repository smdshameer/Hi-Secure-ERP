const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Admin\\Desktop\\Calude Test\\erp-app\\client\\src\\pages\\forms\\InvoiceForm.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('handleSubmit =') || line.includes('function handleSubmit')) {
    console.log(`Found handleSubmit at line ${idx + 1}`);
    for (let i = idx; i < Math.min(lines.length, idx + 100); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
});
