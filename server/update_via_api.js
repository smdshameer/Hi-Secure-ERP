const http = require('http');

const data = JSON.stringify({
  company: {
    name: 'HI SECURE SOLUTIONS',
    address: '99, Al-Ahad Complex, Main Road, Thittachery, Nagapattinam - 609703',
    phone: '9042489993, 9003400586',
    email: 'info@hisecuresolutions.com',
    website: 'www.hisecuresolutions.com',
    gstin: '33CMAPM9758H1ZQ',
    state: 'Tamil Nadu',
    state_code: '33',
    pan: 'AABCH1234R'
  }
});

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/api/settings',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

req.write(data);
req.end();
