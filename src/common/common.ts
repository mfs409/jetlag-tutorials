import { Actor, BoxBody, CircleBody, ColorOverlayFilter, FilledBox, FilledRoundedBox, FilterComponent, getAppearance, ImageSprite, KeyCodes, ParticleComponent, Scene, SessionValue, SolidBehavior, SpriteLocation, TextSprite, stage, HealthBehavior, PlayerControlBehavior, TimedEvent } from "jetlag2d";

/** Which level the player is on.  Session storage keeps it as `switchToLevel` moves between levels. */
const LEVEL = new SessionValue<number>("level", () => 1);

/** How loud the game is: 1 for sound, and 0 for muted.  Session storage keeps it as the player moves between screens. */
const VOLUME = new SessionValue<number>("volume", () => 1);

/**
 * Read the "current level" number that `switchToLevel` most recently stashed in
 * session storage
 */
export function currentLevel() {
  return LEVEL.get();
}

/**
 * Switch to `builder`, first stashing `level` in session storage so that
 * `builder` can read it back
 *
 * @param builder The builder to switch to
 * @param level   The level number to make available via `currentLevel()`
 */
export function switchToLevel(builder: () => void, level: number) {
  LEVEL.set(level);
  stage.switchTo(builder);
}

/**
 * Move on to the next level
 *
 * @param builder The builder for the next level
 */
export function nextLevel(builder: () => void) {
  switchToLevel(builder, currentLevel() + 1);
}

/** Everything `endScreen` needs to know */
export interface EndScreenConfig {
  /** The big headline ("You win!") */
  title: string;
  /** An optional line (or several, separated by "\n") under the headline */
  detail?: string;
  /** What to tell the player to do (default: "Click or press Enter to continue") */
  prompt?: string;
  /** What happens when the player clicks or presses Enter (usually a switchTo) */
  next: () => void;
  /** A (usually translucent) background color */
  background?: string;
  /** A color for the title */
  titleColor?: string;
  /** A color for the detail */
  detailColor?: string;
  /** The width of the world, in meters (default 16) */
  width?: number;
  /** The height of the world, in meters (default 9) */
  height?: number;
}

/**
 * Draw a simple end-of-level screen on an overlay.  This requires
 * Arimo-Regular.ttf.  Clicking anywhere (or pressing Enter) clears the overlay
 * and runs `cfg.next`.
 *
 * Use it from a win or lose scene builder, for example:
 *
 *     stage.score.winSceneBuilder = (overlay: Scene) =>
 *       endScreen(overlay, { title: "You win!", next: () => stage.switchTo(builder) });
 *
 * @param overlay The overlay scene to draw on
 * @param cfg     What to show, and what to do next.  For a world that isn't
 *                16 by 9, say how big it is with `width` and `height`.
 */
export function endScreen(overlay: Scene, cfg: EndScreenConfig) {
  const width = cfg.width ?? 16;
  const height = cfg.height ?? 9;
  const go = () => { stage.clearOverlay(); cfg.next(); return true; };
  new Actor({
    appearance: new FilledBox({ width, height, fillColor: cfg.background ?? "#000000cc" }),
    rigidBody: new BoxBody({ cx: width / 2, cy: height / 2, width, height }, { scene: overlay }),
    gestures: { onTap: go },
  });
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 56, color: cfg.titleColor ?? "#ffffff" }, cfg.title),
    rigidBody: new BoxBody({ cx: width / 2, cy: height / 2 - 1.1, width: 0.1, height: 0.1 }, { scene: overlay }),
  });
  // Each detail line is its own centered text, so every line is centered
  const lines = cfg.detail ? cfg.detail.split("\n") : [];
  lines.forEach((line, i) => new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 26, color: cfg.detailColor ?? "#dddddd" }, line),
    rigidBody: new BoxBody({ cx: width / 2, cy: height / 2 + 0.1 + 0.5 * i, width: 0.1, height: 0.1 }, { scene: overlay }),
  }));
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 22, color: "#aaaaaa" }, cfg.prompt ?? "Click or press Enter to continue"),
    rigidBody: new BoxBody({ cx: width / 2, cy: height / 2 + 1.3 + 0.5 * Math.max(0, lines.length - 1), width: 0.1, height: 0.1 }, { scene: overlay }),
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_ENTER, go);
}

