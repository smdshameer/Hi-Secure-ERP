const fs = require('fs');
const path = require('path');
function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') searchDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Q3C-')) {
        console.log(`Found Q3C- in: ${fullPath}`);
      }
    }
  }
}
searchDir(path.join(__dirname, '..'));
