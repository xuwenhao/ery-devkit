// @ts-check
// Scratch file to give the Kimi review workflow something to look at. Safe to delete.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const required = ["name", "version", "private"];
const missing = required.filter((k) => !(k in pkg));

if (missing.length) {
  console.error("package.json missing:", missing);
  process.exit(1);
}

const unused = "review fodder";
console.log(`workspace ok: ${pkg.name}`);