// ANCHOR: enable_arrow_key_forces
/**
 * Let the arrow keys (and WASD) push a hero that has a `TiltMovement`.  On a
 * device with a real accelerometer, tilting does the same job, and the keys
 * aren't used.  Holding two keys at once pushes diagonally, with the same
 * strength as a single key.
 *
 * @param xMax  The maximum X force
 * @param yMax  The maximum Y force
 * @param push  How hard a key pushes (default 5)
 */
export function enableArrowKeyForces(xMax: number, yMax: number, push = 5) {
  stage.tilt.tiltMax.Set(xMax, yMax);
  if (!stage.accelerometer.tiltSupported) {
    const held = { l: false, r: false, u: false, d: false };
    // Turn the held keys into a push.  A diagonal is sqrt(2) long, so shrink it
    const update = () => {
      let x = (held.r ? 1 : 0) - (held.l ? 1 : 0);
      let y = (held.d ? 1 : 0) - (held.u ? 1 : 0);
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      stage.accelerometer.accel.Set(x * push, y * push);
    };
    const keys = {
      l: [KeyCodes.KEY_LEFT, KeyCodes.KEY_A],
      r: [KeyCodes.KEY_RIGHT, KeyCodes.KEY_D],
      u: [KeyCodes.KEY_UP, KeyCodes.KEY_W],
      d: [KeyCodes.KEY_DOWN, KeyCodes.KEY_S],
    };
    for (const dir of ["l", "r", "u", "d"] as const) {
      stage.keyboard.setKeyDownHandler(keys[dir], () => { held[dir] = true; update(); });
      stage.keyboard.setKeyUpHandler(keys[dir], () => { held[dir] = false; update(); });
    }
  }
}
// ANCHOR_END: enable_arrow_key_forces

// ANCHOR: bounding_box
/**
 * Draw a bounding box of solid, invisible walls around a rectangular region of the
 * world. The defaults surround a 16x9 world, which is what most of this
 * tutorial's demos use; pass explicit corners for a different-sized world
 * (e.g. `boundingBox(0, 0, 32, 9)` for a 32x9 world).
 *
 * @param left       X coordinate of the region's left edge
 * @param top        Y coordinate of the region's top edge
 * @param right      X coordinate of the region's right edge
 * @param bottom     Y coordinate of the region's bottom edge
 * @param thickness  How thick each wall should be
 *
 * @returns The walls in an object {t, b, l, r}
 */
export function boundingBox(left = 0, top = 0, right = 16, bottom = 9, thickness = 0.1) {
  const width = right - left, height = bottom - top;
  let t = new Actor({
    appearance: new FilledBox({ width, height: thickness, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: (left + right) / 2, cy: top - thickness / 2, width, height: thickness }),
    behaviors: new SolidBehavior(),
  });
  let b = new Actor({
    appearance: new FilledBox({ width, height: thickness, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: (left + right) / 2, cy: bottom + thickness / 2, width, height: thickness }),
    behaviors: new SolidBehavior(),
  });
  let l = new Actor({
    appearance: new FilledBox({ width: thickness, height, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: left - thickness / 2, cy: (top + bottom) / 2, width: thickness, height }),
    behaviors: new SolidBehavior(),
  });
  let r = new Actor({
    appearance: new FilledBox({ width: thickness, height, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: right + thickness / 2, cy: (top + bottom) / 2, width: thickness, height }),
    behaviors: new SolidBehavior(),
  });
  return { t, b, l, r };
}
// ANCHOR_END: bounding_box

/**
 * Draw a mute button
 *
 * Note that in JetLag, volume lives in *session* storage, not persistent
 * storage, because browsers won't actually play audio until the page has
 * received a user gesture, so there's nothing meaningful to remember across a
 * reload.
 *
 * @param cfg         Configuration for how to draw the button
 * @param cfg.cx      The center X coordinate of the button
 * @param cfg.cy      The center Y coordinate of the button
 * @param cfg.width   The width of the button
 * @param cfg.height  The height of the button
 * @param cfg.scene   The scene where the button should be drawn
 */
