const http = require('http');
http.get('http://localhost:3004/api/settings', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const settings = JSON.parse(data);
    const c = settings.company;
    console.log('Company name:', c.name);
    console.log('GSTIN:', c.gstin);
    console.log('Address:', c.address);
    console.log('Phone:', c.phone);
    console.log('Website:', c.website);
    console.log('Print theme:', settings.print.default_theme);
  });
});
