// "Screenshot" terminal recordings: write a fenced code block as
//
//     ```terminal-mp4
//     ./version-check.mp4
//     Running node, npm, git, and code with --version
//     ```
//
// to get the recording in a terminal window that looks like a
// ```bash-terminal block (see jetlag.css), with its own controls underneath.
// The first line is the path to the .mp4 file, relative to the page that has
// the block.  The second line, if there is one, describes the recording, for
// people who can't see it.
//
// How it works: mdbook turns the block into `<pre><code
// class="language-terminal-mp4">`, and then this script (loaded through
// book.toml's additional-js, like terminal-code.js) swaps each one for a
// `<figure class="terminal-video">`.  There is nothing to install and nothing
// to build.  If the script doesn't run, the reader sees the path, which is a
// readable fallback.
//
// The recording plays once, when it first scrolls into view, and then rests on
// its last frame, which is the finished terminal.  It never loops.  The
// controls are:
//
//   - Rewind: go back to the start, and stop there
//   - Play / Pause: play from where it is (from the start, if it has finished)
//   - Replay: start over, and play
//   - A slider, to go anywhere in the recording
//
// People who have asked their system to reduce motion don't get the
// automatic play.  They see the finished terminal, and can press Play.

(() => {
  /** Little icons, so that the buttons look the same on every system */
  const ICONS = {
    rewind: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4v3l4-4-4-4z"/></svg>',
  };

  /**
   * Format a number of seconds as m:ss
   *
   * @param {number} seconds The time
   * @returns {string} The time, as text
   */
  function clock(seconds) {
    const whole = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  }

  /**
   * Make a control button
   *
   * @param {string} label The name of the button, for screen readers and tool tips
   * @param {string} icon  The icon's markup
   * @returns {HTMLButtonElement} The button
   */
  function makeButton(label, icon) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tv-button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    return button;
  }

  /**
   * Replace one `terminal-mp4` code block with a recording and its controls
   *
   * @param {HTMLElement} block The `<code>` element that mdbook made
   */
  function build(block) {
    const lines = block.textContent.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;
    const src = new URL(lines[0], location.href).href;
    const description = lines[1] || "A recording of a terminal";

    const figure = document.createElement("figure");
    figure.className = "terminal-video";

    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.loop = false;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", description);
    video.disablePictureInPicture = true;

    const bar = document.createElement("div");
    bar.className = "tv-controls";
    const rewind = makeButton("Rewind to the start", ICONS.rewind);
    const toggle = makeButton("Play", ICONS.play);
    const replay = makeButton("Replay from the start", ICONS.replay);
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "tv-slider";
    slider.min = "0";
    slider.max = "1000";
    slider.value = "0";
    slider.setAttribute("aria-label", "Position in the recording");
    const time = document.createElement("span");
    time.className = "tv-time";
    time.textContent = "0:00";
    bar.append(rewind, toggle, replay, slider, time);

    const caption = document.createElement("figcaption");
    caption.className = "tv-caption";
    caption.textContent = description;
    figure.append(video, bar, caption);

    /** Show the play or pause icon, to match what the recording is doing */
    function showState() {
      const playing = !video.paused && !video.ended;
      toggle.innerHTML = playing ? ICONS.pause : ICONS.play;
      toggle.title = playing ? "Pause" : "Play";
      toggle.setAttribute("aria-label", toggle.title);
    }

    /** Move the slider and the clock to where the recording is */
    function showPosition() {
      const duration = video.duration || 0;
      slider.value = duration ? String(Math.round((video.currentTime / duration) * 1000)) : "0";
      time.textContent = `${clock(video.currentTime)} / ${clock(duration)}`;
    }

    /** While it plays, keep the slider moving smoothly (timeupdate is too choppy) */
    function follow() {
      showPosition();
      if (!video.paused && !video.ended) requestAnimationFrame(follow);
    }

    /** Start playing, from the start if it has finished */
    function play() {
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => { });
    }

    let interacted = false;
    rewind.addEventListener("click", () => {
      interacted = true;
      video.pause();
      video.currentTime = 0;
      showState();
      showPosition();
    });
    toggle.addEventListener("click", () => {
      interacted = true;
      if (video.paused || video.ended) play();
      else video.pause();
    });
    replay.addEventListener("click", () => {
      interacted = true;
      video.currentTime = 0;
      play();
    });
    slider.addEventListener("input", () => {
      interacted = true;
      video.currentTime = (Number(slider.value) / 1000) * (video.duration || 0);
      showPosition();
    });
    video.addEventListener("play", () => { showState(); follow(); });
    video.addEventListener("pause", showState);
    video.addEventListener("ended", () => { showState(); showPosition(); });
    video.addEventListener("seeked", showPosition);
    video.addEventListener("loadedmetadata", () => {
      // Don't blow a small recording up until it's blurry
      figure.style.maxWidth = `${video.videoWidth}px`;
      showPosition();
      if (reduceMotion) video.currentTime = video.duration;
    });
    video.addEventListener("error", () => {
      figure.classList.add("tv-failed");
      caption.innerHTML = "";
      caption.append("This recording didn't load.  ");
      const link = document.createElement("a");
      link.href = src;
      link.textContent = "Open it in its own tab";
      caption.append(link, ".");
    });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Play once, the first time that most of it is on screen
    if (!reduceMotion && "IntersectionObserver" in window) {
      const watcher = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          watcher.disconnect();
          if (!interacted) play();
        }
      }, { threshold: 0.6 });
      watcher.observe(figure);
    }

    block.closest("pre").replaceWith(figure);
    showState();
  }

  document.querySelectorAll("code.language-terminal-mp4").forEach(build);
})();
