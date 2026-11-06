import { Actor, ActorPoolSystem, AnimatedSprite, AnimationSequence, AnimationState, AppearanceComponent, BoxBody, CircleBody, DebugToggle, DIRECTION, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, HazardBehavior, HealthBehavior, JetLagGameConfig, KeyCodes, ParticleComponent, PlayerControlBehavior, ProjectileMovement, PunchBehavior, Scene, SolidBehavior, TextSprite, ThrowableBehavior, TimedEvent, TouchPlateBehavior, getBehavior, initializeAndLaunch, SessionValue, stage } from "jetlag2d";
import { endScreen } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["pirate.json", "lizard.json"],
    soundNames: ["footstep_outside.mp3"],
  };
}

/**
 * MILESTONE 5 for Moonlight Harvest: the lizards all work.
 *
 * TODO (The market): an overlay to sell what you grow, buy seeds and upgrades, and pay off the deed.
 */

const WORLD = { w: 32, h: 18 };
const DAY_LEN = 45, NIGHT_LEN = 35, LAST_DAY = 7, DEED = 150;
const HEARTS = 5;
export const PRICES = { crop: 8, seeds: 10, can: 25, sword: 30 };

/** The stages a plot goes through.  Watered seeds and sprouts grow overnight. */
export const enum Plot { EMPTY, SEED, SEED_WET, SPROUT, SPROUT_WET, RIPE }
// ANCHOR: marker_type
/** Every droplet of water carries one of these in its `data`, so that a plot can tell what touched it */
class DropData {}

/** Every lizard carries one of these in its `data`, so that a plot can tell what touched it */
class LizardData {}

/**
 * Is this actor a droplet of water?  Actors with other data (or none, like the hero) aren't.
 *
 * @param a The actor
 * @returns True if the actor is a droplet
 */
const isDrop = (a: Actor): boolean => a.data instanceof DropData;

/**
 * Is this actor a lizard?  Actors with other data (or none, like the hero) aren't.
 *
 * @param a The actor
 * @returns True if the actor is a lizard
 */
const isLizard = (a: Actor): boolean => a.data instanceof LizardData;
// ANCHOR_END: marker_type
const PLOT_NAMES = ["empty", "seeds", "seeds (wet)", "sprout", "sprout (wet)", "RIPE!"];
const PLOT_SPOTS = [0, 1, 2].flatMap(r => [0, 1, 2, 3].map(c => ({ x: 12.5 + 1.7 * c, y: 6.5 + 1.7 * r })));

/** Places in the world */
const HOUSE = { x: 4.5, y: 4 }, POND = { x: 4.8, y: 13.2 }, STALL = { x: 25.5, y: 5 };

/** Everything that has to survive from one day to the next, and across a G toggle */
class Farm {
  day = 1; clock = 0; coins = 10; seeds = 6; produce = 0;
  water = 8; waterMax = 8; sword = 1; hearts = HEARTS; kills = 0;
  plots: Plot[] = PLOT_SPOTS.map(() => Plot.EMPTY);
  lizardsLeft = 0; graybox = false; hero = { x: 9, y: 5 };
}

/** The farm, in session storage.  The first time that it is read, it is made with the starting values. */
const FARM = new SessionValue<Farm>("farm", () => new Farm());
/** Throw away the farm, and start over */
function newGame() { FARM.clear(); stage.switchTo(builder); }

