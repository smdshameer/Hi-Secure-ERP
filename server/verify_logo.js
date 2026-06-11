const http = require('http');
http.get('http://localhost:3004/api/settings', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const settings = JSON.parse(data);
    const c = settings.company;
    console.log('Company name:', c.name);
    console.log('GSTIN:', c.gstin);
    console.log('Logo URL present:', !!(c.logo_url));
    console.log('Logo URL length:', c.logo_url ? c.logo_url.length : 0);
    console.log('Logo starts with:', c.logo_url ? c.logo_url.substring(0, 30) : 'NONE');
  });
});
