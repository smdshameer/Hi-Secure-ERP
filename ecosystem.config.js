module.exports = {
  apps: [
    { name: 'hisecure-api', script: 'server-fastify.js', instances: 1, exec_mode: 'fork', watch: false, env: { NODE_ENV: 'development', PORT: 3001 }, env_production: { NODE_ENV: 'production', PORT: 3001 }, log_date_format: 'YYYY-MM-DD HH:mm:ss Z', error_file: './logs/api-error.log', out_file: './logs/api-out.log' }
  ]
};
