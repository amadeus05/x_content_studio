#!/usr/bin/env node
/**
 * Idempotent D1 migrator for x-manager.
 * Runs SQL files and safely adds columns that plain ALTER would fail on re-run.
 *
 * Usage:
 *   node scripts/d1-migrate.mjs --local
 *   node scripts/d1-migrate.mjs --remote
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dbName = "x-manager-db";

const remote = process.argv.includes("--remote");
const localFlag = remote ? "--remote" : "--local";

function runWrangler(args) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function execSql(sql) {
  const result = runWrangler(["d1", "execute", dbName, localFlag, "--command", sql]);
  return result.status === 0;
}

function execFile(relativePath) {
  const full = join(root, relativePath);
  if (!existsSync(full)) {
    console.error(`Missing migration file: ${relativePath}`);
    process.exit(1);
  }
  const result = runWrangler(["d1", "execute", dbName, localFlag, "--file", full]);
  if (result.status !== 0) {
    console.error(`Failed: ${relativePath}`);
    process.exit(result.status ?? 1);
  }
  console.log(`OK ${relativePath}`);
}

function columnExists(table, column) {
  const result = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", dbName, localFlag, "--command", `PRAGMA table_info(${table});`],
    { cwd: root, encoding: "utf8", shell: true }
  );
  const out = `${result.stdout || ""}\n${result.stderr || ""}`;
  // wrangler prints JSON or table; match column name as a token
  const re = new RegExp(`\\b${column}\\b`, "i");
  return re.test(out);
}

function ensureColumn(table, column, ddlType) {
  if (columnExists(table, column)) {
    console.log(`skip ALTER ${table}.${column} (already exists)`);
    return;
  }
  const ok = execSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType};`);
  if (!ok) {
    console.error(`Failed to ADD COLUMN ${table}.${column}`);
    process.exit(1);
  }
  console.log(`OK ALTER ${table}.${column}`);
}

console.log(`D1 migrate (${remote ? "remote" : "local"})…`);

execFile("migrations/0001_initial_schema.sql");
execFile("migrations/0002_seed_playbook.sql");
execFile("migrations/0003_media.sql");

ensureColumn("post_variants", "pinned_body_id", "TEXT");
ensureColumn("posts", "active_body_id", "TEXT");

execFile("migrations/0004_post_bodies.sql");

console.log("Migrations complete.");
