module.exports = {
  apps: [
    {
      name: "inversiones-dj",

      cwd: "/home/deploy/apps/inv-dj",
      script: "./node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 4000",

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,

      max_memory_restart: "450M",

      restart_delay: 5000,
      min_uptime: "10s",
      max_restarts: 10,

      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },

      error_file: "/home/deploy/apps/logs/err.log",
      out_file: "/home/deploy/apps/logs/out.log",

      merge_logs: true,
      time: true,
    },
  ],
};



// module.exports = {
//     apps: [{
//       name: 'inversiones-dj',
//       script: './node_modules/next/dist/bin/next',
//       args: 'start -p 4000',
//       cwd: '/var/www/inversiones-dj',
//       instances: 1,
//       exec_mode: 'cluster',
//       autorestart: true,
//       watch: false,
//       max_memory_restart: '1G',
//       env: {
//         NODE_ENV: 'production',
//         PORT: 4000
//       },
//       error_file: './logs/err.log',
//       out_file: './logs/out.log',
//       log_file: './logs/combined.log',
//       time: true
//     }]
//   };