module.exports = {
  apps: [
    {
      name: 'hisecure-erp-server',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '2G',
      kill_timeout: 15000,
      listen_timeout: 15000,
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3004
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log'
    }
  ]
};
