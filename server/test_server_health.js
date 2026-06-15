const http = require('http');

function getUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const targets = [
    'http://localhost:3009/health',
    'http://localhost:3009/api/health',
    'http://localhost:3009/api/v1/health',
    'http://localhost:3009/'
  ];
  for (const target of targets) {
    console.log(`Querying ${target}...`);
    try {
      const res = await getUrl(target);
      console.log(`Result:`, res.status, typeof res.body === 'object' ? JSON.stringify(res.body) : res.body.substring(0, 200));
    } catch (err) {
      console.log(`Failed:`, err.message);
    }
  }
}

main();
