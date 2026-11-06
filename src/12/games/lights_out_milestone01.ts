import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, GoalBehavior, ImageSprite, initializeAndLaunch, JetLagGameConfig, KeyCodes, ParticleComponent, PlayerControlBehavior, Scene, SpriteLocation, stage, TextSprite, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { endScreen, hudText } from "../common/common";
import { WORLD, LIGHT_RADIUS, Gray, END_STYLE, wall, floor } from "./helpers";

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "alien.json", "inv_alien.json", "radial.png"],
  };
}
// ANCHOR_END: config

/**
 * MILESTONE 1 for Lights Out: the hero walks in all eight directions.  The comments say what each remaining piece needs.
 */

/** Build the house, and everything in it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1a1522";
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: WORLD.w, maxY: WORLD.h });
  // ANCHOR: juice_flag
  // Is the "juice" on?  The J key turns it off, to show what it adds
  let juice = true;
  // ANCHOR_END: juice_flag
  let hp = 3, hurtUntil = 0;
  // ANCHOR: lights_flag
  let lightsOut = false;
  // ANCHOR_END: lights_flag
  let hint = "Find the four relics.  Watch the ghosts' hands.";
  // ANCHOR: candle_list
  // The flames of every candle, so that J can turn them off
  const candles: ParticleComponent[] = [];
  // ANCHOR_END: candle_list

  // ANCHOR: filters_setup
  // Filters: a fade-in to start, and grayscale for the last heart
  // TODO (Filters): The game starts all at once.  Fade it in from black: `stage.renderer.addFilter` takes a `Fade` (from `helpers.ts`: from 1, to 0, over 900 milliseconds) and `SpriteLocation.WORLD`.
  const gray = new Gray();
  stage.renderer.addFilter(gray, SpriteLocation.WORLD);
  // ANCHOR_END: filters_setup

  // --- The house -----------------------------------------------------------
  floor(0, 0, WORLD.w, WORLD.h, "#2b2233");
  floor(10.5, 0, 21.5, 18, "#2f2438");
  const walls = [
    { l: 0, t: 0, r: 32, b: 0.4 }, { l: 0, t: 17.6, r: 32, b: 18 }, { l: 0, t: 0, r: 0.4, b: 18 }, { l: 31.6, t: 0, r: 32, b: 18 },
    { l: 10.3, t: 0, r: 10.7, b: 7 }, { l: 10.3, t: 9.5, r: 10.7, b: 18 },
    { l: 21.3, t: 0, r: 21.7, b: 4 }, { l: 21.3, t: 6.5, r: 21.7, b: 13 }, { l: 21.3, t: 15.5, r: 21.7, b: 18 },
    { l: 0, t: 8.8, r: 4, b: 9.2 }, { l: 6.5, t: 8.8, r: 10.5, b: 9.2 },
    { l: 21.5, t: 8.8, r: 26, b: 9.2 }, { l: 28.5, t: 8.8, r: 32, b: 9.2 },
  ];
  for (const w of walls) wall(w.l, w.t, w.r, w.b);
  const candleSpots = [{ x: 1, y: 1 }, { x: 9.6, y: 1 }, { x: 1, y: 16.8 }, { x: 15.8, y: 0.9 }, { x: 15.8, y: 17.1 }, { x: 22.3, y: 9.8 }, { x: 31, y: 16.8 }, { x: 31, y: 1 }];
  for (const spot of candleSpots) candle(spot.x, spot.y);

  // --- The hero: an 8-direction walker, built from 4 directions of art ------
  // ANCHOR: hero_walk
  // ANCHOR: walk_helpers
  /**
   * The walk cycle for one direction: eight frames, 70 milliseconds each
   *
   * @param d The direction of the art: r, l, u, or d
   */
  const walk = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 70, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `alien_walk_${d}_${i}.png`) });
  /**
   * Standing still: one frame, held forever
   *
   * @param d The direction of the art: r, l, u, or d
   */
  const still = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`alien_walk_${d}_0.png`] });
  // ANCHOR_END: walk_helpers
  // ANCHOR: blink_def
  // Idling, facing the camera, the hero blinks.  The frames of one animation
  // don't all have to last the same time.
  // TODO (Blinking): The hero stares without blinking.  An `AnimationSequence` can be built a frame at a time (`.to(image, milliseconds)`), so that the frames don't all last the same time: 2.2 seconds of
  // "alien_walk_d_0.png", then 110 milliseconds of "alien_cast_d_1.png", then 300 of "alien_walk_d_0.png", and 110 of "alien_cast_d_1.png" again.
  const idleDown = still("d");
  // ANCHOR_END: blink_def
  // ANCHOR: hero_sprite
  const heroSprite = new AnimatedSprite({
    width: 1.6, height: 1.6, offset: { dx: 0, dy: -0.35 },
    animations: new Map([
      [AnimationState.WALK_E, walk("r")], [AnimationState.WALK_W, walk("l")], [AnimationState.WALK_N, walk("u")], [AnimationState.WALK_S, walk("d")],
      [AnimationState.IDLE_E, still("r")], [AnimationState.IDLE_W, still("l")], [AnimationState.IDLE_N, still("u")], [AnimationState.IDLE_S, idleDown],
    ]),
    // Diagonals reuse the east/west animations (the same objects, so
    // switching between them doesn't restart the animation)
    remap: new Map([
      [AnimationState.WALK_NE, AnimationState.WALK_E], [AnimationState.WALK_SE, AnimationState.WALK_E],
      [AnimationState.WALK_NW, AnimationState.WALK_W], [AnimationState.WALK_SW, AnimationState.WALK_W],
      [AnimationState.IDLE_NE, AnimationState.IDLE_E], [AnimationState.IDLE_SE, AnimationState.IDLE_E],
      [AnimationState.IDLE_NW, AnimationState.IDLE_W], [AnimationState.IDLE_SW, AnimationState.IDLE_W],
    ]),
  });
  // ANCHOR_END: hero_sprite
  // ANCHOR: hurt_ring
  // A red ring around the hero, which flashes while the hero can't be hurt
  const hurtRing = new FilledCircle({ radius: 0.5, fillColor: "#00000000" });
  // ANCHOR_END: hurt_ring
  const hero = new Actor({
    // ANCHOR: hero_look
    appearance: [hurtRing, heroSprite],
    // ANCHOR_END: hero_look
    rigidBody: new CircleBody({ cx: 5.2, cy: 13.5, radius: 0.35 }, { disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  // ANCHOR_END: hero_walk
  /** Which of the four direction keys (arrows or WASD) are down right now */
  const held = { l: false, r: false, u: false, d: false };
  /**
   * Keep track of whether a direction is being held
   *
   * @param keys The keys that mean this direction
   * @param k    Which direction
   */
  const bind = (keys: KeyCodes[], k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
  };
  bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
  bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
  // ANCHOR: facing_var
  // Which way the hero is facing, which is where the flashlight points
  let facing = { x: 0, y: 1 };
  // ANCHOR_END: facing_var
  // ANCHOR: juice_key
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_J, () => {
    juice = !juice;
    candles.forEach(c => (juice ? c.startEmitting(18) : c.stopEmitting()));
    if (!juice) gray.enabled = false; else gray.enabled = hp == 1;
  });
  // ANCHOR_END: juice_key

  // ANCHOR: camera_shake
  // --- Camera: driven by hand every frame, so a shake can be added on top ---
  // `setCameraFocus` would recompute the camera's center every frame, and
  // leave no room for a jiggle.  So a timer that runs every frame puts the
  // camera on the hero, and adds a random offset while a shake is going on.
  let shakeUntil = 0, shakeSize = 0;
  /**
   * Shake the camera for a moment
   *
   * @param ms   How long to shake, in milliseconds
   * @param size How far, in meters, the camera can be thrown from the hero
   */
  const shake = (ms: number, size: number) => { shakeUntil = stage.renderer.now + ms; shakeSize = size; };
  stage.world.timer.addEvent(new TimedEvent(0.0001, true, () => {
    const c = hero.rigidBody.getCenter();
    const j = juice && stage.renderer.now < shakeUntil ? shakeSize : 0;
    // TODO (Shake and flash): A shake just throws the camera to one side.  Throw it a random distance (up to `j`) in x and in y, in either direction, every frame: `stage.random.next()` is between 0 and 1.
    stage.world.camera.setCenter({ x: c.x + j, y: c.y });
  }));
  // ANCHOR_END: camera_shake

  // ANCHOR: flashlight
  // --- The flashlight: a huge black image with a soft hole in the middle ----
  // The image is mostly black, and its clear hole is small, so the image is
  // drawn about 30 times as wide as the light is.
  const darkness = new Actor({
    appearance: new ImageSprite({ width: LIGHT_RADIUS * 30.25, height: LIGHT_RADIUS * 17, img: "radial.png", z: 2 }),
    rigidBody: new BoxBody({ cx: -100, cy: -100, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  /** The center of the flashlight beam: a little ahead of the hero, in the direction it faces */
  const lightCenter = () => {
    const c = hero.rigidBody.getCenter();
    return { x: c.x + facing.x * 1.5, y: c.y + facing.y * 1.5 };
  };
  // ANCHOR_END: flashlight

  stage.world.repeatEvents.push(() => {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    // ANCHOR: facing_tick
    if (dx || dy) { const len = Math.hypot(dx, dy); facing = { x: dx / len, y: dy / len }; }
    // ANCHOR_END: facing_tick
    hero.rigidBody.setVelocity(dx * 4.2, dy * 4.2);
    // ANCHOR: light_follow
    // TODO (Lights out): The darkness stays where it started, off the screen, so the lights go out, and nothing gets dark.  Once the lights are out (`lightsOut`), put the center of the `darkness`
    // at the center of the flashlight beam (`lightCenter()`) on every frame.
    // ANCHOR_END: light_follow
    // ANCHOR: flash_tick
    const invulnerable = stage.renderer.now < hurtUntil;
    hurtRing.fillColor = invulnerable && juice && Math.floor(stage.renderer.now / 90) % 2 == 0 ? "#ff3b3b66" : "#00000000";
    // ANCHOR_END: flash_tick
  });

  // ANCHOR: burst_fn
  // --- Particles -------------------------------------------------------------
  /**
   * A one-time burst of particles
   *
   * @param x      The x coordinate of the center of the burst
   * @param y      The y coordinate of the center of the burst
   * @param colors The HTML hex colors to pick from
   * @param count  How many particles
   */
  const burst = (x: number, y: number, colors: string[], _count: number) => {
    // ANCHOR: burst_guard
    if (!juice) return;
    // ANCHOR_END: burst_guard
    const p = new ParticleComponent({ colors, speed: { min: 1, max: 3.5 }, lifetime: { min: 0.3, max: 0.8 }, size: { min: 0.05, max: 0.14 }, fade: true, z: 1 });
    new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
    // TODO (Particles): Nothing comes out of the `ParticleComponent`.  Ask it for a burst (`p.burst(count)`), and after a second, when even the longest-lived particle is gone, remove the actor that held it
    // (keep the actor, in a variable, and use a one-shot timer).  Rename `_count` when you use it.
  };
  // ANCHOR_END: burst_fn

  // --- Getting hurt ----------------------------------------------------------
  /** The hero got hit: lose a heart, and be safe for a moment */
  const hurt = () => {
    if (stage.renderer.now < hurtUntil) return;
    hp -= 1;
    hurtUntil = stage.renderer.now + 1200;
    // ANCHOR: hurt_shake
    shake(350, 0.35);
    // ANCHOR_END: hurt_shake
    // ANCHOR: hurt_burst
    const c = hero.rigidBody.getCenter();
    burst(c.x, c.y, ["#ff3b3b", "#ffffff"], 30);
    // ANCHOR_END: hurt_burst
    // ANCHOR: hurt_gray
    if (hp == 1 && juice) gray.enabled = true;
    // ANCHOR_END: hurt_gray
    if (hp <= 0) stage.score.loseLevel();
  };

  // --- Relics, the lights going out, and the exit ----------------------------
  const relicSpots = [{ x: 3, y: 3 }, { x: 7.5, y: 15.5 }, { x: 16, y: 3.5 }, { x: 27, y: 14 }];
  for (const spot of relicSpots) {
    new Actor({
      appearance: [new FilledCircle({ radius: 0.42, fillColor: "#6bd6ff33" }), new FilledCircle({ radius: 0.22, fillColor: "#6bd6ff", lineWidth: 0.04, lineColor: "#ffffff" })],
      rigidBody: new CircleBody({ cx: spot.x, cy: spot.y, radius: 0.35 }),
      behaviors: new CollectableBehavior({
        onCollect: () => {
          stage.score.counters.add("relics", 1);
          // ANCHOR: relic_burst
          burst(spot.x, spot.y, ["#6bd6ff", "#ffffff", "#b388ff"], 40);
          // ANCHOR_END: relic_burst
          const n = stage.score.counters.get("relics");
          // ANCHOR: relic_lights
          if (n == 2) lightsGoOut();
          // ANCHOR_END: relic_lights
          hint = n < 4 ? `${4 - n} relics left.` : "All four!  Get to the front door (top right)!";
          return true;
        },
      }),
    });
  }
  // ANCHOR: lights_out_fn
  /** The second relic: the lights flicker, and go out for good */
  function lightsGoOut() {
    hint = "The lights went out!  Ghosts freeze in your flashlight beam.";
    // ANCHOR: lights_shake
    shake(500, 0.2);
    // ANCHOR_END: lights_shake
    // Flicker, then darkness
    const flick = [0, 120, 200, 330, 420, 600];
    flick.forEach((t, i) => stage.world.timer.addEvent(new TimedEvent(t / 1000 + 0.001, false, () => {
      lightsOut = i % 2 == 0;
      if (!lightsOut) darkness.rigidBody.setCenter(-100, -100);
    })));
    stage.world.timer.addEvent(new TimedEvent(0.7, false, () => (lightsOut = true)));
  }
  // ANCHOR_END: lights_out_fn
  new Actor({
    appearance: [new FilledBox({ width: 1.2, height: 0.6, fillColor: "#6b4a2b", lineWidth: 0.06, lineColor: "#c9a227" }), new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#c9a227" }, "EXIT")],
    rigidBody: new BoxBody({ cx: 30, cy: 0.9, width: 1.2, height: 0.6 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({ onArrival: () => { if (stage.score.counters.get("relics") < 4) return false; stage.score.counters.add("escaped", 1); return true; } }),
  });
  stage.score.addWinCondition(() => stage.score.counters.get("escaped") > 0);

  // --- The ghosts --------------------------------------------------------------
  // ANCHOR: in_light
  /**
   * Is a spot inside the flashlight beam?  (Never, while the lights are on.)
   *
   * @param x The x coordinate of the spot
   * @param y The y coordinate of the spot
   */
  const inLight = (x: number, y: number) => { if (!lightsOut) return false; const l = lightCenter(); return Math.hypot(x - l.x, y - l.y) < LIGHT_RADIUS * 0.7; };
  // ANCHOR_END: in_light
  const ghostSpawns = [{ x: 6, y: 4, speed: 1 }, { x: 16, y: 13, speed: 1.1 }, { x: 26, y: 4, speed: 1.2 }, { x: 15, y: 7, speed: 0.9 }, { x: 27, y: 12, speed: 1.3 }];
  for (const spawn of ghostSpawns) ghost(spawn.x, spawn.y, spawn.speed);

  /**
   * Make one ghost.  It drifts around, until the hero gets close.  Then it
   * winds up, lunges, and rests.
   *
   * @param x0    The x coordinate where the ghost starts, and the middle of where it drifts
   * @param y0    The y coordinate where the ghost starts, and the middle of where it drifts
   * @param drift How fast the ghost drifts, in meters per second
   */
  function ghost(x0: number, y0: number, drift: number) {
    // ANCHOR: ghost_phase
    type Phase = "drift" | "windup" | "lunge" | "rest" | "frozen";
    let phase: Phase = "drift";
    let target = { x: x0, y: y0 }, phaseEnds = 0, lungeDir = { x: 0, y: 0 };
    // ANCHOR_END: ghost_phase
    // ANCHOR: ghost_look
    // ANCHOR: ghost_anims
    /**
     * The art for one of the ghost's actions
     *
     * @param kind Which action: walk, cast, or thrust
     * @param n    How many frames there are
     */
    const frames = (kind: string, n: number) => Array.from({ length: n }, (_, i) => `inv_alien_${kind}_d_${i}.png`);
    // The wind-up is the "tell": it starts slow, then snaps forward
    const windup = new AnimationSequence(false);
    frames("cast", 7).forEach((f, i) => windup.to(f, [260, 200, 160, 110, 80, 60, 60][i]));
    const float = AnimationSequence.makeSimple({ timePerFrame: 140, repeat: true, images: frames("walk", 9) });
    const anims = new Map([
      // IDLE_E is required as a default; the ghost's floating animation serves
      [AnimationState.IDLE_E, float],
      [AnimationState.IDLE_S, float],
      // The ghost never tosses or punches.  These states are just names that
      // nothing else uses, so they can stand for "winding up" and "lunging".
      [AnimationState.TOSS_IDLE_S, windup],
      [AnimationState.PUNCH_IDLE_S, AnimationSequence.makeSimple({ timePerFrame: 45, repeat: false, images: frames("thrust", 8) })],
      [AnimationState.IDLE_N, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: ["inv_alien_walk_d_0.png"] })],
    ]);
    const sprite = new AnimatedSprite({ width: 1.6, height: 1.6, animations: anims, offset: { dx: 0, dy: -0.3 } });
    // TODO (Ghosts): The ghost doesn't show its wind-up.  A sprite's `stateSelector` is a function that says which state, and so which animation, it is in right now.  Make it
    // depend on the ghost's `phase`: `TOSS_IDLE_S` while winding up, `PUNCH_IDLE_S` while lunging, `IDLE_N` while frozen, and `IDLE_S` otherwise.
    // ANCHOR_END: ghost_anims
    const aura = new FilledCircle({ radius: 0.55, fillColor: "#b388ff22" });
    const g = new Actor({
      appearance: [aura, sprite],
      rigidBody: new CircleBody({ cx: x0, cy: y0, radius: 0.45 }, { kinematic: true, collisionsEnabled: false }),
      behaviors: new TouchPlateBehavior({ onEnter: () => { if (phase == "lunge") hurt(); } }),
    });
    // ANCHOR_END: ghost_look
    /**
     * Change what the ghost is doing
     *
     * @param p       The new phase
     * @param seconds How long the phase lasts
     */
    const setPhase = (p: Phase, seconds: number) => {
      phase = p;
      phaseEnds = stage.renderer.now + seconds * 1000;
      // ANCHOR: restart_anim
      // A new phase has a new animation, and it should start from its first frame
      sprite.restartCurrentAnimation();
      // ANCHOR_END: restart_anim
    };
    stage.world.repeatEvents.push(() => {
      const c = g.rigidBody.getCenter(), h = hero.rigidBody.getCenter();
      const toHero = Math.hypot(h.x - c.x, h.y - c.y);
      // ANCHOR: ghost_freeze
      // In the dark, a ghost in the flashlight beam freezes
      if (inLight(c.x, c.y) && phase != "lunge") {
        if (phase != "frozen") setPhase("frozen", 0);
        aura.fillColor = "#6bd6ff44";
        g.rigidBody.setVelocity(0, 0);
        return;
      }
      // ANCHOR_END: ghost_freeze
      // ANCHOR: aura_tint
      aura.fillColor = phase == "windup" ? "#ff3b3b55" : "#b388ff22";
      // ANCHOR_END: aura_tint
      const now = stage.renderer.now;
      if (phase == "frozen") setPhase("rest", 0.4);
      if (phase == "drift") {
        if (Math.hypot(target.x - c.x, target.y - c.y) < 0.3) target = { x: Math.max(1, Math.min(31, x0 + (stage.random.next() - 0.5) * 8)), y: Math.max(1, Math.min(17, y0 + (stage.random.next() - 0.5) * 8)) };
        const d = Math.hypot(target.x - c.x, target.y - c.y) || 1;
        g.rigidBody.setVelocity((target.x - c.x) / d * drift, (target.y - c.y) / d * drift);
        if (toHero < 4.2) { setPhase("windup", 0.93); g.rigidBody.setVelocity(0, 0); }
      } else if (phase == "windup") {
        g.rigidBody.setVelocity(0, 0);
        if (now > phaseEnds) {
          // Lunge at wherever the hero is right now
          lungeDir = { x: (h.x - c.x) / (toHero || 1), y: (h.y - c.y) / (toHero || 1) };
          setPhase("lunge", 0.36);
          g.rigidBody.setVelocity(lungeDir.x * 10, lungeDir.y * 10);
        }
      } else if (phase == "lunge") {
        if (now > phaseEnds) {
          setPhase("rest", 0.9);
          g.rigidBody.setVelocity(0, 0);
          // ANCHOR: lunge_puff
          burst(c.x, c.y, ["#b388ff", "#6b5b95"], 14);
          // ANCHOR_END: lunge_puff
          // ANCHOR: lunge_shake
          shake(120, 0.08);
          // ANCHOR_END: lunge_shake
        }
      } else if (phase == "rest") {
        g.rigidBody.setVelocity(0, 0);
        if (now > phaseEnds) setPhase("drift", 0);
      }
    });
  }

  // --- HUD -------------------------------------------------------------------
  hudText(0.3, 0.1, 26, "#ff6b6b", () => "♥".repeat(Math.max(0, hp)) + "♡".repeat(Math.max(0, 3 - hp)), { outline: "#000000" });
  hudText(2.2, 0.15, 22, "#6bd6ff", () => `Relics: ${stage.score.counters.get("relics")} / 4`, { outline: "#000000" });
  hudText(5.4, 0.15, 20, "#d8cfe8", () => hint, { outline: "#000000" });
  // ANCHOR: juice_hud
  hudText(13.2, 8.4, 18, "#8a7fa0", () => `J: juice ${juice ? "ON" : "off"}`, { outline: "#000000" });
  // ANCHOR_END: juice_hud

  stage.score.winSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: "You escaped the house!", detail: `with ${hp} heart${hp == 1 ? "" : "s"} left`, prompt: "Click or press Enter to try again", next: () => stage.switchTo(builder), ...END_STYLE });
  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: "The ghosts got you", detail: `You found ${stage.score.counters.get("relics")} of 4 relics`, prompt: "Click or press Enter to try again", next: () => stage.switchTo(builder), ...END_STYLE });

  // --- Pieces of the house -------------------------------------------------------
  // ANCHOR: candle_fn
  /**
   * A candle, with a flickering glow and a flame
   *
   * @param x The x coordinate of the center of the candle
   * @param y The y coordinate of the center of the candle
   */
  function candle(x: number, y: number) {
    // ANCHOR: candle_glow
    // Every candle's glow is the same animation, skipped to a random point,
    // so the candles don't all flicker in lockstep
    const glow = new AnimatedSprite({
      width: 0.4, height: 0.4, offset: { dx: 0, dy: -0.3 },
      animations: new Map([[AnimationState.IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 110, repeat: true, images: ["color_star_3.png", "color_star_4.png", "color_star_3.png", "color_star_5.png"] })]]),
    });
    // TODO (Candles): All of the candles flicker together.  Every candle's glow has the same animation: skip each one to a random frame (`glow.skipTo`, which is given a frame number, and how many milliseconds into it).
    // ANCHOR_END: candle_glow
    // ANCHOR: candle_flame
    const flame = new ParticleComponent({ colors: ["#ff7043", "#ffca28", "#ff5252"], angle: -Math.PI / 2, spread: Math.PI / 7, speed: { min: 0.3, max: 0.8 }, lifetime: { min: 0.3, max: 0.6 }, size: { min: 0.03, max: 0.08 }, offset: { dx: 0, dy: -0.35 }, fade: true });
    // ANCHOR_END: candle_flame
    new Actor({
      appearance: [new FilledBox({ width: 0.14, height: 0.4, fillColor: "#efe6d0" }), glow, flame],
      rigidBody: new BoxBody({ cx: x, cy: y, width: 0.14, height: 0.4 }, { collisionsEnabled: false }),
    });
    // ANCHOR: candle_emit
    flame.startEmitting(18);
    // ANCHOR_END: candle_emit
    // ANCHOR: candle_push
    candles.push(flame);
    // ANCHOR_END: candle_push
  }
  // ANCHOR_END: candle_fn
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
