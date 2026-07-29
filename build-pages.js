#!/usr/bin/env node
/**
 * Builds each page as a self-contained HTML file: stylesheet, script, logo and
 * photographs all inlined, so a single file works on its own.
 *
 *   node tools/build-pages.js
 *
 * Output goes to standalone-pages/. Links between pages stay as plain filenames,
 * so keeping the files in one folder gives the whole working site.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "standalone-pages");
const ASSET_FOLDERS = ["products", "premises", "brands", "icons", "video"];

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
};

// a 1x1 transparent gif, swapped for the real image once the page loads
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

function dataUri(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAll(text, find, replaceWith) {
  return text.split(find).join(replaceWith);
}

function build(page) {
  let html = fs.readFileSync(path.join(ROOT, page), "utf8");

  // ---- stylesheet, with any image it references inlined ----
  let css = fs.readFileSync(path.join(ROOT, "assets/style.css"), "utf8");
  const cssAssets = new Set([...css.matchAll(/url\(["']?(assets\/[^"')]+)/g)].map((m) => m[1]));
  cssAssets.add("assets/medspok-logo.png");
  for (const asset of cssAssets) {
    const full = path.join(ROOT, asset);
    if (fs.existsSync(full)) css = replaceAll(css, asset, dataUri(full));
  }
  html = html.replace(/<link rel="stylesheet" href="assets\/style\.css">/,
    `<style>\n${css}\n</style>`);

  // ---- script ----
  const js = fs.readFileSync(path.join(ROOT, "assets/site.js"), "utf8");
  html = html.replace('<script src="assets/site.js"></script>', `<script>\n${js}\n</script>`);

  // ---- favicon, and drop the manifest ----
  html = html.replace(/<link rel="manifest"[^>]*>/g, "");
  for (const m of [...html.matchAll(/<link rel="[^"]*icon[^"]*"[^>]*href="([^"]+)"/g)]) {
    const full = path.join(ROOT, m[1]);
    if (fs.existsSync(full)) html = replaceAll(html, `href="${m[1]}"`, `href="${dataUri(full)}"`);
  }

  // ---- the film and the catalogue stay separate files ----
  // Inlining a 12 MB video would have to download in full before the page renders.
  html = replaceAll(html, "assets/video/setup-guide.mp4", "setup-guide.mp4");
  html = replaceAll(html, "assets/medspok-catalogue-2026.pdf", "medspok-catalogue-2026.pdf");

  // ---- every image: stored once in a map, applied at load ----
  const pattern = new RegExp(`assets/(?:${ASSET_FOLDERS.join("|")})/[A-Za-z0-9._-]+`, "g");
  const refs = [...new Set(html.match(pattern) || [])].sort();
  const images = {};
  refs.forEach((ref, index) => {
    const full = path.join(ROOT, ref);
    if (!fs.existsSync(full) || !MIME[path.extname(ref).toLowerCase()]) return;
    const key = `i${index}`;
    images[key] = dataUri(full);
    html = replaceAll(html, `data-full="${ref}"`, `data-full-img="${key}"`);
    html = replaceAll(html, `src="${ref}"`, `src="${PLACEHOLDER}" data-img="${key}"`);
    html = replaceAll(html, `poster="${ref}"`, `poster="${images[key]}"`);
  });

  if (Object.keys(images).length) {
    const loader =
      `\n<script>\n(function(){var M=${JSON.stringify(images)};` +
      `var n=document.querySelectorAll('[data-img]');` +
      `for(var i=0;i<n.length;i++){var k=n[i].getAttribute('data-img');if(M[k])n[i].src=M[k];}` +
      `var b=document.querySelectorAll('[data-full-img]');` +
      `for(i=0;i<b.length;i++){var j=b[i].getAttribute('data-full-img');` +
      `if(M[j])b[i].setAttribute('data-full',M[j]);}})();\n</script>\n`;
    html = html.replace("</body>", loader + "</body>");
  }

  // the logo also appears as a plain path in the markup
  html = replaceAll(html, "assets/medspok-logo.png",
    dataUri(path.join(ROOT, "assets/medspok-logo.png")));

  return html;
}

fs.mkdirSync(OUT, { recursive: true });
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
let total = 0;

for (const page of pages) {
  const html = build(page);
  const dest = path.join(OUT, page);
  fs.writeFileSync(dest, html);
  const size = fs.statSync(dest).size;
  total += size;
  const leftover = [...html.matchAll(/(?:src|href|poster)="(assets\/[^"]+)"/g)].map((m) => m[1]);
  const status = leftover.length ? `STILL EXTERNAL: ${leftover.slice(0, 2)}` : "self-contained";
  console.log(`  ${page.padEnd(20)} ${(size / 1e6).toFixed(1).padStart(5)} MB   ${status}`);
}

console.log(`\n  ${pages.length} pages, ${(total / 1e6).toFixed(1)} MB total, written to standalone-pages/`);
