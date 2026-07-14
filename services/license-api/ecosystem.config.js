module.exports = {
  apps: [{
    name: 'guardian-license-api',
    script: './server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    log_file: '/var/log/guardian/license-api-combined.log',
    out_file: '/var/log/guardian/license-api-out.log',
    error_file: '/var/log/guardian/license-api-error.log',
    time: true,
  }],
};
