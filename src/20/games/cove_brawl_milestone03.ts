import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CustomBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, findBehavior, getBehavior, HealthBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, SolidBehavior, stage, TimedEvent } from "jetlag2d";
import { boundingBox, endScreen, heroBehaviors, hudText } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "pirate.json"],
  };
}

/**
 * MILESTONE 3 for Cove Brawl: the gulls all work.
 *
 * TODO (Claws): crabs whose claws turn a cutlass away, unless you swing from above or below.
 *
 * TODO (Bribes): coins that you can drop, which turn a gull to your side.
 *
 * TODO (The team table): every team's rules in one table, and a fourth team, rival pirates, that is added with data alone.
 */

/**
 * The teams.  They're only numbers, and JetLag doesn't care which numbers.
 * Zero is the default for every actor, and it means "no team": walls, coins,
 * and anything else that isn't on a side.
 */
const PIRATES = 1, CRABS = 2, GULLS = 3;
export const RIVALS = 4;

/**
 * Who hurts whom, and by how much: `HURTS[attacker][victim]`.  A team that isn't
 * in the table, such as team 0, hurts nobody.
 */
const HURTS: { [attacker: number]: { [victim: number]: number } } = {
  [PIRATES]: { [CRABS]: 1, [GULLS]: 1 },
  [CRABS]: { [PIRATES]: 1 },
  [GULLS]: { [PIRATES]: 1, [CRABS]: 2 },
};

/**
 * How much damage a touch from one team does to another.  Zero means that
 * the first team leaves the second alone.
 *
 * @param attacker The attacking team
 * @param victim   The team being touched
 */
const hurts = (attacker: number, victim: number) => HURTS[attacker]?.[victim] ?? 0;

/**
 * Which team an actor is on.  A team belongs to a behavior, and not to an
 * actor, so this takes the first behavior that has one.
 *
 * @param a The actor
 */
const teamOf = (a: Actor) => a.behaviors.find(b => b.team != 0)?.team ?? 0;

/** The four directions that the art faces */
type Face = "r" | "l" | "u" | "d";
/** What a pirate can be doing */
type Mode = "idle" | "walk" | "slash";

/** The animation state for each thing that a pirate can do, in each of the four directions */
const STATES: { [mode in Mode]: { [face in Face]: AnimationState } } = {
  idle: { r: AnimationState.IDLE_E, l: AnimationState.IDLE_W, u: AnimationState.IDLE_N, d: AnimationState.IDLE_S },
  walk: { r: AnimationState.WALK_E, l: AnimationState.WALK_W, u: AnimationState.WALK_N, d: AnimationState.WALK_S },
  // A pirate never tosses anything, so the "toss" states are free to mean "swinging a cutlass"
  slash: { r: AnimationState.TOSS_IDLE_E, l: AnimationState.TOSS_IDLE_W, u: AnimationState.TOSS_IDLE_N, d: AnimationState.TOSS_IDLE_S },
};

/**
 * A pirate who walks, and, if there's a cutlass in the art, swings it
 *
 * @param sword Use the art with the cutlass?
 * @param size  How big to draw it, in meters
 * @param now   A function that says what the pirate is doing, and which way it faces,
 *              which JetLag calls when the pirate's state changes
 * @returns     The sprite
 */
function pirateSprite(sword: boolean, size: number, now: () => { face: Face, mode: Mode }) {
  const art = sword ? "walk_s" : "walk";
  const animations = new Map<AnimationState, AnimationSequence>();
  const faces: Face[] = ["r", "l", "u", "d"];
  for (const f of faces) {
    animations.set(STATES.walk[f], AnimationSequence.makeSimple({ timePerFrame: 70, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_${art}_${f}_${i}.png`) }));
    animations.set(STATES.idle[f], AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_${art}_${f}_0.png`] }));
    if (sword) animations.set(STATES.slash[f], AnimationSequence.makeSimple({ timePerFrame: 50, repeat: false, images: [0, 1, 2, 3, 4, 5].map(i => `pirate_slash_s_${f}_${i}.png`) }));
  }
  const sprite = new AnimatedSprite({ width: size, height: size, z: 1, animations, offset: { dx: 0, dy: -0.25 } });
  // JetLag asks which animation to use whenever the actor's state changes (it
  // starts or stops moving, or changes direction), and when `restartCurrentAnimation` is called
  sprite.stateSelector = () => {
    const { face, mode } = now();
    return STATES[mode][face];
  };
  return sprite;
}

