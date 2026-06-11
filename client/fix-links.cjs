const fs = require('fs');
const path = require('path');

const pagesDir = 'C:\\Users\\Admin\\Desktop\\Calude Test\\erp-app\\client\\src\\pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const before = (content.match(/Link o=\{`/g) || []).length;
  if (before > 0) {
    content = content.replace(/Link o=\{`/g, 'Link to={`');
    fs.writeFileSync(path.join(pagesDir, f), content, 'utf8');
    console.log('Fixed ' + before + ' links in ' + f);
  } else {
    console.log('OK:    ' + f);
  }
});