export function drawMuteButton(cfg: { cx: number, cy: number, width: number, height: number, scene: Scene }) {
  let getVolume = () => VOLUME.get() == 1;
  let mute = new Actor({
    appearance: new ImageSprite({ width: cfg.width, height: cfg.height, img: "audio_off.png" }),
    rigidBody: new BoxBody({ cx: cfg.cx, cy: cfg.cy, width: cfg.width, height: cfg.height }, { scene: cfg.scene }),
  });
  // If the game is not muted, switch the image
  if (getVolume()) getAppearance(mute, ImageSprite).img = "audio_on.png";
  // when the obstacle is touched, switch the mute state and update the picture
  mute.gestures = {
    onTap: () => {
      // volume is either 1 or 0, switch it to the other and save it
      let volume = 1 - VOLUME.get();
      VOLUME.set(volume);
      // mute or unmute all audio
      stage.musicLibrary.muted = volume == 0;

      if (getVolume()) {
        getAppearance(mute, ImageSprite).img = "audio_on.png";
      } else {
        getAppearance(mute, ImageSprite).img = "audio_off.png";
      }
      return true;
    },
  };
}

/**
 * Show a full-screen "click to begin" overlay, and run `onReady` only after the
 * player taps it.
 *
 * @param onReady Code to run once the player has clicked/tapped the overlay
 * @param width   The width of the world, in meters (default 16)
 * @param height  The height of the world, in meters (default 9)
 */
export function requireWelcomeClick(onReady: () => void, width = 16, height = 9) {
  stage.requestOverlay((overlay: Scene) => {
    new Actor({
      appearance: new FilledBox({ width, height, fillColor: "#000000" }),
      rigidBody: new BoxBody({ cx: width / 2, cy: height / 2, width, height }, { scene: overlay }),
    });
    new Actor({
      appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 48, color: "#FFFFFF" }, "Click to Begin"),
      rigidBody: new BoxBody({ cx: width / 2, cy: height / 2, width: Math.min(8, width), height: 2 }, { scene: overlay }),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          onReady();
          return true;
        },
      },
    });
  });
}

/**
 * Create an array with a `PlayerControlBehavior` and a `HealthBehavior`,
 * configured so that being defeated (by a `HazardBehavior`, or by calling
 * `.damage()` directly) ends the level. If `mustSurvive` is set, this one
 * hero's defeat immediately loses the level. Otherwise, defeat bumps the
 * `"heroesDefeated"` counter, and a lose condition (registered once, here)
 * loses the level once every hero created so far (`"heroesCreated"`, bumped
 * here too) has been defeated. 
 *
 * The book uses this for its common case.  Your game will probably want a
 * different set of rules, e.g., by combining `PlayerControlBehavior` /
 * `HealthBehavior` / `JumpBehavior` / `CrawlBehavior`.
 *
 * @param cfg.hitPoints         Starting hit points (default 1)
 * @param cfg.mustSurvive       Does the level end immediately if this hero is
 *                              defeated?
 * @param cfg.onHitPointsChange Code to run on any change to hit points
 * @param cfg.team              The team this actor belongs to (default 0)
 */
export function heroBehaviors(cfg: { hitPoints?: number; mustSurvive?: boolean; onHitPointsChange?: (a: Actor) => void; team?: number; } = {}) {
  // Set up a lose condition if any "must survive" hero is defeated. If there's
  // no "mustSurvive" requirement, set a lose condition when all heroes are
  // defeated.
  const mustSurvive = !!cfg.mustSurvive;
  if (mustSurvive) {
    stage.score.addLoseCondition(() => stage.score.counters.get("mustSurviveHeroesDefeated") >= 1);
  } else {
    stage.score.addLoseCondition(() => stage.score.counters.get("heroesDefeated") >= stage.score.counters.get("heroesCreated"));
  }
  // Assume this created a hero, so count its creation
  stage.score.counters.add("heroesCreated", 1);
  // Return an array of behaviors: player control + health.  Also set up the
  // behavior when this hero is defeated.
  return [
    new PlayerControlBehavior({ team: cfg.team }),
    new HealthBehavior({
      hitPoints: cfg.hitPoints,
      onHitPointsChange: cfg.onHitPointsChange,
      onDefeated: () => {
        stage.score.counters.add("heroesDefeated", 1);
        if (mustSurvive)
          stage.score.counters.add("mustSurviveHeroesDefeated", 1);
      },
    }),
  ];
}

// ANCHOR: hud_text
/**
 * Put some text on the HUD, where it stays put while the world scrolls.  The
 * text is a function, so it is asked for new words on every frame, and always
 * says what is true right now.  This requires Arimo-Regular.ttf (or whichever
 * font you name).
 *
 * @param x            The x coordinate of the text, in HUD meters
 * @param y            The y coordinate of the middle of the text
 * @param size         The font size
 * @param color        The HTML hex color of the text
 * @param text         A function that makes the words
 * @param options      Optional extras
 * @param options.center  Is `x` the middle of the text?  If not (the default), it is the left edge
 * @param options.face    The font (default "Arimo Regular")
 * @param options.outline The HTML hex color of an outline, to keep the text readable on any background (default: none)
 */
