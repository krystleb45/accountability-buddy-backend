#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROUTES_DIR = path.resolve(__dirname, "../api/routes");

/**
 * Recursively finds all `.ts` files under `dir`.
 */
function scanDir(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((dirent) => {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) return scanDir(full);
      return dirent.isFile() && full.endsWith(".ts") ? [full] : [];
    });
}

/**
 * Main entrypoint: scans route files and prints which middleware they import.
 */
function main(): void {
  const routeFiles = scanDir(ROUTES_DIR);

  console.log("| Route File | Middleware Imported |");
  console.log("|------------|---------------------|");

  for (const file of routeFiles) {
    const rel = path.relative(ROUTES_DIR, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const mw: string[] = [];
    const importRe = /import\s+[^'"]+\s+from\s+['"]\.\.\/middleware\/([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRe.exec(content))) {
      mw.push(match[1]);
    }

    console.log(`| \`${rel}\` | ${mw.length ? mw.join(", ") : "—"} |`);
  }
}

// Kick off the script
main();
