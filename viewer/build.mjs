// Post-tsc build step: assembles dist/ into a single, self-contained
// static site - the compiled viewer (already in dist/assets/ from
// `tsc`) plus index.html, public/styles.css, ../portal-manifest.json,
// and a copy of ../lenses/, ../sagas/, ../appendices/ (so the published
// site never depends on how the whole gcb-wiki repo happens to be
// served). Intentionally plain Node (fs/path only) - no bundler
// dependency for a handful of file copies.

import { mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const dist = join(here, "dist");

function copyFile(src, destDir, destName = undefined) {
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, destName ?? basename(src));
  copyFileSync(src, dest);
  console.log(`copied ${relative(src)} -> ${relative(dest)}`);
}

function copyMarkdownDir(dirName) {
  const src = join(repoRoot, dirName);
  const dest = join(dist, dirName);
  if (!existsSync(src)) {
    throw new Error(`Expected ${dirName}/ at ${src} - run this from gcb-wiki/viewer/ inside a full gcb-wiki checkout`);
  }
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry.endsWith(".md") || entry === "manifest.json") {
      copyFile(join(src, entry), dest, entry);
    }
  }
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

// 2b. public/web.config -> dist/web.config (IIS-only: registers the .md
//     MIME type IIS has no built-in mapping for - harmless on GitHub
//     Pages/other static hosts, which simply ignore an unused file)
copyFile(join(here, "public", "web.config"), dist);

// 3. ../portal-manifest.json -> dist/portal-manifest.json
copyFile(join(repoRoot, "portal-manifest.json"), dist);

// 4. ../lenses/, ../sagas/, ../appendices/ -> dist/lenses/, dist/sagas/, dist/appendices/
for (const dirName of ["lenses", "sagas", "appendices"]) {
  copyMarkdownDir(dirName);
}

console.log(`\nBuild complete: ${dist}`);
console.log("Serve dist/ as the site root (GitHub Pages, or any static file server) to try it locally.");
