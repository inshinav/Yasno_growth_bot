/* PM2: pm2 start deploy/ecosystem.config.cjs && pm2 save */
module.exports = {
  apps: [
    {
      name: 'yasno-growth-bot',
      script: 'server/index.js',
      cwd: '/var/www/yasno-growth-bot',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
      out_file: '/var/www/yasno-growth-bot/logs/out.log',
      error_file: '/var/www/yasno-growth-bot/logs/err.log',
      merge_logs: true,
    },
  ],
};
