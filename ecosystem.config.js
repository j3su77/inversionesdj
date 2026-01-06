module.exports = {
    apps: [{
      name: 'inversiones-dj',
      script: './node_modules/next/dist/bin/next',
      args: 'start -p 4000',
      cwd: '/var/www/inversiones-dj',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }]
  };