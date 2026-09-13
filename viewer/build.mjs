// Post-tsc build step: assembles dist/ into a single, self-contained
// static site - the compiled viewer (already in dist/assets/ from
// `tsc`) plus index.html, public/styles.css, and a copy of ../sagas/
// (so the published site never depends on how the whole gcb-wiki repo
// happens to be served). Intentionally plain Node (fs/path only) - no
// bundler dependency for a handful of file copies.

import { mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
const sagasSource = join(here, "..", "sagas");
const sagasDest = join(dist, "sagas");

function copyFile(src, destDir, destName = undefined) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, destName ?? basename(src));
  copyFileSync(src, dest);
  console.log(`copied ${relative(src)} -> ${relative(dest)}`);
}

function basename(p) {
  return p.split(/[\\/]/).pop();
}

function relative(p) {
  return p.replace(here + "/", "").replace(here + "\\", "");
}

// 1. index.html -> dist/index.html
copyFile(join(here, "index.html"), dist);

// 2. public/styles.css -> dist/styles.css
copyFile(join(here, "public", "styles.css"), dist);

// 3. ../sagas/*.md + manifest.json -> dist/sagas/
if (!existsSync(sagasSource)) {
  throw new Error(`Expected sagas/ at ${sagasSource} - run this from gcb-wiki/viewer/ inside a full gcb-wiki checkout`);
}
mkdirSync(sagasDest, { recursive: true });
for (const entry of readdirSync(sagasSource)) {
  if (entry.endsWith(".md") || entry === "manifest.json") {
    copyFile(join(sagasSource, entry), sagasDest, entry);
  }
}

console.log(`\nBuild complete: ${dist}`);
console.log("Serve dist/ as the site root (GitHub Pages, or any static file server) to try it locally.");