export function hudText(x: number, y: number, size: number, color: string, text: () => string, options: { center?: boolean, face?: string, outline?: string } = {}) {
  new Actor({
    appearance: new TextSprite({
      center: options.center ?? false,
      face: options.face ?? "Arimo Regular",
      size, color,
      strokeColor: options.outline, strokeWidth: options.outline ? 3 : undefined,
    }, text),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}
// ANCHOR_END: hud_text

// ANCHOR: hud_button
/**
 * A button: a rounded box with a label on it, which does something when it is
 * tapped (or when a key is pressed).  By default it is drawn on the HUD, so it
 * stays put when the camera moves.
 *
 * @param cfg            Configuration for how to draw the button
 * @param cfg.cx         The center X coordinate of the button
 * @param cfg.cy         The center Y coordinate of the button
 * @param cfg.width      The width of the button
 * @param cfg.height     The height of the button
 * @param cfg.label      The words on the button.  A function lets them change (such as "Pause" and "Play")
 * @param cfg.action     What the button does.  Without one, the button is grayed out and does nothing
 * @param cfg.color      The HTML hex color of the button (default "#334155")
 * @param cfg.textColor  The HTML hex color of the words (default "#ffffff")
 * @param cfg.fontSize   The size of the words (default: fits the button's height)
 * @param cfg.face       The font (default "Roboto Black")
 * @param cfg.key        A key that does the same thing as tapping, if any
 * @param cfg.scene      The scene to draw it in (default: the HUD)
 *
 * @returns The button's actor
 */
export function hudButton(cfg: {
  cx: number, cy: number, width: number, height: number, label: string | (() => string), action?: () => void,
  color?: string, textColor?: string, fontSize?: number, face?: string, key?: KeyCodes, scene?: Scene
}) {
  const action = cfg.action;
  const b = new Actor({
    appearance: [
      new FilledRoundedBox({ width: cfg.width, height: cfg.height, radius: Math.min(0.2, cfg.height / 4), fillColor: cfg.color ?? "#334155", lineWidth: 0.05, lineColor: "#ffffff55" }),
      new TextSprite({ center: true, face: cfg.face ?? "Roboto Black", size: cfg.fontSize ?? Math.min(26, cfg.height * 26), color: action ? (cfg.textColor ?? "#ffffff") : "#77728a" }, cfg.label),
    ],
    rigidBody: new BoxBody({ cx: cfg.cx, cy: cfg.cy, width: cfg.width, height: cfg.height }, { scene: cfg.scene ?? stage.hud, collisionsEnabled: false }),
    gestures: action ? { onTap: () => { action(); return true; } } : undefined,
  });
  if (action && cfg.key) stage.keyboard.setKeyDownHandler(cfg.key, action);
  return b;
}
// ANCHOR_END: hud_button

// ANCHOR: later_fn
/**
 * Run some code after a delay.  It's one-shot, and it belongs to the world
 * that's showing when you call it, so it won't fire after a level change.
 *
 * @param seconds How long to wait
 * @param fn      What to do
 *
 * @returns The timed event, in case you want to cancel it
 */
export function later(seconds: number, fn: () => void) {
  return stage.world.timer.addEvent(new TimedEvent(Math.max(0.0001, seconds), false, fn));
}
// ANCHOR_END: later_fn

// ANCHOR: sfx_fn
/**
 * Play a sound, at a pitch
 *
 * @param file   The sound file
 * @param rate   How fast to play it: 1 is normal, and 2 is an octave higher
 * @param volume How loud, from 0 to 1
 */
export function sfx(file: string, rate = 1, volume = 1) {
  const s = stage.musicLibrary.getSound(file);
  if (!s) return;
  const id = s.play();
  s.rate(rate, id);
  s.volume(volume, id);
}
// ANCHOR_END: sfx_fn

// ANCHOR: tween_fn
/** The animations that are running, for each world */
type Tween = { left: number, total: number, step: (t: number) => void, done?: () => void };
const TWEENS = new WeakMap<object, Tween[]>();

/**
 * Animate something.  `step` is called every frame, with how far along the
 * animation is, from 0 to 1, and `done` is called at the end.  Like `later`, a
 * tween belongs to the world that's showing when you call it.
 *
 * @param seconds How long it takes
 * @param step    What to do each frame
 * @param done    What to do at the end
 */
export function tween(seconds: number, step: (t: number) => void, done?: () => void) {
  let running = TWEENS.get(stage.world);
  if (!running) {
    const list: Tween[] = [];
    running = list;
    TWEENS.set(stage.world, list);
    stage.world.repeatEvents.push((dt: number) => {
      // Go through a copy, because a finished tween removes itself from the list
      for (const t of [...list]) {
        t.left -= dt;
        t.step(Math.min(1, 1 - t.left / t.total));
        if (t.left <= 0) { list.splice(list.indexOf(t), 1); t.done?.(); }
      }
    });
  }
  running.push({ left: seconds, total: seconds, step, done });
}
// ANCHOR_END: tween_fn

// ANCHOR: burst_fn
/**
 * A burst of particles, such as sparks or dust, from one spot.  The actor that
 * holds them is removed once even the longest-lived particle is gone.
 *
 * @param x       The x coordinate of the center
 * @param y       The y coordinate of the center
 * @param colors  The HTML hex colors to pick from
 * @param count   How many particles
 * @param options Optional extras
 * @param options.speed    How fast they fly, in meters per second (default 1.5 to 5)
 * @param options.lifetime How long each lasts, in seconds (default 0.3 to 0.8)
 * @param options.size     How big each is, in meters (default 0.06 to 0.16)
 * @param options.z        Which z index to draw them at (default 2)
 */
export function burst(x: number, y: number, colors: string[], count: number, options: { speed?: { min: number, max: number }, lifetime?: { min: number, max: number }, size?: { min: number, max: number }, z?: -2 | -1 | 0 | 1 | 2 | 3 } = {}) {
  const lifetime = options.lifetime ?? { min: 0.3, max: 0.8 };
  const p = new ParticleComponent({ colors, speed: options.speed ?? { min: 1.5, max: 5 }, lifetime, size: options.size ?? { min: 0.06, max: 0.16 }, fade: true, z: options.z ?? 2 });
  const a = new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
  p.burst(count);
  later(lifetime.max + 0.2, () => a.remove());
}
// ANCHOR_END: burst_fn

// ANCHOR: hud_bar
/**
 * A bar that fills up and empties out, such as for health, power, or time left.
 * The fill shrinks toward the left edge, and it follows `value` on every frame.
 * By default it is drawn on the HUD.
 *
 * @param cfg            Configuration for how to draw the bar
 * @param cfg.cx         The center X coordinate of the bar
 * @param cfg.cy         The center Y coordinate of the bar
 * @param cfg.width      The width of the bar when it is full
 * @param cfg.height     The height of the bar
 * @param cfg.value      A function that says how full the bar is, from 0 to 1
 * @param cfg.color      The HTML hex color of the fill (default "#4cbf6a")
 * @param cfg.lowColor   The HTML hex color of the fill once `value` is below `cfg.lowBelow` (default: no change)
 * @param cfg.lowBelow   Below this fullness, use `lowColor` (default 0.3)
 * @param cfg.backColor  The HTML hex color behind the fill (default "#000000aa")
 * @param cfg.trail      The HTML hex color of a trail that slowly catches up after the bar drops (default: no trail)
 * @param cfg.scene      The scene to draw it in (default: the HUD)
 *
 * @returns The bar's actor
 */
export function hudBar(cfg: { cx: number, cy: number, width: number, height: number, value: () => number, color?: string, lowColor?: string, lowBelow?: number, backColor?: string, trail?: string, scene?: Scene }) {
  const pad = Math.min(0.05, cfg.height / 6);
  const w = cfg.width - 2 * pad, h = cfg.height - 2 * pad;
  const trail = cfg.trail ? new FilledBox({ width: w, height: h, fillColor: cfg.trail, z: 1 }) : undefined;
  const fill = new FilledBox({ width: w, height: h, fillColor: cfg.color ?? "#4cbf6a", z: 2 });
  const scene = cfg.scene ?? stage.hud;
  const bar = new Actor({
    appearance: [new FilledBox({ width: cfg.width, height: cfg.height, fillColor: cfg.backColor ?? "#000000aa", z: 0 }), ...(trail ? [trail] : []), fill],
    rigidBody: new BoxBody({ cx: cfg.cx, cy: cfg.cy, width: cfg.width, height: cfg.height }, { scene, collisionsEnabled: false }),
  });
  scene.repeatEvents.push((dt: number) => {
    const v = Math.min(1, Math.max(0, cfg.value()));
    // A FilledBox grows from its center, so shift it to keep its left edge still
    const target = Math.max(0.001, w * v);
    fill.width = target;
    fill.offset = { dx: -(w - target) / 2, dy: 0 };
    if (cfg.lowColor) fill.fillColor = v < (cfg.lowBelow ?? 0.3) ? cfg.lowColor : (cfg.color ?? "#4cbf6a");
    if (trail) {
      // The trail falls slowly (a bit more than a full bar every two seconds), but jumps up with the fill
      trail.width = Math.max(target, trail.width - w * 0.5 * dt);
      trail.offset = { dx: -(w - trail.width) / 2, dy: 0 };
    }
  });
  return bar;
}
// ANCHOR_END: hud_bar

// ANCHOR: fade_fns
/** A layer of black that gets more or less opaque, a little every frame */
class ScreenFade implements FilterComponent {
  private filter = new ColorOverlayFilter({ color: 0x000000, alpha: 1 });
  public enabled = true;
  private elapsed = 0;
  constructor(private from: number, private to: number, private ms: number) { this.filter.alpha = from; }
  getFilters() { return [this.filter]; }
  preRender(elapsedMs: number) {
    this.elapsed = Math.min(this.ms, this.elapsed + elapsedMs);
    this.filter.alpha = this.from + (this.to - this.from) * (this.elapsed / this.ms);
    return this.enabled;
  }
}

/**
 * Start the screen black, and fade to the game.  Call it when you build a level.
 *
 * @param ms How many milliseconds the fade takes (default 600)
 */
export function fadeIn(ms = 600) {
  stage.renderer.addFilter(new ScreenFade(1, 0, ms), SpriteLocation.WORLD);
  stage.renderer.addFilter(new ScreenFade(1, 0, ms), SpriteLocation.HUD);
}

/**
 * Fade the screen to black, and then do something (usually switch to another
 * level).  The screen stays black until the level changes.
 *
 * @param then What to do once the screen is black
 * @param ms   How many milliseconds the fade takes (default 600)
 */
export function fadeOut(then: () => void, ms = 600) {
  stage.renderer.addFilter(new ScreenFade(0, 1, ms), SpriteLocation.WORLD);
  stage.renderer.addFilter(new ScreenFade(0, 1, ms), SpriteLocation.HUD);
  later(ms / 1000, then);
}
// ANCHOR_END: fade_fns

// ANCHOR: required
/**
 * Get a value that has to be there.  Looking something up (with a Map's `get`,
 * an array's `find`, or `pop`) gives you `undefined` when it isn't there.  If
 * you know that it must be, `required` says so, and if you're wrong, you get a
 * message that says what was missing, and not a crash somewhere else.
 *
 * @param value What the lookup gave you
 * @param what  A few words about what you were looking for, for the message
 *
 * @returns `value`, which is now known not to be `undefined`
 */
export function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing: ${what}`);
  return value;
}
// ANCHOR_END: required

/**
 * Get the keys of an object, with their proper type.  (`Object.keys` only says
 * that they are strings.)
 *
 * @param obj The object whose keys you want
 *
 * @returns The keys
 */
export function keysOf<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Blend two colors
 *
 * @param a   An HTML hex color like "#ff0000"
 * @param b   Another HTML hex color
 * @param pct How far to go from `a` toward `b`, from 0 (all `a`) to 1 (all `b`)
 *
 * @returns The blended color, as an HTML hex color
 */
export function mixColor(a: string, b: string, pct: number) {
  pct = Math.min(1, Math.max(0, pct));
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - pct) + parseInt(b.slice(i, i + 2), 16) * pct);
    out += v.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Show a short message in the world, like "+10" or "Too fast!", that goes away
 * on its own
 *
 * @param cx      The x coordinate of the middle of the message
 * @param cy      The y coordinate of the middle of the message
 * @param message The message
 * @param cfg     Optional: the HTML hex `color` (white by default), the `size`
 *                of the text (20), and how many `seconds` it stays (0.9)
 */
export function floatingText(cx: number, cy: number, message: string, cfg: { color?: string, size?: number, seconds?: number } = {}) {
  const t = new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: cfg.size ?? 20, color: cfg.color ?? "#ffffff", strokeColor: "#000000", strokeWidth: 3, z: 2 }, message),
    rigidBody: new BoxBody({ cx, cy, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(cfg.seconds ?? 0.9, false, () => t.remove()));
}
