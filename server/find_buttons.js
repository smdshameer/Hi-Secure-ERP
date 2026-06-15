const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.gemini' && file !== '.tempmediaStorage') {
          searchDir(fullPath);
        }
      } else {
        if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.sql') || file.endsWith('.py') || file.endsWith('.json')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('Inventory Management') || content.includes('WhatsApp Customers')) {
            console.log(`Found match in file: ${fullPath}`);
          }
        }
      }
    } catch (e) {}
  }
}

searchDir(path.resolve(__dirname, '..'));
console.log('Search completed.');
