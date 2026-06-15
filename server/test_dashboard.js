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
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

function getJson(port, path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function main() {
  try {
    console.log('Logging in...');
    // We send request to /api/v1/auth/login directly to bypass 307 redirect
    const loginRes = await postJson(3009, '/api/v1/auth/login', { username: 'admin', password: 'admin123456' });
    console.log('Login Status:', loginRes.status);
    if (loginRes.status !== 200) {
      console.log('Login failed:', loginRes.body);
      return;
    }
    const token = loginRes.body.token;
    console.log('Login successful. Token acquired.');

    console.log('\nFetching dashboard statistics...');
    const dbRes = await getJson(3009, '/api/v1/dashboard', token);
    console.log('Dashboard Status:', dbRes.status);
    console.log('Dashboard Body:', JSON.stringify(dbRes.body, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
  }
}

main();
