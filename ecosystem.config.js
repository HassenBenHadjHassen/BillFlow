const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const port = process.env.PORT || 2027;

module.exports = {
  apps: [
    {
      name: "billflow",
      script: "node_modules/next/dist/bin/next",
      args: ["start", "-p", String(port)],
      cwd: "./",
      // CRITICAL: Single instance and fork mode ensure SQLite database integrity
      // without multi-worker lock contention in a single-user private application.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: port,
      },
      // Logs configuration
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      time: true,
    },
  ],
};
