import { Actor, BoxBody, ChaseMovement, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, getBehavior, HazardBehavior, HealthBehavior, KeyCodes, LevelValue, Scene, ScoreService, SolidBehavior, stage, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { endScreen, heroBehaviors, hudText } from "../common/common";

/**
 * HELPERS for Slime Time.
 *
 * Everything in this file is provided, and you don't have to edit it.  It builds the arena, the
 * hero, the slimes, the HUD, and the end screens.  The things that happen on a timer are what you write.
 */

/** The size of the arena, how long the portal takes to charge, and the limits on the slimes */
export const ARENA = { w: 30, h: 18 };
export const CHARGE_TIME = 60;
export const MAX_SLIMES = 50;
export const SPLIT_EVERY = 6;
export const MAX_GENERATION = 3;

// ANCHOR: slime_data
/** What a slime needs to remember.  It is kept on the slime's actor, as its `data`. */
export class SlimeData {
  /** How many seconds since the slime last split */
  age: number;
  /** How many splits deep the slime is */
  gen: number;

  /**
   * Make the data for a new slime
   *
   * @param age How long ago it last split, to begin with
   * @param gen How many splits deep it is
   */
  constructor(age: number, gen: number) {
    this.age = age;
    this.gen = gen;
  }
}

/** An actor that carries a slime's data */
export type Slime = Actor<SlimeData>;

/**
 * Is this actor a slime?  Actors that were given no data (like a rock) aren't.
 *
 * @param a Any actor
 */
export const isSlime = (a: Actor): a is Slime => a.data instanceof SlimeData;
// ANCHOR_END: slime_data

/** Why the level was lost, for the lose screen.  Level storage is forgotten when the level restarts. */
export const LOSE_REASON = new LevelValue<string>("loseReason", () => "");

/** Colors for this game's end screens */
const END_STYLE = { background: "#140f20dd", titleColor: "#9be15d", detailColor: "#ffffff" };

// ANCHOR: announce_fn
/** The message on the HUD.  Level storage is forgotten when the level restarts. */
const MESSAGE = new LevelValue<string>("message", () => "");

/**
 * Put a message on the HUD for a couple of seconds.  The message is kept in
 * level storage, and the time that it should disappear is a counter, so
 * any part of the game can announce something.
 *
 * @param message What to say
 */
export function announce(message: string) {
  MESSAGE.set(message);
  stage.score.counters.set("messageUntil", stage.score.counters.get(ScoreService.STOPWATCH) + 2.5);
}
// ANCHOR_END: announce_fn

/**
 * Build the arena and everything in it that isn't one of the things that happen on a timer: the floor, the
 * walls, the rocks, the hero (with its hearts, its walking, and its dash), the first four slimes, the HUD, and
 * the end screens.
 *
 * @param thisLevel The builder function for this level, so that the end screens can start it over
 *
 * @returns The hero (and its picture, its health, and whether it can be hurt right now), the list of slimes, a function that
 *          makes a slime, a function that squashes one, the list of `targets` that are worth pointing an arrow at,
 *          and `dash`, which makes the hero dash
 */
export function startArena(thisLevel: () => void) {
  DebugToggle.enable();
  stage.backgroundColor = "#2b2240";
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: ARENA.w, maxY: ARENA.h });

  // ANCHOR: charge_state
  // The portal's charge is the stopwatch (seconds since the level began) plus
  // any bonus that hourglasses have given, which is the "bonus" counter.
  // `targets` is everything worth pointing at.
  announce("Survive while the portal charges!");
  const targets: { actor: Actor, label: string }[] = [];
  // ANCHOR_END: charge_state

  // The arena
  // A floor of squares, in two colors that alternate
  for (let x = 0; x < ARENA.w; x += 3) {
    for (let y = 0; y < ARENA.h; y += 3) {
      new Actor({
        appearance: new FilledBox({ width: 2.9, height: 2.9, fillColor: (x + y) % 2 == 0 ? "#302748" : "#342a4e", z: -2 }),
        rigidBody: new BoxBody({ cx: x + 1.5, cy: y + 1.5, width: 2.9, height: 2.9 }, { collisionsEnabled: false }),
      });
    }
  }
  wall(-1, -1, ARENA.w + 1, 0);
  wall(-1, ARENA.h, ARENA.w + 1, ARENA.h + 1);
  wall(-1, 0, 0, ARENA.h);
  wall(ARENA.w, 0, ARENA.w + 1, ARENA.h);
  const rocks = [{ cx: 8, cy: 6, r: 0.9 }, { cx: 22, cy: 5, r: 1.1 }, { cx: 15, cy: 12, r: 1.0 }, { cx: 6, cy: 14, r: 0.8 }, { cx: 25, cy: 13, r: 0.9 }];
  for (const rock of rocks) {
    new Actor({
      appearance: new FilledCircle({ radius: rock.r, fillColor: "#5a4d7a", lineWidth: 0.06, lineColor: "#3a3052" }),
      rigidBody: new CircleBody({ cx: rock.cx, cy: rock.cy, radius: rock.r }),
      behaviors: new SolidBehavior(),
    });
  }

  // The hero.  After getting hurt, it gets a moment's grace before the
  // next hit can land.
  let lastHurt = -10000;
  const canHurt = () => stage.renderer.now - lastHurt > 1000;
  const body = new FilledCircle({ radius: 0.38, fillColor: "#f0e6d2", lineWidth: 0.08, lineColor: "#39c2ff" });
  const hero = new Actor({
    appearance: [body, new FilledCircle({ radius: 0.08, fillColor: "#222222", offset: { dx: -0.12, dy: -0.08 } }), new FilledCircle({ radius: 0.08, fillColor: "#222222", offset: { dx: 0.12, dy: -0.08 } })],
    rigidBody: new CircleBody({ cx: ARENA.w / 2, cy: ARENA.h / 2, radius: 0.38 }, { disableRotation: true }),
    behaviors: heroBehaviors({
      hitPoints: 3,
      onHitPointsChange: (a: Actor) => {
        lastHurt = stage.renderer.now;
        body.fillColor = "#ff6b6b";
        stage.world.timer.addEvent(new TimedEvent(0.25, false, () => (body.fillColor = "#f0e6d2")));
        const v = a.rigidBody.getVelocity();
        a.rigidBody.setVelocity(-v.x * 1.5, -v.y * 1.5);
      },
    }),
  });
  stage.world.camera.setCameraFocus(hero);
  // A hero who stands still falls asleep, and a sleeping body doesn't notice a blast that appears on top of it
  hero.rigidBody.body.SetSleepingAllowed(false);
  const health = getBehavior(hero, HealthBehavior);
  const countDefeat = health.onDefeated;
  health.onDefeated = (a: Actor, by?: Actor) => { countDefeat?.(a, by); LOSE_REASON.set("The slimes got you."); };

  // Moving and dashing.  Dashing makes the hero briefly invincible, and a
  // hazard that touches an invincible hero is defeated instead of hurting it.
  const held = { l: false, r: false, u: false, d: false };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = false; });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = false; });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = true; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = false; });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = true; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = false; });
  let facing = { x: 1, y: 0 };
  // A dash locks out walking for 0.2 seconds.  Comparing the clock to this
  // number on every frame is how the walking code knows to wait.
  let dashUntil = 0;
  /** A dash: the hero can't be hurt for a moment, and shoots off in whichever direction it is facing */
  const dash = () => {
    dashUntil = stage.renderer.now + 200;
    health.invincibleRemaining = 0.3;
    hero.rigidBody.setVelocity(facing.x * 15, facing.y * 15);
  };
  stage.world.repeatEvents.push(() => {
    if (stage.renderer.now < dashUntil) return;
    let dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    if (dx || dy) {
      // A dash always goes at the same speed, so the direction has to have a
      // length of 1.  Going diagonally, dx and dy are both 1, so the length
      // there is 1.41, and `hypot` works that out.
      const len = Math.hypot(dx, dy);
      facing = { x: dx / len, y: dy / len };
    }
    const v = hero.rigidBody.getVelocity();
    // Ease toward the target velocity, so knock-backs are visible
    hero.rigidBody.setVelocity(v.x * 0.7 + dx * 4.8 * 0.3, v.y * 0.7 + dy * 4.8 * 0.3);
  });

  // The slimes: a repeating timer walks the list of slimes, and each one
  // that's old enough splits in two.  New slimes go into a separate list, so
  // the loop never visits a slime it just created.
  const slimes: Slime[] = [];
  const makeSlime = (cx: number, cy: number, gen: number) => {
    const r = 0.42 - 0.04 * gen;
    const slime: Slime = new Actor({
      appearance: [
        new FilledCircle({ radius: r, fillColor: ["#7ed957", "#9be15d", "#c3e85f", "#e8e46a", "#f0b85a"][gen], lineWidth: 0.05, lineColor: "#2e6b1f" }),
        new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: -0.1, dy: -0.06 } }),
        new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: 0.1, dy: -0.06 } }),
      ],
      rigidBody: new CircleBody({ cx, cy, radius: r }, { dynamic: true, disableRotation: true }),
      movement: new ChaseMovement({ speed: 1.1 + 0.15 * gen, target: hero }),
      behaviors: new HazardBehavior({ onContact: () => (canHurt() ? 1 : 0), onDefeated: () => popSlime(slime) }),
      data: new SlimeData(stage.random.next() * 1.5, gen),
    });
    slimes.push(slime);
    return slime;
  };
  const popSlime = (slime: Slime) => {
    const i = slimes.indexOf(slime);
    if (i < 0) return;
    slimes.splice(i, 1);
    const c = slime.rigidBody.getCenter();
    flash(c.x, c.y, 0.6, "#7ed95788", 0.25);
    stage.score.counters.add("popped", 1);
  };
  // ANCHOR: squash
  const squash = (slime: Slime) => { slime.remove(); popSlime(slime); };
  // ANCHOR_END: squash
  const startSpots = [{ x: 4, y: 3 }, { x: 26, y: 4 }, { x: 5, y: 15 }, { x: 25, y: 15 }];
  for (const spot of startSpots) makeSlime(spot.x, spot.y, 0);

  hudText(0.3, 0.15, 26, "#ff6b6b", () => "♥".repeat(Math.max(0, health.hitPoints)) + "♡".repeat(Math.max(0, 3 - health.hitPoints)), { outline: "#000000" });
  hudText(6.0, 0.15, 24, "#9be15d", () => `Slimes: ${slimes.length} / ${MAX_SLIMES}`, { outline: "#000000" });
  // ANCHOR: hud_message
  hudText(0.3, 8.3, 22, "#ffe08a", () => stage.score.counters.get(ScoreService.STOPWATCH) < stage.score.counters.get("messageUntil") ? MESSAGE.get() : "", { outline: "#000000" });
  // ANCHOR_END: hud_message

  stage.score.winSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "You escaped!", detail: `Popped ${stage.score.counters.get("popped")} slimes, with ${health.hitPoints} hearts left`, prompt: "Click or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });
  stage.score.loseSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "Slimed!", detail: LOSE_REASON.get(), prompt: "Click or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });

  return { hero, body, health, canHurt, slimes, makeSlime, squash, targets, dash };
}

