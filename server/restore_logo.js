const http = require('http');
const fs = require('fs');

// Read the cached old settings that had the logo
const oldContent = fs.readFileSync(
  'C:/Users/Admin/.gemini/antigravity/brain/7a31d73d-28ad-417f-b2e7-8f4672dfc889/.system_generated/steps/9186/content.md',
  'utf8'
);

// Extract JSON from the content
const jsonStart = oldContent.indexOf('{');
const oldSettings = JSON.parse(oldContent.substring(jsonStart));
const logoUrl = oldSettings.company.logo_url;
const logoPath = oldSettings.company.logo_path;

console.log('Logo URL length:', logoUrl ? logoUrl.length : 'NOT FOUND');
console.log('Logo Path length:', logoPath ? logoPath.length : 'NOT FOUND');

// Now PUT with correct company data + restored logo
const companyData = {
  company: {
    name: 'HI SECURE SOLUTIONS',
    address: '99, Al-Ahad Complex, Main Road, Thittachery, Nagapattinam - 609703',
    phone: '9042489993, 9003400586',
    email: 'info@hisecuresolutions.com',
    website: 'www.hisecuresolutions.com',
    gstin: '33CMAPM9758H1ZQ',
    state: 'Tamil Nadu',
    state_code: '33',
    pan: 'AABCH1234R',
    logo_url: logoUrl || logoPath || '',
    logo_path: logoPath || logoUrl || '',
    pin_code: '',
    bank_name: 'HDFC Bank',
    bank_account: '1234567890123456',
    ifsc_code: 'HDFC0001234',
    bank_branch: '',
    bank: {
      name: 'HDFC Bank',
      branch: 'Delhi',
      ifsc_code: 'HDFC0001234',
      swift_code: 'HDFCINBB',
      account_number: '1234567890123456'
    }
  }
};

const data = JSON.stringify(companyData);

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