/** Build the farm, as it is right now.  The whole game is one builder, because the farm is kept in `f`, which survives a rebuild. */
function builder() {
  DebugToggle.enable();
  const f = FARM.get();
  const night = () => f.clock >= DAY_LEN;
  stage.backgroundColor = f.graybox ? "#e4e6ea" : "#6ab04c";
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: WORLD.w, maxY: WORLD.h });

  /**
   * Every visible thing goes through `look`: in gray-box mode it becomes a
   * labeled box of the same size, and nothing else about it changes.
   */
  const look = (label: string | (() => string), w: number, h: number, art: () => AppearanceComponent[]): AppearanceComponent[] =>
    f.graybox
      ? [new FilledBox({ width: w, height: h, fillColor: "#c9ccd1", lineWidth: 0.04, lineColor: "#6b7078" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#222222" }, typeof label == "string" ? label : () => label())]
      : art();

  // --- The farm -------------------------------------------------------------
  const borders = [{ l: -1, t: -1, r: 33, b: 0 }, { l: -1, t: 18, r: 33, b: 19 }, { l: -1, t: 0, r: 0, b: 18 }, { l: 32, t: 0, r: 33, b: 18 }];
  for (const border of borders) solid(border.l, border.t, border.r, border.b);
  if (!f.graybox) grass();
  // The house
  const windowGlow = [new FilledBox({ width: 0.7, height: 0.6, fillColor: "#8fc7e8", offset: { dx: -1.4, dy: 0.2 } }), new FilledBox({ width: 0.7, height: 0.6, fillColor: "#8fc7e8", offset: { dx: 1.4, dy: 0.2 } })];
  new Actor({
    appearance: look("house", 5, 3.2, () => [
      new FilledBox({ width: 5, height: 2.4, fillColor: "#e8d8b8", lineWidth: 0.05, lineColor: "#8a7a5c", offset: { dx: 0, dy: 0.4 } }),
      new FilledPolygon({ vertices: [{ x: -2.9, y: -0.8 }, { x: 0, y: -2.4 }, { x: 2.9, y: -0.8 }], fillColor: "#b5462f", lineWidth: 0.05, lineColor: "#6e2a1c" }),
      new FilledBox({ width: 0.4, height: 0.9, fillColor: "#6e4b2a", offset: { dx: 1.6, dy: -1.9 } }),
      new FilledBox({ width: 0.9, height: 1.3, fillColor: "#7a5634", lineWidth: 0.04, lineColor: "#4d3620", offset: { dx: 0, dy: 0.95 } }),
      ...windowGlow,
    ]),
    rigidBody: new BoxBody({ cx: HOUSE.x, cy: HOUSE.y, width: 5, height: 3.2 }),
    behaviors: new SolidBehavior(),
  });
  // The pond
  new Actor({
    appearance: look("pond (E: refill)", 3.6, 3.6, () => [
      new FilledCircle({ radius: 2.0, fillColor: "#3f8fd2", lineWidth: 0.12, lineColor: "#c9b27a" }),
      new FilledCircle({ radius: 0.35, fillColor: "#3f9e4a", offset: { dx: -0.7, dy: 0.5 } }),
      new FilledCircle({ radius: 0.25, fillColor: "#3f9e4a", offset: { dx: 0.8, dy: -0.4 } }),
      new FilledCircle({ radius: 0.12, fillColor: "#f5a3c7", offset: { dx: -0.6, dy: 0.4 } }),
    ]),
    rigidBody: new CircleBody({ cx: POND.x, cy: POND.y, radius: 1.8 }),
    behaviors: new SolidBehavior(),
  });
  // The market stall, with a striped awning
  new Actor({
    appearance: look("market (E)", 3.4, 2, () => [
      new FilledBox({ width: 3.4, height: 1.2, fillColor: "#a8773f", lineWidth: 0.05, lineColor: "#5e3f1c", offset: { dx: 0, dy: 0.4 } }),
      ...[0, 1, 2, 3, 4, 5].map(i => new FilledBox({ width: 0.62, height: 0.7, fillColor: i % 2 ? "#ffffff" : "#e0463c", offset: { dx: -1.55 + i * 0.62, dy: -0.55 } })),
      new FilledCircle({ radius: 0.22, fillColor: "#f28c28", offset: { dx: -0.9, dy: 0.2 } }),
      new FilledCircle({ radius: 0.22, fillColor: "#f28c28", offset: { dx: -0.5, dy: 0.25 } }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#fff5d6", offset: { dx: 0.6, dy: 0.45 } }, "MARKET"),
    ]),
    rigidBody: new BoxBody({ cx: STALL.x, cy: STALL.y, width: 3.4, height: 2 }),
    behaviors: new SolidBehavior(),
  });
  // The field
  new Actor({
    appearance: look("", 7.4, 5.6, () => [new FilledRoundedBox({ width: 7.4, height: 5.6, radius: 0.4, fillColor: "#8b6b43", z: -1 })]),
    rigidBody: new BoxBody({ cx: 15.05, cy: 8.2, width: 7.4, height: 5.6 }, { collisionsEnabled: false }),
  });
  // The woods around the edges
  const trees = [{ x: 1.2, y: 8 }, { x: 1, y: 10 }, { x: 8, y: 16.9 }, { x: 10.5, y: 17 }, { x: 13, y: 16.8 }, { x: 18, y: 17 }, { x: 22, y: 16.8 }, { x: 26.5, y: 17.1 }, { x: 30.8, y: 15.5 }, { x: 31, y: 12 }, { x: 30.9, y: 9 }, { x: 31.1, y: 2.5 }, { x: 29.5, y: 1 }, { x: 21, y: 1 }, { x: 17.5, y: 0.9 }, { x: 13, y: 1 }, { x: 9.5, y: 1.2 }, { x: 23.5, y: 11.5 }, { x: 9, y: 9.5 }];
  for (const tree of trees) {
    new Actor({
      appearance: look("tree", 1.6, 1.6, () => [
        new FilledCircle({ radius: 0.9, fillColor: "#2e7d32", lineWidth: 0.05, lineColor: "#1b5e20" }),
        new FilledCircle({ radius: 0.45, fillColor: "#43a047", offset: { dx: -0.25, dy: -0.25 } }),
      ]),
      rigidBody: new CircleBody({ cx: tree.x, cy: tree.y, radius: 0.7 }),
      behaviors: new SolidBehavior(),
    });
  }
  // A torch by the stall, so the market is easy to find at night
  const flame = new ParticleComponent({ colors: ["#ff7043", "#ffca28", "#ff5252"], angle: -Math.PI / 2, spread: Math.PI / 7, speed: { min: 0.4, max: 1 }, lifetime: { min: 0.3, max: 0.7 }, size: { min: 0.05, max: 0.12 }, offset: { dx: 0, dy: -0.6 }, fade: true });
  new Actor({
    appearance: look("torch", 0.3, 1.2, () => [new FilledBox({ width: 0.15, height: 1.2, fillColor: "#5b3a29" }), flame]),
    rigidBody: new BoxBody({ cx: STALL.x - 2.2, cy: STALL.y + 0.3, width: 0.2, height: 1.2 }),
    behaviors: new SolidBehavior(),
  });
  if (!f.graybox) flame.startEmitting(20);

  // --- Particles ------------------------------------------------------------
  const burst = (x: number, y: number, colors: string[], count = 20) => {
    if (f.graybox) return;
    const p = new ParticleComponent({ colors, speed: { min: 0.8, max: 2.8 }, lifetime: { min: 0.3, max: 0.7 }, size: { min: 0.05, max: 0.13 }, fade: true, z: 1 });
    const a = new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
    p.burst(count);
    stage.world.timer.addEvent(new TimedEvent(0.8, false, () => a.remove()));
  };
  let toast = "", toastUntil = 0;
  const say = (m: string) => { toast = m; toastUntil = stage.renderer.now + 1800; };

  // --- The plots --------------------------------------------------------------
  const plots = PLOT_SPOTS.map((spot, i) => {
    const soil = new FilledRoundedBox({ width: 1.35, height: 1.35, radius: 0.15, fillColor: "#6b4f2e", lineWidth: 0.04, lineColor: "#4a3520" });
    const seeds = [-0.25, 0, 0.25].map(dx => new FilledCircle({ radius: 0.06, fillColor: "#00000000", offset: { dx, dy: 0.1 } }));
    const leaves = [new FilledPolygon({ vertices: [{ x: 0, y: 0.25 }, { x: -0.35, y: -0.1 }, { x: -0.05, y: -0.05 }], fillColor: "#00000000" }), new FilledPolygon({ vertices: [{ x: 0, y: 0.25 }, { x: 0.35, y: -0.15 }, { x: 0.05, y: -0.05 }], fillColor: "#00000000" })];
    const pumpkin = new FilledCircle({ radius: 0.42, fillColor: "#00000000", lineWidth: 0.04, lineColor: "#00000000" });
    const stem = new FilledBox({ width: 0.1, height: 0.22, fillColor: "#00000000", offset: { dx: 0, dy: -0.45 } });
    const draw = () => {
      const s = f.plots[i];
      soil.fillColor = s == Plot.SEED_WET || s == Plot.SPROUT_WET ? "#4a3520" : "#6b4f2e";
      seeds.forEach(d => (d.fillColor = s == Plot.SEED || s == Plot.SEED_WET ? "#e8d8a0" : "#00000000"));
      leaves.forEach(l => (l.fillColor = s == Plot.SPROUT || s == Plot.SPROUT_WET ? "#5cb85c" : "#00000000"));
      pumpkin.fillColor = s == Plot.RIPE ? "#f28c28" : "#00000000";
      pumpkin.lineColor = s == Plot.RIPE ? "#b35a00" : "#00000000";
      stem.fillColor = s == Plot.RIPE ? "#3f7d2a" : "#00000000";
    };
    new Actor({
      appearance: look(() => PLOT_NAMES[f.plots[i]], 1.35, 1.35, () => [soil, ...seeds, ...leaves, pumpkin, stem]),
      rigidBody: new BoxBody({ cx: spot.x, cy: spot.y, width: 1.35, height: 1.35 }),
      behaviors: new TouchPlateBehavior({
        eligible: (o: Actor) => isDrop(o) || isLizard(o),
        onEnter: (_self: Actor, o: Actor) => {
          if (isDrop(o)) {
            // Water: seeds and sprouts that get watered will grow tonight
            if (f.plots[i] == Plot.SEED) f.plots[i] = Plot.SEED_WET;
            else if (f.plots[i] == Plot.SPROUT) f.plots[i] = Plot.SPROUT_WET;
            burst(spot.x, spot.y, ["#6bc5ff", "#ffffff"], 12);
            reclaim(o);
          } else if (f.plots[i] != Plot.EMPTY) {
            // A lizard tramples whatever was growing here
            f.plots[i] = Plot.EMPTY;
            burst(spot.x, spot.y, ["#8b6b43", "#5cb85c"], 16);
            say("A lizard trampled a crop!");
          }
          draw();
        },
      }),
    });
    draw();
    return { spot, draw };
  });

  // --- The hero ----------------------------------------------------------------
  const walk = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(n => `pirate_walk_${d}_${n}.png`) });
  const still = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_${d}_0.png`] });
  const punchAnim = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 30, repeat: false, images: [0, 2, 4, 6, 7].map(n => `pirate_thrust_${d}_${n}.png`) });
  const tossAnim = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 40, repeat: false, images: [0, 1, 2, 3, 4, 5].map(n => `pirate_slash_s_${d}_${n}.png`) });
  const dirs: { face: string; walk: AnimationState; idle: AnimationState; punch: AnimationState; punchIdle: AnimationState; toss: AnimationState; tossIdle: AnimationState }[] = [
    { face: "u", walk: AnimationState.WALK_N, idle: AnimationState.IDLE_N, punch: AnimationState.PUNCH_N, punchIdle: AnimationState.PUNCH_IDLE_N, toss: AnimationState.TOSS_N, tossIdle: AnimationState.TOSS_IDLE_N },
    { face: "d", walk: AnimationState.WALK_S, idle: AnimationState.IDLE_S, punch: AnimationState.PUNCH_S, punchIdle: AnimationState.PUNCH_IDLE_S, toss: AnimationState.TOSS_S, tossIdle: AnimationState.TOSS_IDLE_S },
    { face: "l", walk: AnimationState.WALK_W, idle: AnimationState.IDLE_W, punch: AnimationState.PUNCH_W, punchIdle: AnimationState.PUNCH_IDLE_W, toss: AnimationState.TOSS_W, tossIdle: AnimationState.TOSS_IDLE_W },
    { face: "r", walk: AnimationState.WALK_E, idle: AnimationState.IDLE_E, punch: AnimationState.PUNCH_E, punchIdle: AnimationState.PUNCH_IDLE_E, toss: AnimationState.TOSS_E, tossIdle: AnimationState.TOSS_IDLE_E },
  ];
  const animations = new Map<AnimationState, AnimationSequence>();
  for (const dir of dirs) {
    animations.set(dir.walk, walk(dir.face)); animations.set(dir.idle, still(dir.face));
    const pa = punchAnim(dir.face), ta = tossAnim(dir.face);
    animations.set(dir.punch, pa); animations.set(dir.punchIdle, pa); animations.set(dir.toss, ta); animations.set(dir.tossIdle, ta);
  }
  // Diagonals use the left/right animations
  const remap = new Map<AnimationState, AnimationState>();
  const diagonals = [
    { from: AnimationState.WALK_NE, to: AnimationState.WALK_E }, { from: AnimationState.WALK_SE, to: AnimationState.WALK_E }, { from: AnimationState.WALK_NW, to: AnimationState.WALK_W }, { from: AnimationState.WALK_SW, to: AnimationState.WALK_W },
    { from: AnimationState.IDLE_NE, to: AnimationState.IDLE_E }, { from: AnimationState.IDLE_SE, to: AnimationState.IDLE_E }, { from: AnimationState.IDLE_NW, to: AnimationState.IDLE_W }, { from: AnimationState.IDLE_SW, to: AnimationState.IDLE_W },
    { from: AnimationState.PUNCH_NE, to: AnimationState.PUNCH_E }, { from: AnimationState.PUNCH_SE, to: AnimationState.PUNCH_E }, { from: AnimationState.PUNCH_NW, to: AnimationState.PUNCH_W }, { from: AnimationState.PUNCH_SW, to: AnimationState.PUNCH_W },
    { from: AnimationState.PUNCH_IDLE_NE, to: AnimationState.PUNCH_E }, { from: AnimationState.PUNCH_IDLE_SE, to: AnimationState.PUNCH_E }, { from: AnimationState.PUNCH_IDLE_NW, to: AnimationState.PUNCH_W }, { from: AnimationState.PUNCH_IDLE_SW, to: AnimationState.PUNCH_W },
    { from: AnimationState.TOSS_NE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_SE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_NW, to: AnimationState.TOSS_W }, { from: AnimationState.TOSS_SW, to: AnimationState.TOSS_W },
    { from: AnimationState.TOSS_IDLE_NE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_IDLE_SE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_IDLE_NW, to: AnimationState.TOSS_W }, { from: AnimationState.TOSS_IDLE_SW, to: AnimationState.TOSS_W },
  ];
  for (const diagonal of diagonals) remap.set(diagonal.from, diagonal.to);
  const heroSprite = new AnimatedSprite({ width: 1.9, height: 1.9, animations, remap, offset: { dx: 0, dy: -0.45 } });
  // Footsteps are synced to the walk animation's frames
  heroSprite.onFrameChange = (index: number, state: AnimationState) => {
    if (state >= AnimationState.WALK_N && state <= AnimationState.WALK_NW && (index == 2 || index == 6))
      stage.musicLibrary.getSound("footstep_outside.mp3")?.play();
  };
  const hurtRing = new FilledCircle({ radius: 0.55, fillColor: "#00000000" });
  const hero = new Actor({
    appearance: f.graybox ? look("you", 0.8, 1.2, () => []) : [hurtRing, heroSprite],
    rigidBody: new CircleBody({ cx: f.hero.x, cy: f.hero.y, radius: 0.35 }, { dynamic: true, disableRotation: true, passThroughId: [1] }),
    behaviors: [new PlayerControlBehavior(), new PunchBehavior({ damage: f.sword })],
  });
  stage.world.camera.setCameraFocus(hero);

  // Which way the hero is facing, as a unit vector
  const facing = () => {
    const d = hero.state.current.direction;
    const v = { [DIRECTION.N]: [0, -1], [DIRECTION.S]: [0, 1], [DIRECTION.E]: [1, 0], [DIRECTION.W]: [-1, 0], [DIRECTION.NE]: [0.7, -0.7], [DIRECTION.NW]: [-0.7, -0.7], [DIRECTION.SE]: [0.7, 0.7], [DIRECTION.SW]: [-0.7, 0.7] }[d] ?? [0, 1];
    return { x: v[0], y: v[1] };
  };

  // --- Water: thrown from a pool of droplets -----------------------------------
  const drops = new ActorPoolSystem();
  const reclaim = (a: Actor) => { if (a.enabled) drops.put(a); };
  for (let n = 0; n < 6; n++) {
    const throwable = new ThrowableBehavior({ damage: 0, reclaimer: (a: Actor) => drops.put(a) });
    const drop = new Actor({
      appearance: look("water", 0.24, 0.24, () => [new FilledCircle({ radius: 0.13, fillColor: "#6bc5ff", lineWidth: 0.03, lineColor: "#ffffff" })]),
      rigidBody: new CircleBody({ cx: -10, cy: -10, radius: 0.12 }, { dynamic: true, density: 0.01, passThroughId: [1, 2] }),
      movement: new ProjectileMovement(),
      behaviors: throwable,
      data: new DropData(),
    });
    // A missed throw splashes down after a few meters
    drop.prerenderTasks.push((_ms: number, a: Actor) => {
      if (!a.enabled) return;
      const c = a.rigidBody.getCenter();
      if (Math.hypot(c.x - throwable.rangeFrom.x, c.y - throwable.rangeFrom.y) > 3.5) { burst(c.x, c.y, ["#6bc5ff"], 6); reclaim(a); }
    });
    drops.put(drop);
  }
  const throwWater = () => {
    if (f.water <= 0) { say("Your watering can is empty.  Refill it at the pond."); return; }
    const drop = drops.get();
    if (!drop) return;
    f.water -= 1;
    const v = facing();
    getBehavior(drop, ThrowableBehavior).tossFixedDir({ actor: hero, offset: { dx: v.x * 0.5, dy: v.y * 0.5 }, velocity: { x: v.x * 7, y: v.y * 7 } });
  };

  // --- Punching -------------------------------------------------------------------
  let punchReady = 0;
  const punch = () => {
    if (stage.renderer.now < punchReady) return;
    punchReady = stage.renderer.now + 350;
    const v = facing();
    getBehavior(hero, PunchBehavior).punch({ offset: { dx: v.x * 0.65, dy: v.y * 0.65 }, radius: 0.55, duration: 0.18 });
  };

  // --- Getting hurt, and passing out ----------------------------------------------
  let hurtUntil = 0;
  const hurtHero = () => {
    if (stage.renderer.now < hurtUntil) return;
    hurtUntil = stage.renderer.now + 1000;
    f.hearts -= 1;
    const c = hero.rigidBody.getCenter();
    burst(c.x, c.y, ["#ff3b3b", "#ffffff"], 18);
    if (f.hearts <= 0) {
      const lost = Math.floor(f.coins / 4);
      f.coins -= lost;
      dawn(true);
      if (f.day > LAST_DAY) return;
      stage.requestOverlay((overlay: Scene) => endScreen(overlay, {
        title: "You passed out...",
        detail: `You wake up in bed the next morning, ${lost} coins poorer.`,
        next: () => stage.switchTo(builder), background: "#0b1030ee", titleColor: "#c9b8f2",
      }));
    }
  };

  // --- Lizards ----------------------------------------------------------------------
  const lizards: Actor[] = [];
  const lizardSprite = () => {
    const w = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 70, repeat: true, images: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => `lizard_walk_${d}_${n}.png`) });
    const s = new AnimatedSprite({
      width: 1.4, height: 1.4,
      animations: new Map([[AnimationState.WALK_E, w("r")], [AnimationState.WALK_W, w("l")], [AnimationState.IDLE_E, w("r")], [AnimationState.IDLE_W, w("l")]]),
    });
    s.stateSelector = AnimatedSprite.sideViewAnimationTransitions;
    return [s];
  };
  const spawnLizard = () => {
    const edge = stage.random.choice([[31, stage.random.nextRange(3, 16)], [stage.random.nextRange(12, 30), 17.2], [stage.random.nextRange(20, 30), 0.8]]);
    const lizard = new Actor({
      appearance: look("lizard", 0.9, 0.9, lizardSprite),
      rigidBody: new CircleBody({ cx: edge[0], cy: edge[1], radius: 0.4 }, { dynamic: true, disableRotation: true, passThroughId: [2] }),
      behaviors: [
        new HealthBehavior({ hitPoints: 2 }),
        new HazardBehavior({
          // Lizards don't use the engine's damage: they call hurtHero, which
          // has a moment of grace built in
          onContact: () => { hurtHero(); return 0; },
          onDefeated: (self: Actor) => {
            const c = self.rigidBody.getCenter();
            f.coins += 2; f.kills += 1;
            burst(c.x, c.y, ["#9ccc65", "#ffd23f"], 22);
            say("+2 coins");
          },
        }),
      ],
      data: new LizardData(),
    });
    lizards.push(lizard);
  };
  // Each lizard heads for the nearest crop, unless the hero is close by
  stage.world.timer.addEvent(new TimedEvent(0.5, true, () => {
    const h = hero.rigidBody.getCenter();
    for (const l of lizards) {
      if (!l.enabled) continue;
      const c = l.rigidBody.getCenter();
      let target: { x: number, y: number } | undefined, best = Infinity;
      plots.forEach((p, i) => {
        const d = Math.hypot(p.spot.x - c.x, p.spot.y - c.y);
        if (f.plots[i] != Plot.EMPTY && d < best) { best = d; target = p.spot; }
      });
      if (Math.hypot(h.x - c.x, h.y - c.y) < 3 || !target) target = h;
      const d = Math.hypot(target.x - c.x, target.y - c.y) || 1;
      const speed = 1.2 + 0.12 * f.day;
      l.rigidBody.setVelocity((target.x - c.x) / d * speed, (target.y - c.y) / d * speed);
    }
  }));

  // --- The clock: day, dusk, night, dawn --------------------------------------------
  const dawn = (passedOut: boolean) => {
    for (const l of lizards) if (l.enabled) l.remove();
    f.plots = f.plots.map(p => (p == Plot.SEED_WET ? Plot.SPROUT : p == Plot.SPROUT_WET ? Plot.RIPE : p));
    f.day += 1;
    f.clock = 0;
    f.hearts = HEARTS;
    f.lizardsLeft = 0;
    const c = hero.rigidBody.getCenter();
    f.hero = passedOut ? { x: HOUSE.x + 0.5, y: HOUSE.y + 2.3 } : { x: c.x, y: c.y };
    if (f.day > LAST_DAY) stage.score.loseLevel();
  };
  let nextLizard = 0;
  stage.world.timer.addEvent(new TimedEvent(0.1, true, () => {
    const wasNight = night();
    f.clock += 0.1;
    if (!wasNight && night()) { f.lizardsLeft = 2 + 2 * f.day; say("Night falls.  Protect your crops!"); }
    if (night() && f.lizardsLeft > 0 && (nextLizard -= 0.1) <= 0) {
      spawnLizard();
      f.lizardsLeft -= 1;
      nextLizard = Math.max(1.2, NIGHT_LEN * 0.8 / (2 + 2 * f.day));
    }
    if (f.clock >= DAY_LEN + NIGHT_LEN) {
      dawn(false);
      if (f.day <= LAST_DAY) { plots.forEach(p => p.draw()); say(`Day ${f.day}.  Watered crops grew overnight.`); }
    }
    const lit = !night();
    windowGlow.forEach(w => (w.fillColor = lit ? "#8fc7e8" : "#ffd966"));
  }));
  // Darkness: a translucent box over the whole screen, fading with the time of day
  const shade = new FilledBox({ width: 16, height: 9, fillColor: "#0b103000", z: -2 });
  new Actor({ appearance: shade, rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud, collisionsEnabled: false }) });
  stage.world.repeatEvents.push(() => {
    const t = f.clock;
    const dark = t < DAY_LEN - 8 ? 0 : t < DAY_LEN ? (t - (DAY_LEN - 8)) / 8 : t > DAY_LEN + NIGHT_LEN - 4 ? (DAY_LEN + NIGHT_LEN - t) / 4 : 1;
    shade.fillColor = "#0b1030" + Math.round(dark * 150).toString(16).padStart(2, "0");
  });
  stage.world.repeatEvents.push(() => {
    hurtRing.fillColor = stage.renderer.now < hurtUntil && Math.floor(stage.renderer.now / 100) % 2 == 0 ? "#ff3b3b66" : "#00000000";
  });

  // --- Interacting (E): plots, the pond, and the market ------------------------------
  const nearby = () => {
    const h = hero.rigidBody.getCenter();
    const i = plots.findIndex(p => Math.hypot(p.spot.x - h.x, p.spot.y - h.y) < 0.95);
    if (i >= 0) {
      if (f.plots[i] == Plot.RIPE) return { hint: "E: harvest", act: () => { f.plots[i] = Plot.EMPTY; f.produce += 1; burst(plots[i].spot.x, plots[i].spot.y, ["#f28c28", "#ffd23f"], 20); plots[i].draw(); } };
      if (f.plots[i] == Plot.EMPTY) return f.seeds > 0 ? { hint: `E: plant (${f.seeds} seeds)`, act: () => { f.plots[i] = Plot.SEED; f.seeds -= 1; plots[i].draw(); } } : { hint: "Out of seeds: buy some at the market", act: () => { } };
      if (f.plots[i] == Plot.SEED || f.plots[i] == Plot.SPROUT) return { hint: "Needs water (Space)", act: () => { } };
      return { hint: "Watered.  It will grow tonight.", act: () => { } };
    }
    if (Math.hypot(POND.x - h.x, POND.y - h.y) < 2.6) return { hint: "E: refill the watering can", act: () => { f.water = f.waterMax; say("Watering can full."); } };
    return undefined;
  };

  // --- Controls -------------------------------------------------------------------------
  const held = { l: false, r: false, u: false, d: false };
  const bindMain = () => {
    stage.keyboard.clearHandlers();
    held.l = held.r = held.u = held.d = false;
    const bind = (keys: KeyCodes[], k: keyof typeof held) => {
      stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
      stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
    };
    bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
    bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_E, () => nearby()?.act());
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, throwWater);
    stage.keyboard.setKeyDownHandler([KeyCodes.KEY_F, KeyCodes.KEY_J], punch);
    // Gray-box mode: same game, same state, just labeled boxes instead of art
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_G, () => { f.graybox = !f.graybox; const c = hero.rigidBody.getCenter(); f.hero = { x: c.x, y: c.y }; stage.switchTo(builder); });
  };
  bindMain();
  stage.world.repeatEvents.push(() => {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    hero.rigidBody.setVelocity(dx / len * 4.5, dy / len * 4.5);
  });

  // --- The HUD --------------------------------------------------------------------------
  new Actor({
    appearance: new FilledBox({ width: 16, height: 0.62, fillColor: "#00000088" }),
    rigidBody: new BoxBody({ cx: 8, cy: 0.31, width: 16, height: 0.62 }, { scene: stage.hud, collisionsEnabled: false }),
  });
  const hud = (x: number, y: number, size: number, color: string, t: () => string) => new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size, color, strokeColor: "#000000", strokeWidth: 3 }, t),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  hud(0.2, 0.12, 20, "#ffe9a8", () => `Day ${Math.min(f.day, LAST_DAY)} of ${LAST_DAY}   ${night() ? `☾ ${Math.ceil(DAY_LEN + NIGHT_LEN - f.clock)}s to dawn` : `☀ ${Math.ceil(DAY_LEN - f.clock)}s to dusk`}`);
  hud(4.9, 0.12, 20, "#ffffff", () => `Coins ${f.coins}   Produce ${f.produce}   Seeds ${f.seeds}   Water ${f.water}/${f.waterMax}`);
  hud(11.6, 0.12, 20, "#ff6b6b", () => "♥".repeat(Math.max(0, f.hearts)) + "♡".repeat(Math.max(0, HEARTS - f.hearts)));
  hud(0.3, 8.4, 20, "#ffffff", () => stage.renderer.now < toastUntil ? toast : nearby()?.hint ?? (f.day == 1 && f.clock < 12 ? "Arrows move · E interact · Space throw water · F punch · G gray boxes" : ""));

  stage.score.winSceneBuilder = (overlay: Scene) => endScreen(overlay, {
    title: "The farm is yours!",
    detail: `You paid off the deed on day ${f.day}, with ${f.coins} coins to spare.\nLizards defeated: ${f.kills}`,
    prompt: "Click or press Enter to start a new farm", next: newGame, background: "#1d2b14ee", titleColor: "#ffd23f",
  });
  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, {
    title: "The bank took the farm",
    detail: `The deed was due after day ${LAST_DAY}, and you had ${f.coins} of ${DEED} coins.`,
    prompt: "Click or press Enter to try again", next: newGame, background: "#1a1022ee", titleColor: "#e0463c",
  });

  /** A solid, invisible wall */
  function solid(l: number, t: number, r: number, b: number) {
    new Actor({
      appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#00000000" }),
      rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
      behaviors: new SolidBehavior(),
    });
  }
}

/** Tufts of grass, scattered the same way every time */
function grass() {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 90; n++) {
    new Actor({
      appearance: new FilledPolygon({ vertices: [{ x: -0.15, y: 0.1 }, { x: 0, y: -0.15 }, { x: 0.15, y: 0.1 }], fillColor: rand() < 0.5 ? "#5a9e40" : "#7cc05a", z: -2 }),
      rigidBody: new CircleBody({ cx: rand() * WORLD.w, cy: rand() * WORLD.h, radius: 0.01 }, { collisionsEnabled: false }),
    });
  }
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
