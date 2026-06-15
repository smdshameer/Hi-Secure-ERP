const http = require('http');

function postJson(port, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: responseBody });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log('Testing login request via Vite Dev Server proxy on port 5175...');
    const res = await postJson(5175, '/api/auth/login', { username: 'admin', password: 'admin123456' });
    console.log('Response Status:', res.status);
    console.log('Response Headers:', res.headers);
    console.log('Response Body:', res.body);
  } catch (err) {
    console.error('Failed to query Vite dev server proxy:', err.message);
  }
}

main();
