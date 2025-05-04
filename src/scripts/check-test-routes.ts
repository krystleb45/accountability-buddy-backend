// scripts/check-test-routes.js
const fs   = require("fs");
const glob = require("glob");
const appTs = fs.readFileSync("src/app.ts", "utf8");

// 1) Extract all mounted /api/… prefixes from app.ts
const mountRe = /app\.use\(\s*['"]\/api\/([^'"]+)['"]/g;
let m;
const mounted = new Set();
while (m = mountRe.exec(appTs)) {
  mounted.add(`/api/${m[1]}`);
}

// 2) Scan every test file for authGet("…") calls
const tests = glob.sync("src/test/**/*.test.ts");
const missing = new Map();  // test file → [missing paths]

tests.forEach((file: string) => {
  const src = fs.readFileSync(file, "utf8");
  const callRe = /authGet\(\s*['"]([^'"]+)['"]/g;
  let c;
  while (c = callRe.exec(src)) {
    const path = c[1];
    if (path.startsWith("/api/") && !mounted.has(path)) {
      if (!missing.has(file)) missing.set(file, []);
      missing.get(file).push(path);
    }
  }
});

// 3) Report
if (missing.size === 0) {
  console.log("✅ All test routes match your app.ts mounts!");
  process.exit(0);
}
console.log("❌ Found tests pointing at un‑mounted endpoints:\n");
for (const [file, paths] of missing as Map<string,string[]>) {
  console.log(`  ${file}:`);
  Array.from(new Set(paths)).forEach(p => console.log(`     • ${p}`));
}
process.exit(1);
