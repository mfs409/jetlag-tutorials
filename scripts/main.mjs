// All of the scripts that are executed through package.json are in this file
// (the one exception is the type-checking half of `check`, which is a direct
// `tsc` call.  See package.json).

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build as esbuildBuild } from "esbuild";

/** Print usage information */
function help() {
  console.log(`npm run <command>: Runs a command from package.json

  Commands for Building the Book
    build        Build the whole book: mdbook renders the prose into book/,
                 then every demo is built into book/<chapter>/games/ as one
                 code-split esbuild bundle shared across all of them

  Commands for Type Checking
    check        Run TypeScript's type checker on all game and tutorial code
                 in the repository, and make sure that every chapter's copy of
                 a shared file (src/NN/common) is the same as src/common's

  Commands for Shared Code
    sync-common  Copy each file in src/common over the copy of it in every
                 chapter's own common folder.  Run it after editing src/common

  Commands for Cleaning Up
    clean        Remove any built files that aren't tracked by git

  Other Commands
    help         Print this message
`);
}

/** The root of the project is the parent of the folder that holds main.mjs */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the book (its markdown, the pictures it shows, and every chapter's games) can be found */
const SRC = path.join(ROOT, "src");

/** Location for assets used by the book itself */
const ASSETS_WEB = path.join(ROOT, "assets-web");

/** Where `npm run build` puts the rendered book */
const BOOK_OUTPUT_FOLDER = path.join(ROOT, "book");

/**
 * Each chapter has its own copy of the shared files that its games import, in
 * src/NN/common, so that a game imports "../common/common" exactly as a reader's
 * game does.  The master copies are in src/common.
 *
 * @returns Every copy, as { master, copy } paths
 */
function commonCopies() {
  const copies = [];
  for (const chapter of fs.readdirSync(SRC)) {
    const dir = path.join(SRC, chapter, "common");
    if (!/^\d+$/.test(chapter) || !fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      copies.push({ master: path.join(SRC, "common", file), copy: path.join(dir, file) });
    }
  }
  return copies;
}

/** Copy each master file in src/common over every chapter's copy of it */
function syncCommon() {
  const copies = commonCopies();
  for (const { master, copy } of copies) fs.copyFileSync(master, copy);
  console.log(`  ✓ Updated ${copies.length} copies of the shared files`);
}

/** Fail if any chapter's copy of a shared file differs from the master */
function checkCommon() {
  const different = commonCopies().filter(({ master, copy }) => !fs.existsSync(master) || fs.readFileSync(master, "utf8") !== fs.readFileSync(copy, "utf8"));
  if (different.length === 0) {
    console.log("  ✓ Every chapter's copy of a shared file matches src/common");
    return;
  }
  console.error("These copies are not the same as the file in src/common (run `npm run sync-common`):");
  for (const { copy } of different) console.error("  " + path.relative(ROOT, copy));
  process.exitCode = 1;
}

/** Clean up by removing all the output folders that aren't tracked in git */
function clean() {
  for (const folder of [BOOK_OUTPUT_FOLDER]) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  console.log(`  ✓ Removed build output folders`);
}

/**
 * Recursively list every file under `dir`, skipping node_modules
 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules") continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

/**
 * Build every runnable game demo in the tutorial book into book/<chapter>/, as
 * a real single-page-per-demo app.
 */
async function buildBook() {
  // A demo entry point is any .ts file that has a same-named .html next to it
  const tsFiles = walk(SRC).filter((f) => path.extname(f) === ".ts");
  const entries = [];
  for (const tsFile of tsFiles) {
    const dir = path.dirname(tsFile);
    const name = path.basename(tsFile, ".ts");
    if (!fs.existsSync(path.join(dir, `${name}.html`))) continue;
    const chapterRelDir = dir.slice(SRC.length + 1).split("\\").join("/") || ".";
    entries.push({ tsFile, chapterRelDir, name });
  }

  if (entries.length === 0) {
    console.log("No demo entry points found under src/, so there is nothing to compile.");
  }

  console.log(`Building ${entries.length} demo(s) as one code-split bundle...`);
  fs.mkdirSync(BOOK_OUTPUT_FOLDER, { recursive: true });

  if (entries.length > 0) await esbuildBuild({
    entryPoints: entries.map((e) => ({ in: e.tsFile, out: `${e.chapterRelDir}/${e.name}` })),
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    outdir: BOOK_OUTPUT_FOLDER,
    chunkNames: "chunks/[hash]",
    logLevel: "info",
  });

  // mdbook copies every file in src/ that isn't markdown, so the games' code, .html files, and
  // assets are already next to the pages.  All that's left is the bundled JavaScript, above.

  // Redirect each demo HTML file's script loader to use demo-embed.js, so we
  // get "click-to-play" instead of a game that loads and runs instantly.
  fs.cpSync(path.join(ASSETS_WEB, "demo-embed.js"), path.join(BOOK_OUTPUT_FOLDER, "demo-embed.js"));
  // Every demo's .html links to this shared stylesheet as "../../demo.css"
  fs.cpSync(path.join(ASSETS_WEB, "demo.css"), path.join(BOOK_OUTPUT_FOLDER, "demo.css"));
  console.log("Gating demos behind demo-embed.js...");
  let gated = 0;
  for (const { chapterRelDir, name } of entries) {
    const htmlPath = path.join(BOOK_OUTPUT_FOLDER, chapterRelDir, `${name}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, "utf8");
    const scriptTag = `<script type="module" src="./${name}.js"></script>`;
    if (!html.includes(scriptTag)) continue;
    const toRoot = path.relative(path.join(BOOK_OUTPUT_FOLDER, chapterRelDir), BOOK_OUTPUT_FOLDER).split("\\").join("/");
    fs.writeFileSync(htmlPath, html.replace(scriptTag, `<script src="${toRoot}/demo-embed.js"></script>`));
    gated++;
  }
  console.log(`Gated ${gated} demo(s) behind a click-to-play placeholder.`);

  console.log(`Done: ${entries.length} demo(s) in book/.`);
}

/**
 * Build the whole book: mdbook renders the prose into book/, then buildBook()
 * builds every demo into book/<chapter>/.
 */
async function build() {
  const mdbook = spawnSync("mdbook", ["build", "-d", "book", "."], { cwd: ROOT, stdio: "inherit" });
  if (mdbook.status !== 0) {
    console.error("mdbook build failed.");
    process.exitCode = mdbook.status ?? 1;
    return;
  }
  await buildBook();
}

/**
 * Dispatch to the appropriate code based on the request given as a command line
 * argument.
 *
 * @param command The requested command
 */
async function main(command) {
  if (command === "build") {
    await build();
  } else if (command === "sync-common") {
    syncCommon();
  } else if (command === "check-common") {
    checkCommon();
  } else if (command === "clean") {
    clean();
  } else if (command === "help") {
    help();
  } else {
    help();
    if (command !== undefined) {
      console.log(`Unknown command '${command}'\n`);
      process.exitCode = 1;
    }
  }
}

// Run the requested operation
await main(process.argv[2]);
