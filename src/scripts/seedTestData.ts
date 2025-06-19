// src/scripts/seedTestData.ts
import { Role } from "../api/models/Role";
import { User } from "../api/models/User";
import bcrypt from "bcryptjs";

export async function seedRoles(): Promise<void> {
  const roles = [
    { roleName: "admin", permissions: ["manage_users", "view_reports"] },
    { roleName: "user",  permissions: ["view_content"] },
  ];
  // Upsert each role
  for (const r of roles) {
    await Role.updateOne(
      { roleName: r.roleName },
      { $set: r },
      { upsert: true }
    );
  }
}

export async function seedUsers(): Promise<void> {
  // Clear existing
  await User.deleteMany({});
  // Create new
  const users = [
    {
      email: "admin@example.com",
      username: "admin",
      password: await bcrypt.hash("password123", 10),
      role: "admin",
    },
    {
      email: "user@example.com",
      username: "testuser",
      password: await bcrypt.hash("password123", 10),
      role: "user",
    },
  ];
  await User.insertMany(users);
}