/**
 * Which of the four directions a velocity points mostly toward
 *
 * @param v The velocity
 * @param was The direction to keep if the velocity is zero
 */
const faceOf = (v: { x: number, y: number }, was: Face): Face => (Math.hypot(v.x, v.y) < 0.2 ? was : Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? "r" : "l") : (v.y > 0 ? "d" : "u"));

/** Colors for this game's end screens */
const END_STYLE = { background: "#0d2a3fdd", titleColor: "#f2c14e", detailColor: "#ffffff" };

/** Build the cove, and everything in it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#8fd3f4";
  boundingBox();
  // The beach
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#e8cf8f", z: -2 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { collisionsEnabled: false }),
  });
  // A few rocks to get around
  const rocks = [{ cx: 5.5, cy: 3, w: 1.4, h: 1.2 }, { cx: 9.5, cy: 6.3, w: 1.6, h: 1.1 }, { cx: 12.5, cy: 2.5, w: 1.1, h: 1.4 }];
  for (const rock of rocks) {
    new Actor({
      appearance: new FilledBox({ width: rock.w, height: rock.h, fillColor: "#8c7650", lineWidth: 0.05, lineColor: "#5e4e30" }),
      rigidBody: new BoxBody({ cx: rock.cx, cy: rock.cy, width: rock.w, height: rock.h }),
      behaviors: new SolidBehavior(),
    });
  }

  // --- The captain -----------------------------------------------------------
  /** Which of the four direction keys (arrows or WASD) are down right now */
  const held = { l: false, r: false, u: false, d: false };
  /** When the captain's cutlass swing ends (in `stage.renderer.now` time) */
  let slashUntil = 0;
  /** When the captain is done being knocked back by a hit */
  let stunUntil = 0;
  let facing: Face = "d";
  const captainSprite = pirateSprite(true, 2.6, () => ({
    face: facing,
    mode: stage.renderer.now < slashUntil ? "slash" : held.l || held.r || held.u || held.d ? "walk" : "idle",
  }));
  const captain: Actor = new Actor({
    appearance: captainSprite,
    rigidBody: new CircleBody({ cx: 3, cy: 6.5, radius: 0.35 }, { disableRotation: true }),
    // The captain is on the pirates' team.  Six hearts, and the level is lost if he falls.
    behaviors: heroBehaviors({ hitPoints: 6, mustSurvive: true, team: PIRATES }),
  });
  const bind = (keys: KeyCodes[], k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
  };
  bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
  bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
  stage.world.repeatEvents.push(() => {
    if (stage.renderer.now < stunUntil) return;
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    captain.rigidBody.setVelocity(dx / len * 4, dy / len * 4);
    facing = faceOf({ x: dx, y: dy }, facing);
  });

  // --- Everyone else ---------------------------------------------------------
  /** Every creature that's still in the cove, whoever's side it's on */
  const creatures: Actor[] = [];
  /**
   * Hurt an actor, with a little puff where it was hit.  The actor's
   * `HealthBehavior` does the rest, and removes it if it runs out of hit points.
   *
   * @param victim   The actor that was hit
   * @param amount   How much damage
   * @param attacker The actor that did it
   */
  const hurt = (victim: Actor, amount: number, attacker: Actor) => {
    const c = victim.rigidBody.getCenter(), a = attacker.rigidBody.getCenter();
    const health = findBehavior(victim, HealthBehavior);
    health?.damage(amount, attacker);
    // Whoever was hit can't be hit again for a moment
    if (health) health.invincibleRemaining = victim == captain ? 1 : 0.8;
    const puff = new Actor({
      appearance: new FilledCircle({ radius: 0.3, fillColor: "#ffffffcc", z: 2 }),
      rigidBody: new CircleBody({ cx: c.x, cy: c.y, radius: 0.01 }, { collisionsEnabled: false }),
    });
    stage.world.timer.addEvent(new TimedEvent(0.12, false, () => puff.remove()));
    // The captain is knocked back, and can't steer for a moment
    if (victim == captain) {
      const d = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      captain.rigidBody.setVelocity((c.x - a.x) / d * 6, (c.y - a.y) / d * 6);
      stunUntil = stage.renderer.now + 220;
    }
  };
  /**
   * What every creature does when it touches something.  It looks up what its
   * team does to the other team, and does it.  No creature has a rule of its
   * own: they all ask the team table.
   *
   * @param team The team that the creature starts on
   */
  const fighter = (team: number) => new CustomBehavior({
    team,
    onCollide: (self: Actor, other: Actor) => {
      const damage = hurts(teamOf(self), teamOf(other));
      if (damage == 0) return false;
      hurt(other, damage, self);
      return true;
    },
  });
  /**
   * The nearest living actor that a creature's team would hurt, if one is close enough to notice
   *
   * @param a     The creature
   * @param sight How far the creature can see, in meters
   */
  const nearestEnemy = (a: Actor, sight = 3.5) => {
    const c = a.rigidBody.getCenter();
    let best: Actor | undefined, bestDist = Infinity;
    // Everyone who could be a target, the captain included
    const everyone = [captain, ...creatures];
    for (const o of everyone) {
      if (o == a || !o.enabled || hurts(teamOf(a), teamOf(o)) == 0) continue;
      const p = o.rigidBody.getCenter(), d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bestDist && d < sight) { best = o; bestDist = d; }
    }
    return best;
  };
  /**
   * Keep track of a creature, until it's defeated
   *
   * @param a The creature
   */
  const register = (a: Actor) => {
    creatures.push(a);
    getBehavior(a, HealthBehavior).onDefeated = () => {
      creatures.splice(creatures.indexOf(a), 1);
      // Count the raiders that are put down (a gull that was bribed isn't one)
      if (hurts(teamOf(a), PIRATES) > 0) stage.score.counters.add("defeated", 1);
    };
    return a;
  };

  /**
   * A crab, which heads for its enemies, and pinches what it touches
   *
   * @param cx The x coordinate of the crab, and the middle of its patrol
   * @param cy The y coordinate of the crab
   */
  const crab = (cx: number, cy: number) => {
    const body = (dx: number, dy: number, r: number) => new FilledCircle({ radius: r, fillColor: "#e4572e", lineWidth: 0.04, lineColor: "#8c2a12", offset: { dx, dy } });
    const a: Actor = register(new Actor({
      appearance: [body(0, 0, 0.35), body(-0.4, -0.15, 0.13), body(0.4, -0.15, 0.13), new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: -0.1, dy: -0.2 } }), new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: 0.1, dy: -0.2 } })],
      rigidBody: new CircleBody({ cx, cy, radius: 0.35 }, { dynamic: true, disableRotation: true }),
      behaviors: [new HealthBehavior({ hitPoints: 2, team: CRABS }), fighter(CRABS)],
    }));
    let dir = 1;
    stage.world.repeatEvents.push(() => {
      if (!a.enabled) return;
      const v = a.rigidBody.getVelocity(), p = a.rigidBody.getCenter();
      // A crab heads for the nearest of its enemies, no matter how far, and speeds up when it's close
      const prey = nearestEnemy(a, 99)?.rigidBody.getCenter();
      if (prey) {
        const d = Math.hypot(prey.x - p.x, prey.y - p.y) || 1, speed = d < 3.5 ? 1.7 : 1;
        return a.rigidBody.setVelocity((prey.x - p.x) / d * speed, (prey.y - p.y) / d * speed);
      }
      // With no one left to pinch, it scuttles back and forth, and turns around when something is in the way
      if (Math.abs(v.x) < 0.3) dir = -dir;
      a.rigidBody.setVelocity(dir * 1.4, 0);
    });
    return a;
  };

  /**
   * The captain's mate, who isn't armed, and follows the captain around.  He's
   * on the pirates' team, which is the whole point.
   *
   * @param cx The x coordinate of the mate
   * @param cy The y coordinate of the mate
   */
  const mate = (cx: number, cy: number) => {
    let face: Face = "d";
    const a: Actor = register(new Actor({
      appearance: pirateSprite(false, 1.3, () => {
        const v = a.rigidBody.getVelocity();
        face = faceOf(v, face);
        return { face, mode: Math.hypot(v.x, v.y) > 0.2 ? "walk" : "idle" };
      }),
      rigidBody: new CircleBody({ cx, cy, radius: 0.3 }, { dynamic: true, disableRotation: true }),
      behaviors: [new HealthBehavior({ hitPoints: 3, team: PIRATES }), fighter(PIRATES)],
    }));
    stage.world.repeatEvents.push(() => {
      if (!a.enabled || !captain.enabled) return;
      const c = captain.rigidBody.getCenter(), p = a.rigidBody.getCenter();
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      // Stay close to the captain, but not on top of him
      a.rigidBody.setVelocity(d > 1.8 ? (c.x - p.x) / d * 3.2 : 0, d > 1.8 ? (c.y - p.y) / d * 3.2 : 0);
    });
    return a;
  };

  /**
   * The gull, as a few shapes
   *
   * @param extra Anything else to draw, such as a ring
   */
  const gullLook = (extra: FilledCircle[]) => [
    new FilledPolygon({ vertices: [{ x: -0.1, y: 0 }, { x: -0.6, y: -0.25 }, { x: -0.5, y: 0.15 }], fillColor: "#f4f4f4", lineWidth: 0.03, lineColor: "#888888" }),
    new FilledPolygon({ vertices: [{ x: 0.1, y: 0 }, { x: 0.6, y: -0.25 }, { x: 0.5, y: 0.15 }], fillColor: "#f4f4f4", lineWidth: 0.03, lineColor: "#888888" }),
    new FilledCircle({ radius: 0.2, fillColor: "#ffffff", lineWidth: 0.03, lineColor: "#888888" }),
    new FilledPolygon({ vertices: [{ x: 0, y: -0.05 }, { x: 0.12, y: 0.03 }, { x: 0, y: 0.1 }], fillColor: "#f2a31b", offset: { dx: 0.22, dy: -0.05 } }),
    ...extra,
  ];
  /**
   * A gull, which hunts whoever its team would hurt, and goes for loose coins first
   *
   * @param cx The x coordinate of the gull
   * @param cy The y coordinate of the gull
   */
  const gull = (cx: number, cy: number) => {
    const a: Actor = register(new Actor({
      appearance: gullLook([]),
      rigidBody: new CircleBody({ cx, cy, radius: 0.28 }, { dynamic: true, disableRotation: true }),
      behaviors: [new HealthBehavior({ hitPoints: 1, team: GULLS }), fighter(GULLS)],
    }));
    stage.world.repeatEvents.push(() => {
      if (!a.enabled) return;
      const p = a.rigidBody.getCenter();
      let target: { x: number, y: number } | undefined;
      // Otherwise, it fights whatever is close, and heads for the captain (to peck him, or to guard him)
      target ??= nearestEnemy(a)?.rigidBody.getCenter();
      target ??= captain.enabled ? captain.rigidBody.getCenter() : undefined;
      if (!target) return a.rigidBody.setVelocity(0, 0);
      const d = Math.hypot(target.x - p.x, target.y - p.y) || 1;
      a.rigidBody.setVelocity((target.x - p.x) / d * 2.4, (target.y - p.y) / d * 2.4);
    });
    return a;
  };

  // --- The cutlass -----------------------------------------------------------------
  /** The direction that the captain is facing, as a step */
  const FACE_STEP: { [f in Face]: { x: number, y: number } } = { r: { x: 1, y: 0 }, l: { x: -1, y: 0 }, u: { x: 0, y: -1 }, d: { x: 0, y: 1 } };
  /** When the captain can swing again */
  let slashReady = 0;
  /** Swing the cutlass at whatever is in front of the captain */
  const slash = () => {
    const now = stage.renderer.now;
    if (now < slashReady || stage.score.counters.get("mustSurviveHeroesDefeated") > 0) return;
    slashUntil = now + 300;
    slashReady = now + 400;
    // Ask the sprite to pick again: now for the swing, and again when it's over
    captainSprite.restartCurrentAnimation();
    stage.world.timer.addEvent(new TimedEvent(0.3, false, () => captainSprite.restartCurrentAnimation()));
    const c = captain.rigidBody.getCenter(), f = FACE_STEP[facing];
    // Ask the world what's in front of the captain, and use the table to decide who's in trouble
    const victims = [...stage.world.physics.actorsAt({ x: c.x + f.x * 0.9, y: c.y + f.y * 0.9 }, 1.1)];
    for (const victim of victims) {
      const damage = hurts(PIRATES, teamOf(victim));
      if (victim == captain || damage == 0) continue;
      hurt(victim, damage, captain);
    }
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, slash);

  // --- Who's here --------------------------------------------------------------------
  crab(11, 1.6); crab(12, 7.6);
  mate(2, 6);
  gull(14.5, 1);

  // --- Winning and losing ------------------------------------------------------------
  /** The creatures that would hurt the pirates, and so have to be fought */
  const raiders = () => creatures.filter(c => c.enabled && hurts(teamOf(c), PIRATES) > 0);
  // The pirates only have to hold the cove until sunset
  stage.score.counters.set("sunset", 50);
  stage.world.timer.addEvent(new TimedEvent(1, true, () => stage.score.counters.add("sunset", -1)));
  stage.score.addWinCondition(() => stage.score.counters.get("sunset") <= 0);
  /** What can come ashore, early and late */
  const kinds = [crab, gull], lateKinds = kinds;
  // Every few seconds, something new comes ashore from the east, unless the cove is already crowded
  stage.world.timer.addEvent(new TimedEvent(4, true, () => {
    const options = stage.score.counters.get("sunset") < 35 ? lateKinds : kinds;
    if (creatures.length < 9) stage.random.choice(options)(15.3, stage.random.nextRange(1.2, 7.8));
  }));
  stage.score.winSceneBuilder = (overlay) => endScreen(overlay, { title: "The sun sets on a safe cove", detail: `${stage.score.counters.get("defeated")} raiders put down, with ${findBehavior(captain, HealthBehavior)?.hitPoints} hearts left`, prompt: "Click or press Enter to play again", next: () => stage.switchTo(builder), ...END_STYLE });
  stage.score.loseSceneBuilder = (overlay) => endScreen(overlay, { title: "The captain has fallen", detail: `${stage.score.counters.get("defeated")} raiders put down, but the cove was lost`, prompt: "Click or press Enter to try again", next: () => stage.switchTo(builder), ...END_STYLE });

  // --- The HUD -----------------------------------------------------------------------
  const hearts = (a: Actor) => (a.enabled ? "♥".repeat(Math.max(0, findBehavior(a, HealthBehavior)?.hitPoints ?? 0)) : "");
  hudText(0.3, 0.1, 22, "#ff6b6b", () => `Captain ${hearts(captain)}`, { outline: "#000000" });
  hudText(5.2, 0.1, 22, "#ffffff", () => `Sunset in ${stage.score.counters.get("sunset")}   Raiders: ${raiders().length}`, { outline: "#000000" });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
