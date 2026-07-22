// QA DB bootstrap — creates the `virtualballot` database if it doesn't exist,
// using the credentials in VBackend/.env. Run from the VBackend folder so `pg`
// resolves. Schema/seed are handled afterwards by db:setup, migrate:*, db:seed.
//
//   cd VBackend && node scripts/qa-bootstrap.mjs
//
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env");

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.DATABASE_URL || "";
if (url.includes("__DB_PASSWORD__")) {
  console.error(
    "✗ VBackend/.env still has the __DB_PASSWORD__ placeholder — set your Postgres password first."
  );
  process.exit(1);
}

const u = new URL(url);
const dbName = u.pathname.slice(1);
u.pathname = "/postgres"; // maintenance DB, to issue CREATE DATABASE

const admin = new pg.Client({ connectionString: u.toString() });
try {
  await admin.connect();
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );
  if (rowCount) {
    console.log(`• Database "${dbName}" already exists — leaving it in place.`);
  } else {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✓ Created database "${dbName}".`);
  }
} catch (err) {
  console.error("✗ Could not connect/create database:", err.message);
  console.error("  Check the password in VBackend/.env and that Postgres is running.");
  process.exit(1);
} finally {
  await admin.end();
}
console.log(
  "Next: npm run db:setup && npm run migrate:open && npm run migrate:paid && npm run migrate:chain && npm run migrate:roster && npm run db:seed"
);
