#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = path.resolve(__dirname, "..");

function run(cmd, desc) {
  console.log(`\n\x1b[36m▶ ${desc}...\x1b[0m`);
  try {
    execSync(cmd, { cwd: rootDir, stdio: "inherit" });
  } catch (err) {
    console.error(`\x1b[31m✖ Error during: ${desc}\x1b[0m`);
    process.exit(1);
  }
}

console.log("\x1b[32m");
console.log("=================================================");
console.log("   🚀 Billflow - One-Click VPS Production Setup  ");
console.log("=================================================");
console.log("\x1b[0m");

// 1. Ensure .env exists
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");

if (!fs.existsSync(envPath)) {
  console.log("\x1b[33m⚠ .env not found. Creating from .env.example with secure random secrets...\x1b[0m");
  let envContent = "";
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, "utf-8");
  } else {
    envContent = `PORT=2027\nDATABASE_URL="file:./billflow.db"\nBETTER_AUTH_URL="http://localhost:2027"\nSTORAGE_DIR="./storage"\n`;
  }

  const generatedSecret = `bf_sec_${crypto.randomBytes(24).toString("hex")}`;
  envContent = envContent.replace(/change-this-to-a-very-secure-random-secret-key-at-least-32-chars/g, generatedSecret);

  if (!envContent.includes("BETTER_AUTH_SECRET")) {
    envContent += `\nBETTER_AUTH_SECRET="${generatedSecret}"\nAUTH_SECRET="${generatedSecret}"\n`;
  }

  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log("\x1b[32m✔ .env created successfully.\x1b[0m");
}

// 2. Ensure directories exist
const storageDir = path.join(rootDir, "storage");
const logsDir = path.join(rootDir, "logs");
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// 3. Database schema push & Prisma generation
run("npx prisma db push", "Initializing SQLite Database Schema");

// 4. Build Next.js application
run("npx next build", "Building Next.js Production Bundle");

// 5. Start or reload with PM2
console.log("\n\x1b[36m▶ Starting / Reloading Billflow in PM2...\x1b[0m");
try {
  // Try reload first if already running
  execSync("npx pm2 reload ecosystem.config.js", { cwd: rootDir, stdio: "inherit" });
} catch {
  // If not running, start fresh
  execSync("npx pm2 start ecosystem.config.js", { cwd: rootDir, stdio: "inherit" });
}

// 6. Save PM2 state so it auto-restarts on server reboot
try {
  execSync("npx pm2 save", { cwd: rootDir, stdio: "ignore" });
} catch {
  // ignore if save is not available
}

// 7. Show PM2 status table
try {
  execSync("npx pm2 status", { cwd: rootDir, stdio: "inherit" });
} catch {}

// 8. Read port from .env
let port = "2027";
try {
  const envText = fs.readFileSync(envPath, "utf-8");
  const match = envText.match(/^PORT=(\d+)/m);
  if (match) port = match[1];
} catch {}

console.log("\n\x1b[32m=================================================");
console.log("   🎉 Billflow is Live in Production!");
console.log("=================================================\x1b[0m");
console.log(`\n• Access the app:  \x1b[34mhttp://localhost:${port}\x1b[0m (or http://<YOUR_VPS_IP>:${port})`);
console.log("• View live logs:  \x1b[33mnpm run prod:logs\x1b[0m");
console.log("• Create admin:    \x1b[33mnpm run create-admin\x1b[0m (if not yet created)");
console.log("• Stop server:     \x1b[33mnpm run prod:stop\x1b[0m\n");
