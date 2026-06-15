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
    const loginRes = await postJson(3009, '/api/v1/auth/login', { username: 'admin', password: 'admin123456' });
    if (loginRes.status !== 200) {
      console.log('Login failed:', loginRes.body);
      return;
    }
    const token = loginRes.body.token;
    console.log('Login success.');

    const endpoints = [
      '/api/v1/dashboard',
      '/api/v1/notifications',
      '/api/v1/me',
      '/api/v1/settings'
    ];

    for (const ep of endpoints) {
      console.log(`\nFetching ${ep}...`);
      const res = await getJson(3009, ep, token);
      console.log(`Status for ${ep}:`, res.status);
      if (res.status !== 200) {
        console.log(`Error Response:`, res.body);
      } else {
        console.log(`Success (returned ${Array.isArray(res.body) ? res.body.length + ' items' : 'object'})`);
      }
    }

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
