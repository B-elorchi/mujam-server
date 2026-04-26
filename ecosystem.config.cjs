/**
 * PM2 process file — deploy from repo root or mujam-server:
 *   cd mujam-server && npm run build && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'mujam-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