/**
 * A random spot, between `near` and `far` meters from an actor, and always inside the arena
 *
 * @param a    The actor to stay away from
 * @param near The closest the spot may be to the actor
 * @param far  The farthest the spot may be from the actor
 * @returns    The x and y coordinates of the spot
 */
export function spotAwayFrom(a: Actor, near: number, far: number): [number, number] {
  const c = a.rigidBody.getCenter();
  // Pick a direction and a distance, and go that way.  The spot can land outside
  // the arena, so pull it back inside.  Then it might be a bit closer than `near`,
  // and that's fine.
  const ang = stage.random.next() * Math.PI * 2, d = near + stage.random.next() * (far - near);
  return [clamp(c.x + Math.cos(ang) * d, 1.5, ARENA.w - 1.5), clamp(c.y + Math.sin(ang) * d, 1.5, ARENA.h - 1.5)];
}

/**
 * Keep a number between a smallest and a largest value
 *
 * @param v  The number
 * @param lo The smallest value it can have
 * @param hi The largest value it can have
 * @returns  `v`, or `lo` or `hi` if `v` was outside that range
 */
export function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/**
 * A brief burst of color
 *
 * @param cx      The x coordinate of the center of the burst
 * @param cy      The y coordinate of the center of the burst
 * @param r       The radius of the burst
 * @param color   The HTML hex color of the burst
 * @param seconds How long it lasts
 */
