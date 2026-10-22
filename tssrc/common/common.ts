import { Actor, BoxBody, FilledBox, getAppearance, ImageSprite, KeyCodes, Scene, SessionValue, SolidBehavior, TextSprite, stage, HealthBehavior, PlayerControlBehavior } from "../jetlag";

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
 * Let the arrow keys push a hero that has a `TiltMovement`.  On a device with
 * a real accelerometer, tilting does the same job, and the keys aren't used.
 *
 * @param xMax  The maximum X force
 * @param yMax  The maximum Y force
 */
export function enableArrowKeyForces(xMax: number, yMax: number) {
  stage.tilt.tiltMax.Set(xMax, yMax);
  if (!stage.accelerometer.tiltSupported) {
    stage.keyboard.setKeyUpHandler(
      [KeyCodes.KEY_UP, KeyCodes.KEY_DOWN],
      () => (stage.accelerometer.accel.y = 0),
    );
    stage.keyboard.setKeyUpHandler(
      [KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT],
      () => (stage.accelerometer.accel.x = 0),
    );
    stage.keyboard.setKeyDownHandler(
      KeyCodes.KEY_UP,
      () => (stage.accelerometer.accel.y = -5),
    );
    stage.keyboard.setKeyDownHandler(
      KeyCodes.KEY_DOWN,
      () => (stage.accelerometer.accel.y = 5),
    );
    stage.keyboard.setKeyDownHandler(
      KeyCodes.KEY_LEFT,
      () => (stage.accelerometer.accel.x = -5),
    );
    stage.keyboard.setKeyDownHandler(
      KeyCodes.KEY_RIGHT,
      () => (stage.accelerometer.accel.x = 5),
    );
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
