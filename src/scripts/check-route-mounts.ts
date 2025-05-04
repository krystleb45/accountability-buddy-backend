// src/scripts/check-route-mounts.ts
import * as fs   from "fs";
import * as path from "path";

// 1) Read your app.ts mounts
const appTs = fs.readFileSync(path.resolve(__dirname, "../app.ts"), "utf8");
const mounted = new Set<string>();
for (const m of appTs.matchAll(/app\.use\(\s*['"`]\/api\/([^'"`]+)['"`]/g)) {
  mounted.add(m[1].toLowerCase());
}

// 2) Discover all your route‐filenames
const routesDir  = path.resolve(__dirname, "../api/routes");
const routeFiles = fs.readdirSync(routesDir)
  .filter(f => f.endsWith(".ts"))
  .map(f => f.replace(/\.ts$/, ""));

// 3) Helpers
function stripSuffix(name: string): string {
  return name.replace(/Routes?$/i, "");
}
function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function toSlash(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1/$2").toLowerCase();
}
function plural(s: string): string {
  return s.endsWith("y")
    ? s.slice(0, -1) + "ies"
    : s + "s";
}

// 4) Build a set of “mounted” variations so we can match hyphens too:
const mountedNorm = new Set<string>();
for (const m of mounted) {
  mountedNorm.add(m);
  mountedNorm.add(m.replace(/-/g, ""));  // allow hyphen‑less match
}

// 5) Check each route file
const notMounted = routeFiles.filter(routeName => {
  const base     = stripSuffix(routeName);
  const lcBase   = base.toLowerCase();

  const candidates = new Set([
    lcBase,
    plural(lcBase),
    toKebab(base),
    plural(toKebab(base)),
    toSlash(base),
    plural(toSlash(base)),
  ]);

  // if any candidate is in our normalized mounted list, we’re good
  return ![...candidates].some(c => mountedNorm.has(c));
});

if (notMounted.length === 0) {
  console.log("✅ All route files in src/api/routes are mounted in app.ts");
  process.exit(0);
} else {
  console.error("❌ These route files are NOT mounted in app.ts:");
  notMounted.forEach(r => console.error("  -", r));
  process.exit(1);
}
