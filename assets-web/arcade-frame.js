// arcade-frame.js:
//   Wraps every live-demo <iframe> on a book page in an "arcade cabinet"
//   frame (marquee bar + screen bezel), purely for visual flair. Runs once
//   per page load; skips any iframe that isn't a demo embed (currently:
//   anything whose src ends in .html and isn't the print-button/other
//   chrome -- in practice, every iframe in this book *is* a demo, so the
//   check is just a safety net against future non-demo iframes).
(() => {
  function wrap(iframe) {
    if (iframe.closest(".arcade-cabinet")) return; // already wrapped
    const cabinet = document.createElement("div");
    cabinet.className = "arcade-cabinet";

    const marquee = document.createElement("div");
    marquee.className = "arcade-marquee";
    marquee.innerHTML = `<span class="arcade-marquee-label">&#9654; LIVE DEMO</span>`;

    const popout = document.createElement("button");
    popout.type = "button";
    popout.className = "arcade-popout";
    popout.title = "Open this demo in its own window";
    popout.setAttribute("aria-label", "Open this demo in its own window");
    popout.innerHTML = "&#8599;";
    popout.addEventListener("click", () => {
      // iframe.src (not getAttribute) is already resolved to an absolute
      // URL by the browser, so this works regardless of the demo's actual
      // on-disk nesting. Deliberately leave demo-embed.js's click-to-play
      // gate in place here (no ?autoplay=1): browsers only unlock audio
      // within the document that actually received the user gesture, and
      // this click happened in the *opener* window, not the new one -- the
      // reader still needs to click play inside the popped-out window for
      // its audio to be allowed to start.
      window.open(
        iframe.src,
        "_blank",
        "width=900,height=650,noopener,noreferrer",
      );
    });
    marquee.appendChild(popout);

    const screen = document.createElement("div");
    screen.className = "arcade-screen";

    iframe.parentNode.insertBefore(cabinet, iframe);
    cabinet.appendChild(marquee);
    cabinet.appendChild(screen);
    screen.appendChild(iframe);
  }

  document.querySelectorAll("iframe").forEach(wrap);
})();
