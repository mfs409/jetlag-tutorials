# JetLag Tutorials

This branch contains the content that is specific to the JetLag Tutorials book/website.

## Organization

The book is split into two parallel trees.
Each chapter gets a folder in each of those trees.

- `tssrc` holds `.ts` and `.html` files that are used to make the game(s) for each chapter.
  It also has the shared `common` and `assets` folders used by the games.
- `mdsrc` holds markdown files that are used to generate the book.
  It also has images that are used by the book.
  SUMMARY.md, the table of contents, is also in `mdsrc`.
  Note that markdown files can include code files, using paths like `{{#include ../../tssrc/XX/file.ts:anchor}}`.

The other folders (`scripts`, `raw_assets`, `assets-web`) are used to build the book, and shouldn't be particularly interesting.

## Before You Begin: Setting Up Symlinks

(Note: these instructions have only been tested on Linux.)

- Check out this branch as a folder called `jetlag-tutorials`
- Check out the JetLag main branch as a peer folder to this folder.
  Call it `jetlag-main`
- Create two symlinks into `jetlag-main`:
    - `cd tssrc`
    - `ln -s ../../jetlag-main/src/jetlag jetlag`
    - `ln -s ../../jetlag-main/src/jetlag.ts jetlag.ts`
    - `cd ..`

## Before You Begin: Setting Up `mdbook`

This guide assumes that you have installed `mdbook`, `mdbook-admonish`, `mdbook-katex`, `mdbook-mermaid`, and `mdbook-chapter-zero` globally.

- See <https://github.com/badboy/mdbook-mermaid> for help setting up and using the mermaid plugin
- See <https://github.com/tommilligan/mdbook-admonish> for help setting up and using the admonish plugin
- See <https://crates.io/crates/mdbook-chapter-zero> for help setting up and using the mdbook-chapter-zero plugin

You will also need to have `npm` and `node.js` installed.
You should be able to type `npm install` in the top-level folder to get all of the dependencies for building/running the example code.

## Building the Book

`npm run build` (`scripts/main.mjs`) does all the work, in two steps:

- `mdbook build -d book .` transforms markdown into HTML.
  Mdbook only sees `mdsrc`, so the build script copies each chapter's `.ts` and `.html` files from `tssrc` into `book/`, next to the rendered pages, so that the pages can link to them.
- It then finds every `.ts` file under `tssrc/` that has a `.html` file with the same name, and bundles all of them in a single `esbuild` call, with real TypeScript module resolution and code-splitting.
  esbuild keeps each demo's own `game.js` small (10-30KB, not ~3MB).
  They share the framework chunks.
  The build also copies `tssrc/assets/` to `book/assets/`.

The process is fast enough that there's no need for serving individual chapters.
Just re-run `npm run build` and then serve `book/` (e.g. `npx http-server book`).

### A Note on Shared Folders

Many games make use of code in a shared folder, `common`, and assets in a shared folder, `assets`.
The games in `tssrc` are organized with the same hierarchy as the students should have in their repositories.
This means `assets` and `common` are siblings of each game's folder, and all includes are relative (`../assets`, `../common`).
This should keep the code shown in the book consistent with the code the students write, and consistent with the code used to generate the live demos.
