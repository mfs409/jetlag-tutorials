// "Screenshot" terminal listings: write a fenced code block as
// ```bash-terminal instead of ```bash to get real bash syntax highlighting
// (via this alias) PLUS the black-background terminal look (see the
// `pre code.language-bash-terminal` rules in jetlag.css) -- a plain ```bash
// block keeps its normal, non-terminal appearance.
//
// mdbook's fixed <script> order is always highlight.js, then book.js, THEN
// every additional-js file (this one included) -- book.js's own
// highlighting call runs synchronously, at script-execution time, not on
// DOMContentLoaded, so by the time this file runs, book.js has ALREADY
// tried (and, for an unregistered language, failed) to highlight every
// code block on the page. Registering the alias here is too late for
// book.js's own pass -- so this re-highlights the affected blocks itself,
// after registering the alias, instead of relying on book.js to do it.
hljs.registerAliases(["bash-terminal"], { languageName: "bash" });

document.querySelectorAll("code.language-bash-terminal").forEach((block) => {
  // Collapse back to plain text first -- undoes whatever, if anything,
  // book.js's failed highlight attempt left behind. mdbook's bundled
  // highlight.js is the older v9-style API (book.js itself calls
  // `hljs.highlightBlock`, not the newer `highlightElement`), which has no
  // "already highlighted this node" guard to clear first.
  block.textContent = block.textContent;
  block.classList.remove("hljs");
  hljs.highlightBlock(block);
  block.classList.add("hljs");
});
