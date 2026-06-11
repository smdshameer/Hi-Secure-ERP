const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(path.join(dir, f), 'utf8');
  const before = (content.match(/Link o=\{`/g) || []).length;
  if (before > 0) {
    content = content.replace(/Link o=\{`/g, 'Link to={`');
    fs.writeFileSync(path.join(dir, f), content, 'utf8');
    console.log('Fixed ' + before + ' links in ' + f);
  } else {
    console.log('OK:    ' + f);
  }
});
