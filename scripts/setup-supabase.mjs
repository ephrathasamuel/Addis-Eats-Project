// One-shot Supabase setup for Addis Eats, using the Supabase Management API.
//
// Reads from .env.local (or the environment):
//   SUPABASE_ACCESS_TOKEN   personal access token (supabase.com/dashboard/account/tokens)
//   SUPABASE_PROJECT_REF    optional; if missing, the only project / one named like "addis" is used
//   SITE_URLS               comma-separated app origins, e.g. http://localhost:3000,https://addis-eats.vercel.app
//   GOOGLE_CLIENT_ID        optional; enables Google sign-in
//   GOOGLE_CLIENT_SECRET    optional
//
// What it does:
//   1. Runs every SQL file in supabase/migrations (they are idempotent).
//   2. Configures auth: site URL, redirect allow-list, email sign-up, 8-char
//      minimum password, and the Google provider when credentials are given.
//   3. Writes NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
//      into .env.local.
//
// Usage: node scripts/setup-supabase.mjs

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const envFile = path.join(root, ".env.local");

function readEnvFile() {
  if (!fs.existsSync(envFile)) return {};
  const values = {};
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const fileEnv = readEnvFile();
const env = (name) => process.env[name] || fileEnv[name] || "";

const token = env("SUPABASE_ACCESS_TOKEN");
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (add it to .env.local).");
  process.exit(1);
}

async function api(method, route, body) {
  const response = await fetch(`https://api.supabase.com/v1${route}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} -> ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// 0. Pick the project
let ref = env("SUPABASE_PROJECT_REF");
if (!ref) {
  const projects = await api("GET", "/projects");
  const match = projects.length === 1 ? projects[0] : projects.find((p) => /addis/i.test(p.name));
  if (!match) {
    console.error("Set SUPABASE_PROJECT_REF. Your projects:", projects.map((p) => `${p.name} (${p.id})`).join(", "));
    process.exit(1);
  }
  ref = match.id;
  console.log(`Using project "${match.name}" (${ref})`);
}

// 1. Migrations
const migrationsDir = path.join(root, "supabase", "migrations");
for (const file of fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  await api("POST", `/projects/${ref}/database/query`, { query: fs.readFileSync(path.join(migrationsDir, file), "utf8") });
  console.log(`Applied ${file}`);
}

// 2. Auth configuration
const siteUrls = env("SITE_URLS").split(",").map((u) => u.trim().replace(/\/$/, "")).filter(Boolean);
if (siteUrls.length === 0) siteUrls.push("http://localhost:3000");
const authConfig = {
  site_url: siteUrls[siteUrls.length - 1],
  uri_allow_list: siteUrls.map((u) => `${u}/**`).join(","),
  external_email_enabled: true,
  disable_signup: false,
  password_min_length: 8,
};
if (env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")) {
  Object.assign(authConfig, {
    external_google_enabled: true,
    external_google_client_id: env("GOOGLE_CLIENT_ID"),
    external_google_secret: env("GOOGLE_CLIENT_SECRET"),
  });
}
await api("PATCH", `/projects/${ref}/config/auth`, authConfig);
console.log(`Auth configured (redirects: ${authConfig.uri_allow_list}; Google: ${authConfig.external_google_enabled ? "on" : "off"})`);

// 3. Public keys into .env.local
const keys = await api("GET", `/projects/${ref}/api-keys?reveal=true`);
const publishable =
  keys.find((k) => k.type === "publishable")?.api_key || keys.find((k) => k.name === "anon")?.api_key;
if (!publishable) throw new Error("Could not find a publishable or anon key for the project.");

let contents = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", `https://${ref}.supabase.co`],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishable],
]) {
  const line = `${name}="${value}"`;
  contents = new RegExp(`^${name}=.*$`, "m").test(contents)
    ? contents.replace(new RegExp(`^${name}=.*$`, "m"), line)
    : `${contents.replace(/\s*$/, "")}\n${line}\n`;
}
fs.writeFileSync(envFile, contents.replace(/^\n/, ""));
console.log("Wrote Supabase URL and publishable key to .env.local");

if (authConfig.external_google_enabled) {
  console.log(`\nIn Google Cloud, the OAuth client must allow this redirect URI:\n  https://${ref}.supabase.co/auth/v1/callback`);
}
console.log("\nDone. Restart the app (npm run dev) to pick up the new settings.");
