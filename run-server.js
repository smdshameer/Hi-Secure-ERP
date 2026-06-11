const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

// Find a free port starting from 3017
function findFreePort(start = 3017, max = 3099) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      if (start < max) return findFreePort(start + 1, max).then(resolve);
      resolve(start);
    });
  });
}

(async () => {
  const port = await findFreePort();
  console.log(`Starting server on port ${port}...`);

  const child = spawn('node', ['server-fastify.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code || 0);
  });

  // Wait for server to be ready
  const checkReady = setInterval(() => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkReady);
        console.log(`\n✅ Server ready at http://localhost:${port}`);
        console.log(`   API: http://localhost:${port}/api/health`);
        console.log(`   Login: admin / admin123`);
      }
    });
    req.on('error', () => {});
    req.end();
  }, 1000);
})();
