const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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

async function main() {
  try {
    const username = 'admin';
    const passwords = ['admin123456', 'admin@123', 'admin123', 'admin'];
    
    const dbUser = await prisma.user.findUnique({ where: { username } });
    if (!dbUser) {
      console.log('User "admin" not found in DB!');
      return;
    }
    console.log(`Found user "${username}" in DB. Active: ${dbUser.is_active}. Hash: ${dbUser.password_hash}`);
    
    for (const pw of passwords) {
      const isMatch = await bcrypt.compare(pw, dbUser.password_hash);
      console.log(`Bcrypt compare for password "${pw}": ${isMatch}`);
    }

    // Try API logins
    const ports = [3009, 3099, 3017];
    for (const port of ports) {
      console.log(`\nTrying login request on port ${port}...`);
      try {
        const res = await postJson(port, '/api/auth/login', { username, password: 'admin123456' });
        console.log(`Port ${port} result:`, res.status, res.body);
      } catch (err) {
        console.log(`Port ${port} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
