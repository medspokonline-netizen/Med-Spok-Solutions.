#!/usr/bin/env node
/**
 * Checks every page for broken links, missing files and structural mistakes.
 *
 *   node tools/checklinks.js
 *
 * Exits with code 1 if anything is wrong, so it can gate a deploy.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "source", "track", "wbr"]);

/** Walks the tags in document order and reports anything left open or mismatched. */
function structureErrors(markup) {
  const errors = [];
  const stack = [];
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let match;

  while ((match = tagPattern.exec(markup)) !== null) {
    const [, closing, name, selfClosing] = match;
    const tag = name.toLowerCase();
    if (VOID.has(tag) || selfClosing === "/") continue;

    if (closing) {
      if (stack.length === 0) {
        errors.push(`stray </${tag}>`);
      } else if (stack[stack.length - 1] !== tag) {
        errors.push(`<${stack[stack.length - 1]}> closed by </${tag}>`);
        stack.pop();
      } else {
        stack.pop();
      }
    } else {
      stack.push(tag);
    }
  }
  stack.forEach((tag) => errors.push(`<${tag}> was never closed`));
  return errors;
}

function idsIn(markup) {
  return [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
}

function check() {
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
  if (pages.length === 0) return ["no HTML pages found — is tools/ inside the project?"];

  const problems = [];
  const idsByPage = {};
  for (const page of pages) {
    idsByPage[page] = new Set(idsIn(fs.readFileSync(path.join(ROOT, page), "utf8")));
  }

  for (const page of pages) {
    const markup = fs.readFileSync(path.join(ROOT, page), "utf8");

    structureErrors(markup).forEach((e) => problems.push(`${page}: ${e}`));

    // every local file a page points at has to exist
    for (const m of markup.matchAll(/(?:href|src|poster|data-full)="([^"]+)"/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|tel:|data:|#)/.test(target)) {
        if (target.startsWith("#") && target.length > 1 && !idsByPage[page].has(target.slice(1))) {
          problems.push(`${page}: ${target} does not exist on this page`);
        }
        continue;
      }
      const [pathPart, fragment] = target.split("#");
      const file = pathPart.split("?")[0];
      if (file && !fs.existsSync(path.join(ROOT, file))) {
        problems.push(`${page}: links to missing file ${file}`);
      } else if (fragment && file && idsByPage[file] && !idsByPage[file].has(fragment)) {
        problems.push(`${page}: #${fragment} does not exist in ${file}`);
      }
    }

    // things that quietly hurt accessibility and search
    for (const img of markup.match(/<img [^>]*>/g) || []) {
      if (!img.includes("alt=")) problems.push(`${page}: an <img> has no alt text`);
    }
    const ids = idsIn(markup);
    new Set(ids.filter((id) => ids.filter((x) => x === id).length > 1))
      .forEach((dupe) => problems.push(`${page}: id="${dupe}" used more than once`));

    if (!markup.includes("<title>")) problems.push(`${page}: no <title>`);
    if (!markup.includes('name="description"')) problems.push(`${page}: no meta description`);
    if ((markup.match(/<h1/g) || []).length !== 1) problems.push(`${page}: expected exactly one <h1>`);

    const levels = [...markup.matchAll(/<h([1-4])[ >]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        problems.push(`${page}: heading jumps from h${levels[i - 1]} to h${levels[i]}`);
        break;
      }
    }
  }
  return problems;
}

const found = check();
if (found.length) {
  console.log("Link check failed:\n");
  found.forEach((line) => console.log("  - " + line));
  process.exit(1);
}
const count = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).length;
console.log(`Link check passed: ${count} pages, no broken links or structural errors.`);
