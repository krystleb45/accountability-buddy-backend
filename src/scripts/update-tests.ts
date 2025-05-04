// src/scripts/update‑tests.ts
import glob from "glob";
import fs from "fs";
import path from "path";

const TEST_GLOB = "src/test/**/*.ts";

// Grab all matching test files
const files: string[] = glob.sync(TEST_GLOB, { nodir: true });

files.forEach((file: string) => {
  // Read it in
  let text = fs.readFileSync(file, "utf8");

  // 1) Remove any import of supertest / app
  text = text
    .replace(/import\s+request.*supertest;?\r?\n?/g, "")
    .replace(/import\s+app.*src\/app;?\r?\n?/g, "");

  // 2) Rewrite request(app).METHOD(...) → global.authMETHOD(...)
  text = text
    // GET
    .replace(
      /request\(app\)\.get\((['"`])(.+?)\1\)/g,
      (_match: string, _q: string, p1: string) => `global.authGet('${p1}')`
    )
    // POST
    .replace(
      /request\(app\)\.post\((['"`])(.+?)\1\)\.send\(([^)]+)\)/g,
      (_match: string, _q: string, p1: string, body: string) =>
        `global.authPost('${p1}', ${body})`
    )
    // PUT
    .replace(
      /request\(app\)\.put\((['"`])(.+?)\1\)\.send\(([^)]+)\)/g,
      (_match: string, _q: string, p1: string, body: string) =>
        `global.authPut('${p1}', ${body})`
    )
    // DELETE
    .replace(
      /request\(app\)\.delete\((['"`])(.+?)\1\)/g,
      (_match: string, _q: string, p1: string) => `global.authDelete('${p1}')`
    );

  // Overwrite the file
  fs.writeFileSync(file, text, "utf8");
  console.log("Updated", path.relative(process.cwd(), file));
});

console.log(`✓ Processed ${files.length} test files.`);
