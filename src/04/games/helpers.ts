import { Actor, BoxBody, ChaseMovement, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledRoundedBox, Scene, ScoreService, SolidBehavior, stage, TextSprite, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { endScreen, floatingText, hudText } from "../common/common";

/**
 * HELPERS for Garden Defense.
 *
 * Everything in this file is provided, and you don't have to edit it.  It builds
 * the garden (the bed, the plants, the stones, and the seed pouch), sends in the
 * bugs, and makes the HUD and the end screens.  The gestures are what you write.
 */

/** How long to survive */
const SURVIVE = 90;

/** How  many plants must live */
const MIN_PLANTS = 3;

/** How many traps at most */
export const MAX_TRAPS = 3;

/** Where the seed pouch is */
export const POUCH = { x: 8, y: 8.2 };

/** Colors for this game's end screens */
const END_STYLE = { background: "#1d2b14dd", titleColor: "#ffffff", detailColor: "#cfe8b0" };

// [mfs] I think these fancy type tricks are overkill for our use case, and they
// are certainly too confusing for beginner programmers.

// ANCHOR: data_types
/** What a plant needs to remember.  It is kept on the plant's actor, as its `data`. */
export class PlantData {
  /** How many bites the plant can still take */
  hp = 3;
  /** How watered the plant is, from 0 to 1 */
  bloom = 0;
  /** Is the plant still alive? */
  alive = true;
  /** The three parts of the plant that are redrawn as it changes */
  leaves: FilledCircle;
  flower: FilledCircle;
  meter: FilledBox;

  /**
   * Make the data for a new plant
   *
   * @param leaves The drawing of the plant's leaves
   * @param flower The drawing of the plant's flower
   * @param meter  The drawing of the bar that shows how watered it is
   */
  constructor(leaves: FilledCircle, flower: FilledCircle, meter: FilledBox) {
    this.leaves = leaves;
    this.flower = flower;
    this.meter = meter;
  }
}

/** What a bug needs to remember.  It is kept on the bug's actor, as its `data`. */
export class BugData {
  /** How many taps the bug can still take */
  hp: number;
  /** How fast the bug crawls */
  speed: number;

  /**
   * Make the data for a new bug
   *
   * @param hp    How many taps it takes to squish the bug
   * @param speed How fast the bug crawls
   */
  constructor(hp: number, speed: number) {
    this.hp = hp;
    this.speed = speed;
  }
}

/** An actor that carries a plant's data, or a bug's */
export type Plant = Actor<PlantData>;
export type Bug = Actor<BugData>;

/**
 * Is this actor a bug?  Actors that were given no data (like a stone) aren't.
 * TypeScript learns from the answer: where this is true, the actor is a `Bug`.
 *
 * @param a Any actor
 */
export const isBug = (a: Actor): a is Bug => a.data instanceof BugData;

/** Is this actor a plant?  See `isBug`. */
export const isPlant = (a: Actor): a is Plant => a.data instanceof PlantData;
// ANCHOR_END: data_types

// ANCHOR: counters
/** The counter (see `stage.score.counters`) that holds the player's score */
export const SCORE = "score";

/** The counter that holds how many traps the player has left */
export const TRAPS = "traps";
// ANCHOR_END: counters

/**
 * Build the garden: the bed, the plants, the stones, the seed pouch, and a timer
 * that sends in bugs faster and faster.  Also make the HUD, and decide when the
 * game is won or lost.
 *
 * @param thisLevel The builder function for this level, so that the end screens
 *                  can start it over
 * @param spawn     A function that makes one bug, and returns it (or nothing,
 *                  if there's nobody left for a bug to eat)
 *
 * @returns The plants, the bugs that have been sent in, the stones, the seed
 *          pouch, a function that counts the plants that are still alive, the
 *          `watering` object (set its `plant`), and the trap `preview` circle
 */
export function startGarden(thisLevel: () => void, spawn: (plants: Plant[]) => Bug | undefined) {
  DebugToggle.enable();
  stage.backgroundColor = "#6fa85a";
  // The plants and the bugs are actors.  What makes a plant a plant (how healthy
  // it is, how watered it is) is kept right on the actor, in its `data`.
  const plants: Plant[] = [];
  const bugs = new Set<Bug>();
  const alivePlants = () => plants.filter(p => p.data.alive).length;

  // The garden bed
  new Actor({
    appearance: new FilledRoundedBox({ width: 8.4, height: 4.6, radius: 0.8, fillColor: "#7a5a3a", z: -2 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 8.4, height: 4.6 }, { collisionsEnabled: false }),
  });

  // The plants
  const plantSpots = [{ x: 6.3, y: 3.3 }, { x: 9.7, y: 3.3 }, { x: 4.9, y: 5.6 }, { x: 8.0, y: 5.6 }, { x: 11.1, y: 5.6 }];
  for (const spot of plantSpots) plants.push(makePlant(spot.x, spot.y));

  // The stones, which the player can drag around
  const stones: Actor[] = [];
  const stoneSpecs = [{ x: 3.0, y: 2.2, w: 1.6, h: 0.7 }, { x: 13.0, y: 2.4, w: 0.7, h: 1.6 }, { x: 13.2, y: 7.0, w: 1.6, h: 0.7 }];
  for (const spec of stoneSpecs) {
    stones.push(new Actor({
      appearance: new FilledRoundedBox({ width: spec.w, height: spec.h, radius: 0.2, fillColor: "#9aa0a6", lineWidth: 0.06, lineColor: "#5f656b" }),
      rigidBody: new BoxBody({ cx: spec.x, cy: spec.y, width: spec.w, height: spec.h }),
      behaviors: new SolidBehavior(),
    }));
  }

  // The seed pouch
  const pouch = new Actor({
    appearance: [
      new FilledCircle({ radius: 0.5, fillColor: "#b0834f", lineWidth: 0.06, lineColor: "#6e4f2b" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#ffffff" }, "flick"),
    ],
    rigidBody: new CircleBody({ cx: POUCH.x, cy: POUCH.y, radius: 0.5 }, { collisionsEnabled: false }),
  });

  // Bugs arrive faster and faster
  let nextSpawn = 1.5;
  stage.world.timer.addEvent(new TimedEvent(0.1, true, () => {
    nextSpawn -= 0.1;
    if (nextSpawn > 0) return;
    const bug = spawn(plants);
    if (bug) bugs.add(bug);
    nextSpawn = Math.max(0.55, 2.0 - elapsed() / 60);
  }));
  // Bugs whose plant was eaten look for a new one
  stage.world.timer.addEvent(new TimedEvent(0.5, true, () => retargetBugs(bugs, plants)));

  // Win by surviving; lose if too many plants get eaten
  stage.score.addWinCondition(() => elapsed() >= SURVIVE);
  stage.score.addLoseCondition(() => alivePlants() < MIN_PLANTS);

  // The HUD
  hudText(0.3, 0.15, 24, "#ffffff", () => `Time left: ${Math.max(0, Math.ceil(SURVIVE - elapsed()))}`, { outline: "#000000" });
  hudText(4.3, 0.15, 24, "#ffffff", () => `Plants: ${alivePlants()} (need ${MIN_PLANTS})`, { outline: "#000000" });
  hudText(13.0, 0.15, 24, "#ffffff", () => `Score: ${stage.score.counters.get(SCORE)}`, { outline: "#000000" });

  stage.score.winSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "The garden survived!", detail: `${alivePlants()} plants left.  Score: ${stage.score.counters.get(SCORE) + 10 * alivePlants()} (includes 10 per plant)`, prompt: "Tap or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });
  stage.score.loseSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "The bugs ate the garden", detail: `You lasted ${Math.floor(elapsed())} seconds.  Score: ${stage.score.counters.get(SCORE)}`, prompt: "Tap or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });

  // ANCHOR: traps_setup
  // The player starts with a few traps, and gets them back slowly
  stage.score.counters.set(TRAPS, MAX_TRAPS);
  stage.world.timer.addEvent(new TimedEvent(6, true, () => { stage.score.counters.set(TRAPS, Math.min(MAX_TRAPS, stage.score.counters.get(TRAPS) + 1)); }));
  hudText(8.8, 0.15, 24, "#fff27a", () => `Traps: ${"●".repeat(stage.score.counters.get(TRAPS))}${"○".repeat(MAX_TRAPS - stage.score.counters.get(TRAPS))}`, { outline: "#000000" });
  // ANCHOR_END: traps_setup

  // ANCHOR: watering_setup
  // The plant that is being watered right now, if any.  A gesture sets `plant`,
  // and the timer below does the rest.
  const watering: { plant: Plant | undefined } = { plant: undefined };

  // Watering happens a little every frame, for as long as the press lasts.
  // JetLag tells us `dt`, the seconds since the last frame, and it takes 2.2
  // seconds to water a plant until it blooms
  stage.world.repeatEvents.push((dt: number) => {
    const plant = watering.plant;
    if (!plant || !plant.data.alive) return;
    plant.data.bloom += dt / 2.2;
    if (plant.data.bloom >= 1) {
      plant.data.bloom = 0;
      plant.data.hp = 3;
      stage.score.counters.add(SCORE, 5);
      const c = plant.rigidBody.getCenter();
      floatingText(c.x, c.y - 0.9, "+5 bloom!", { color: "#fff27a" });
    }
    drawPlant(plant);
  });
  // ANCHOR_END: watering_setup

  // ANCHOR: hover_setup
  // A faint circle that shows where a trap would go.  It's on the HUD, so that
  // it never counts as something in the way of a trap.
  const circle = new FilledCircle({ radius: 0.42, fillColor: "#00000000", lineWidth: 0.05, lineColor: "#00000000" });
  const circleActor = new Actor({
    appearance: circle,
    rigidBody: new CircleBody({ cx: -5, cy: -5, radius: 0.42 }, { collisionsEnabled: false, scene: stage.hud }),
  });
  const preview = {
    /** Show the circle at a HUD position, in yellow if a trap can go there and red if it can't */
    show: (hudX: number, hudY: number, ok: boolean) => {
      circleActor.rigidBody.setCenter(hudX, hudY);
      circle.fillColor = ok ? "#e8d44d55" : "#b3261e44";
      circle.lineColor = ok ? "#a38f1a" : "#b3261e";
    },
    /** Make the circle invisible again */
    hide: () => {
      circle.fillColor = "#00000000";
      circle.lineColor = "#00000000";
    },
  };
  // ANCHOR_END: hover_setup

  return { plants, bugs, stones, pouch, alivePlants, watering, preview };
}

/**
 * Make one plant.  It takes a bite from any bug that reaches it, and dies when
 * it has been bitten enough.
 *
 * @param x The x coordinate of the center of the plant
 * @param y The y coordinate of the center of the plant
 *
 * @returns The plant
 */
function makePlant(x: number, y: number) {
  const leaves = new FilledCircle({ radius: 0.5, fillColor: "#2f8f3a", lineWidth: 0.05, lineColor: "#1b5e24" });
  const flower = new FilledCircle({ radius: 0.18, fillColor: "#f5e663" });
  const meter = new FilledBox({ width: 0.01, height: 0.1, fillColor: "#4fb3ff", offset: { dx: 0, dy: 0.72 } });
  const plant: Plant = new Actor({
    appearance: [
      new FilledBox({ width: 1.0, height: 0.1, fillColor: "#00000033", offset: { dx: 0, dy: 0.72 } }),
      leaves, flower, meter,
    ],
    rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.5 }),
    behaviors: new TouchPlateBehavior({
      eligible: isBug,
      onEnter: (_self: Actor, bug: Bug) => {
        // A bug reached this plant: it takes a bite, and is gone.  (Only bugs
        // are eligible, and `plant` is the plant that this behavior belongs to.)
        if (!bug.enabled || !plant.data.alive) return;
        killBug(bug, false);
        plant.data.hp -= 1;
        if (plant.data.hp <= 0) {
          plant.data.alive = false;
          plant.remove();
          splat(x, y, "#4a3a22", 0.8);
        }
        drawPlant(plant);
      },
    }),
    // Everything that this plant needs to remember
    data: new PlantData(leaves, flower, meter),
  });
  drawPlant(plant);
  return plant;
}

// [mfs] It's a one-liner, no need to make a function for it
/** How many seconds this level has been running */
export function elapsed() {
  return stage.score.counters.get(ScoreService.STOPWATCH);
}

/**
 * Remove a bug from the game, with a splat if the player squished it
 *
 * @param bug      The bug to remove
 * @param squished True if the player did it, which scores a point
 */
export function killBug(bug: Bug, squished: boolean) {
  // A bug that has already been removed (say, by two traps at once) isn't removed twice
  if (!bug.enabled) return;
  bug.remove();
  if (squished) {
    const c = bug.rigidBody.getCenter();
    splat(c.x, c.y, "#3b2a1a", 0.35);
    stage.score.counters.add(SCORE, 1);
  }
}

/**
 * Find the living plant that is closest to a spot
 *
 * @param plants All of the plants
 * @param x      The x coordinate of the spot
 * @param y      The y coordinate of the spot
 *
 * @returns The nearest plant, or nothing if every plant has been eaten
 */
export function nearestPlant(plants: Plant[], x: number, y: number) {
  let best: Plant | undefined, bestD = Infinity;
  for (const p of plants) {
    if (!p.data.alive) continue;
    const c = p.rigidBody.getCenter();
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

/**
 * Point every bug at the nearest living plant, and forget the bugs that are gone
 *
 * @param bugs   The bugs that have been sent in
 * @param plants All of the plants
 */
function retargetBugs(bugs: Set<Bug>, plants: Plant[]) {
  for (const bug of bugs) {
    if (!bug.enabled) { bugs.delete(bug); continue; }
    const c = bug.rigidBody.getCenter();
    const p = nearestPlant(plants, c.x, c.y);
    if (p) bug.movement = new ChaseMovement({ speed: bug.data.speed, target: p });
  }
}

/**
 * Redraw a plant to show its health and how watered it is
 *
 * @param plant The plant to redraw
 */
export function drawPlant(plant: Plant) {
  const d = plant.data;
  d.leaves.radius = 0.25 + 0.09 * d.hp;
  d.leaves.fillColor = d.hp >= 3 ? "#2f8f3a" : d.hp == 2 ? "#6a9a2f" : "#9a8a2f";
  d.flower.radius = 0.08 + 0.18 * d.bloom;
  d.flower.fillColor = d.bloom > 0 ? "#ff7eb6" : "#f5e663";
  d.meter.width = Math.max(0.01, d.bloom);
  d.meter.offset.dx = -0.5 + d.bloom / 2;
}

/**
 * Leave a short-lived mark on the ground
 *
 * @param x      The x coordinate of the mark
 * @param y      The y coordinate of the mark
 * @param color  The HTML hex color of the mark
 * @param radius How big the mark is
 */
export function splat(x: number, y: number, color: string, radius: number) {
  const a = new Actor({
    appearance: new FilledCircle({ radius, fillColor: color + "aa", z: -1 }),
    rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(0.8, false, () => a.remove()));
}

// ANCHOR: traps_fns
/**
 * Can a trap go at this world position?  There has to be a trap left, and
 * nothing already there (not even the seed pouch).
 *
 * @param p A position, in world meters
 */
export function canPlaceTrap(p: { x: number, y: number }) {
  return stage.score.counters.get(TRAPS) > 0 && stage.world.physics.actorsAt(p).length == 0;
}

/**
 * Put a sticky trap on the ground, which squishes the first three bugs that touch it
 *
 * @param x The x coordinate of the trap
 * @param y The y coordinate of the trap
 */
export function placeTrap(x: number, y: number) {
  let uses = 3;
  const goo = new FilledCircle({ radius: 0.42, fillColor: "#e8d44dcc", lineWidth: 0.05, lineColor: "#a38f1a" });
  const trap = new Actor({
    appearance: goo,
    rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.42 }),
    behaviors: new TouchPlateBehavior({
      eligible: isBug,
      onEnter: (_self: Actor, bug: Bug) => {
        killBug(bug, true);
        uses -= 1;
        goo.fillColor = uses == 2 ? "#e8d44d99" : "#e8d44d66";
        if (uses <= 0) trap.remove();
      },
    }),
  });
}
// ANCHOR_END: traps_fns

// ANCHOR: seeds_fns
/**
 * Launch a seed from the pouch with the given velocity, which squishes the first bug it hits
 *
 * @param vx The seed's x velocity
 * @param vy The seed's y velocity
 */
export function flickSeed(vx: number, vy: number) {
  const seed = new Actor({
    appearance: new FilledCircle({ radius: 0.12, fillColor: "#f0d9a0", lineWidth: 0.03, lineColor: "#7a5a3a" }),
    rigidBody: new CircleBody({ cx: POUCH.x, cy: POUCH.y - 0.5, radius: 0.12 }, { dynamic: true }),
    behaviors: new TouchPlateBehavior({
      eligible: isBug,
      onEnter: (self: Actor, bug: Bug) => {
        killBug(bug, true);
        self.remove();
      },
    }),
  });
  // A small, fast seed could skip right over a bug between two frames, so ask
  // Box2D to check its whole path
  seed.rigidBody.body.SetBullet(true);
  seed.rigidBody.setVelocity(vx, vy);
  stage.world.timer.addEvent(new TimedEvent(1.6, false, () => seed.remove()));
}
// ANCHOR_END: seeds_fns
