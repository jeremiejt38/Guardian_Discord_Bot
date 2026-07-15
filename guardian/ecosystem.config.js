module.exports = {
  apps: [{
    name: 'guardian',
    script: './index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    log_file: '/var/log/guardian/combined.log',
    out_file: '/var/log/guardian/out.log',
    error_file: '/var/log/guardian/error.log',
    time: true,
  }],
};
