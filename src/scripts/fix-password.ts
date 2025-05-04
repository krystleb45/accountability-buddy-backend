// scripts/fix-password.ts
import dotenvFlow from "dotenv-flow";
dotenvFlow.config(); // loads .env.development / .env

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../api/models/User";

/**
 * Re-hashes the password for a given user email.
 */
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI must be defined in your .env");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  const plainPassword = "Password1!";
  const hash = await bcrypt.hash(plainPassword, 10);

  const result = await User.updateOne(
    { email: "newbob@example.com" },
    { $set: { password: hash } }
  );

  console.log(`✅ Re-hashed password for ${result.modifiedCount ?? 0} user(s).`);

  await mongoose.disconnect();
  process.exit(0);
}

// Invoke the script
void main().catch((err: unknown) => {
  console.error("❌ Failed to re-hash password:", err);
  process.exit(1);
});
