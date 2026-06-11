const bc = require('bcrypt');
const { pool } = require('./config/database');
pool.query("SELECT password_hash, username FROM users WHERE username='admin'")
  .then(r => {
    const hash = r.rows[0]?.password_hash;
    bcrypt.compare('testpass123', hash || '').then(ok => console.log('valid:', ok)).catch(e => console.error(e));
  })
  .catch(e => console.error(e));
