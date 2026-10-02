module.exports = {
  apps: [
    {
      name: 'hrms-api',
      cwd: '/var/www/hrms/backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
