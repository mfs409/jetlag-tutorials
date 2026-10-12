// demo-embed.js:
//   Shared, non-module script referenced by every game_NN.html in the built
//   book (see scripts/main.mjs, which rewrites each demo's own
//   `<script type="module" src="./game_NN.js">` to point here instead).
//
// Why: with ~150 demos, each one an `<iframe>` embed, two problems show up
// repeatedly across the book:
//   1. Multiple live demos on one page (e.g. a chapter with 3 iframes) run
//      simultaneously and fight for keyboard focus -- jarring to read.
//   2. Every demo starts running immediately on load, with no chance for
//      the reader to get oriented first -- and a "click to start" gate
//      belongs in the *page*, not in the game's own code, since some
//      chapters are specifically teaching gesture/tap handling and a
//      built-in overlay would get in the way of that lesson.
//
// The fix for both is the same: don't load the actual game module until the
// reader clicks a button. Until then, show a plain placeholder instead. A page
// full of inert placeholders-with-play-buttons isn't jarring (1), and the gate
// itself is plain HTML/JS living here, entirely outside game.ts (2).
(() => {
  const path = location.pathname;
  const base = path.slice(path.lastIndexOf("/") + 1).replace(/\.html?$/, "");

  function loadGame() {
    const s = document.createElement("script");
    s.type = "module";
    s.src = `./${base}.js`;
    document.body.appendChild(s);
  }

  const player = document.getElementById("game-player");
  // If a demo's HTML doesn't have the usual #game-player div, don't gate it
  // -- just load the game the old way, rather than silently breaking it.
  if (!player) {
    loadGame();
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .jl-gate { position: relative; max-width: 100%; }
    .jl-gate .jl-placeholder {
      width: 100%; aspect-ratio: 16 / 9; background: #000;
      border: 2px dashed #888; box-sizing: border-box;
      display: flex; align-items: center; justify-content: center;
      color: #888; font-family: sans-serif; font-size: 1rem; text-align: center;
    }
    .jl-gate button {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 1.3rem; padding: 0.6em 1.2em; cursor: pointer;
      background: rgba(0,0,0,0.75); color: #fff; border: 2px solid #fff; border-radius: 8px;
    }
    .jl-gate button:hover { background: rgba(0,0,0,0.9); }
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.className = "jl-gate";

  const placeholder = document.createElement("div");
  placeholder.className = "jl-placeholder";
  placeholder.textContent = "(click to play)";
  gate.appendChild(placeholder);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "▶ Click to Play";
  btn.addEventListener("click", () => {
    gate.remove();
    player.style.display = "";
    loadGame();
  });
  gate.appendChild(btn);

  player.style.display = "none";
  player.parentNode.insertBefore(gate, player);
})();
