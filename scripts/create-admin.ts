import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function ensureDatabaseSchema() {
  try {
    await db.$queryRawUnsafe("SELECT 1 FROM User LIMIT 1");
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "P2021" || error?.message?.includes("does not exist") || error?.message?.includes("no such table")) {
      console.log("Database schema not yet initialized. Running 'prisma db push' automatically...");
      execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
      console.log("Database tables initialized successfully.\n");
    }
  }
}

async function main() {
  console.log("==========================================");
  console.log("   Billflow - Create Owner / Admin Setup  ");
  console.log("==========================================\n");

  await ensureDatabaseSchema();

  const rl = readline.createInterface({ input, output });

  try {
    const name = (await rl.question("Enter Owner Name (e.g. John Doe): ")).trim();
    if (!name) {
      console.error("Error: Name cannot be empty.");
      process.exit(1);
    }

    const email = (await rl.question("Enter Owner Email: ")).trim().toLowerCase();
    if (!email || !email.includes("@")) {
      console.error("Error: A valid email address is required.");
      process.exit(1);
    }

    const password = (await rl.question("Enter Secure Password (min 8 chars): ")).trim();
    if (password.length < 8) {
      console.error("Error: Password must be at least 8 characters long.");
      process.exit(1);
    }

    console.log("\nHashing password securely...");
    const passwordHash = await bcrypt.hash(password, 12);

    // Upsert single user
    const existing = await db.user.findFirst();
    let user;
    if (existing) {
      console.log(`Updating existing owner account (${existing.email})...`);
      user = await db.user.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          passwordHash,
        },
      });
    } else {
      console.log("Creating new owner account...");
      user = await db.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });
    }

    // Ensure company settings exist
    const settings = await db.companySettings.findFirst();
    if (!settings) {
      await db.companySettings.create({
        data: {
          companyName: `${name} Consulting`,
          email,
          country: "France",
          defaultCurrency: "EUR",
          defaultTaxRate: 20,
          defaultPaymentTerms: 30,
          invoicePrefix: "INV",
          invoiceNotes: "Payment is due within 30 days. Thank you for your business!",
        },
      });
      console.log("Company settings initialized with defaults.");
    }

    console.log("\n Owner account successfully configured!");
    console.log(`Email: ${user.email}`);
    console.log("You can now sign in at /login\n");
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
