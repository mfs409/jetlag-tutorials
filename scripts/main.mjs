// All of the scripts that are executed through package.json are in this file
// (the one exception is `check`, which is just a direct `tsc` call.  See
// package.json).

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
                 then every demo is built into book/<chapter>/ as one
                 code-split esbuild bundle shared across all of them

  Commands for Type Checking
    check        Run TypeScript's type checker on all game and tutorial code
                 in the repository

  Commands for Cleaning Up
    clean        Remove any built files that aren't tracked by git

  Other Commands
    help         Print this message
`);
}

/** The root of the project is the parent of the folder that holds main.mjs */
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the book's markdown (and the pictures it shows) can be found */
const MDSRC = path.join(ROOT, "mdsrc");

/** Where all of the game code can be found: one folder per chapter, like MDSRC */
const TSSRC = path.join(ROOT, "tssrc");

/** Location for game assets */
const ASSETS = path.join(TSSRC, "assets");

/** Location for assets used by the book itself */
const ASSETS_WEB = path.join(ROOT, "assets-web");

/** Where `npm run build` puts the rendered book */
const BOOK_OUTPUT_FOLDER = path.join(ROOT, "book");

/** Clean up by removing all the output folders that aren't tracked in git */
function clean() {
  for (const folder of [BOOK_OUTPUT_FOLDER]) {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  console.log(`  ✓ Removed build output folders`);
}

/**
 * Recursively list every file under `dir`, skipping the framework symlinks and
 * node_modules
 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "jetlag" || name === "jetlag.ts") continue;
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

/**
 * Build every runnable game demo in the tutorial book into book/<chapter>/, as
 * a real single-page-per-demo app, and copy the shared assets next to them.
 */
async function buildBook() {
  // A demo entry point is any .ts file that has a same-named .html next to it
  const tsFiles = walk(TSSRC).filter((f) => path.extname(f) === ".ts");
  const entries = [];
  for (const tsFile of tsFiles) {
    const dir = path.dirname(tsFile);
    const name = path.basename(tsFile, ".ts");
    if (!fs.existsSync(path.join(dir, `${name}.html`))) continue;
    const chapterRelDir = dir.slice(TSSRC.length + 1).split("\\").join("/") || ".";
    entries.push({ tsFile, chapterRelDir, name });
  }

  if (entries.length === 0) {
    console.log("No demo entry points found under tssrc/, so there is nothing to compile.");
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

  // mdbook only copies what's in mdsrc/, so the code that the pages link to
  // (and the demos' .html files) have to be copied next to the pages.  That's
  // every chapter, plus the shared `common` folder.  The engine isn't linked
  // from anywhere, so it's skipped
  console.log("Copying code and HTML into book/...");
  for (const name of fs.readdirSync(TSSRC)) {
    const chapter = path.join(TSSRC, name);
    if (!(/^\d+$/.test(name) || name === "common") || !fs.statSync(chapter).isDirectory()) continue;
    fs.cpSync(chapter, path.join(BOOK_OUTPUT_FOLDER, name), {
      recursive: true,
      filter: (file) => !file.split(path.sep).includes("node_modules"),
    });
  }

  // Every demo lives at a uniform depth of one level under tssrc/, and every demo
  // has the same path to the assets folder, so one copy suffices:
  const assetsDest = path.join(BOOK_OUTPUT_FOLDER, "assets");
  console.log("Copying assets into book/assets/...");
  fs.rmSync(assetsDest, { recursive: true, force: true });
  // The folder only exists once a chapter that needs assets has been added
  if (fs.existsSync(ASSETS)) fs.cpSync(ASSETS, assetsDest, { recursive: true });

  // Redirect each demo HTML file's script loader to use demo-embed.js, so we
  // get "click-to-play" instead of a game that loads and runs instantly.
  fs.cpSync(path.join(ASSETS_WEB, "demo-embed.js"), path.join(BOOK_OUTPUT_FOLDER, "demo-embed.js"));
  // Every demo's .html links to this shared stylesheet as "../demo.css"
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
