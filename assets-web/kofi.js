// kofi.js:
//   Adds a "Support me" link to every page (via book.toml's additional-js,
//   the same mechanism mermaid-init.js uses for a site-wide include).
//
// This intentionally does NOT use Ko-fi's own overlay-widget.js script.
// That script positions its floating button with its own fixed CSS, which
// on this site ended up rendering on top of mdbook's sidebar instead of
// respecting it -- and it offers no supported way to ask for "top right"
// instead.
//
// It also isn't a free-floating `position: fixed` element of our own
// anymore -- an earlier version was, and it ended up covering mdbook's own
// "Print this book" button, since both wanted the same top-right corner.
// Instead, this appends into mdbook's own `.right-buttons` toolbar (where
// the print button already lives), so it sits in the same row instead of
// on top of anything, and -- for free -- inherits that toolbar's behavior:
// it hides in print (`#menu-bar` is already `display: none` in
// book/css/print.css) and hides/shows along with the rest of the menu bar
// on scroll, instead of needing its own CSS to replicate any of that.
(() => {
  const container = document.querySelector(".right-buttons");
  if (!container) return; // page doesn't have the usual menu bar -- don't break it trying to add one

  const link = document.createElement("a");
  link.href = "https://ko-fi.com/mfs409";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = "Support this book on Ko-fi";
  link.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    padding: 0 0.6em;
    font-size: 1.2rem;
    font-weight: bold;
    color: #00b9fe;
  `;
  link.textContent = "☕ Support me";
  container.appendChild(link);
})();
