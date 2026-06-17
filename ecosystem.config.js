module.exports = {
  apps: [
    {
      name: 'hisecure-api',
      script: 'server-fastify.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      kill_timeout: 10000,
      listen_timeout: 10000,
      watch: false,
      env: { NODE_ENV: 'development', PORT: 3001 },
      env_production: { NODE_ENV: 'production', PORT: 3001 },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log'
    }
  ]
};