function flash(cx: number, cy: number, r: number, color: string, seconds: number) {
  const f = new Actor({
    appearance: new FilledCircle({ radius: r, fillColor: color, z: 1 }),
    rigidBody: new CircleBody({ cx, cy, radius: 0.01 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(seconds, false, () => f.remove()));
}

// ANCHOR: blast_fn
/**
 * A burst that does something to every actor that it touches.  The burst is a round
 * touch plate, so JetLag works out what is inside it, and no distances are needed.
 *
 * @param cx       The x coordinate of the center of the burst
 * @param cy       The y coordinate of the center of the burst
 * @param r        The radius of the burst
 * @param color    The HTML hex color of the burst
 * @param seconds  How long it lasts
 * @param eligible Which actors the burst affects
 * @param onTouch  What to do to each one that it touches
 */
export function blast(cx: number, cy: number, r: number, color: string, seconds: number, eligible: (other: Actor) => boolean, onTouch: (other: Actor) => void) {
  const b = new Actor({
    appearance: new FilledCircle({ radius: r, fillColor: color, z: 1 }),
    rigidBody: new CircleBody({ cx, cy, radius: r }),
    behaviors: new TouchPlateBehavior({ eligible, onEnter: (_self: Actor, other: Actor) => onTouch(other) }),
  });
  stage.world.timer.addEvent(new TimedEvent(seconds, false, () => b.remove()));
}
// ANCHOR_END: blast_fn

/**
 * A solid wall
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 */
function wall(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#1a1428" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * An arrow near the middle of the HUD that points toward something that's off screen, and
 * says what it is
 *
 * @param hero The hero, whom the arrow points away from
 *
 * @returns An object with a `point` function.  Give it a target (an actor, with a label), and the
 *          arrow points at it if it's off screen.  Give it nothing, or something that's on screen,
 *          and the arrow disappears.
 */
export function makeArrow(hero: Actor) {
  const arrow = new FilledPolygon({ vertices: [{ x: 0.45, y: 0 }, { x: -0.25, y: -0.28 }, { x: -0.25, y: 0.28 }], fillColor: "#00000000" });
  const arrowActor = new Actor({
    appearance: arrow,
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.01 }, { scene: stage.hud, collisionsEnabled: false }),
  });
  let arrowLabel = "";
  // ANCHOR: hud_arrow
  hudText(0.3, 7.9, 22, "#ffe08a", () => arrowLabel ? `(arrow: ${arrowLabel})` : "", { outline: "#000000" });
  // ANCHOR_END: hud_arrow
  return {
    point: (pick?: { actor: Actor, label: string }) => {
      arrow.fillColor = "#00000000";
      arrowLabel = "";
      if (!pick) return;
      const cam = stage.world.camera;
      const p = pick.actor.rigidBody.getCenter();
      if (p.x > cam.getLeft() && p.x < cam.getRight() && p.y > cam.getTop() && p.y < cam.getBottom()) return;
      const h = hero.rigidBody.getCenter();
      const ang = Math.atan2(p.y - h.y, p.x - h.x);
      arrowActor.rigidBody.setCenter(8 + Math.cos(ang) * 3.6, 4.5 + Math.sin(ang) * 3.6);
      arrowActor.rigidBody.rotation = ang;
      arrow.fillColor = pick.label == "portal" ? "#39c2ff" : "#ffe08a";
      arrowLabel = pick.label;
    },
  };
}
