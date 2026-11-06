import { Actor, BoxBody, ChaseMovement, CircleBody, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, KeyCodes, PassThroughMovement, Path, PathMovement, ProximityBehavior, stage, TiltMovement, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { hudText } from "../common/common";
import { startLevel, makeFish, caught } from "./helpers";

// [mfs] We should be very deliberate in the milestones.  A milestone should not
// say "do something 10 times", nor should it say "do 10 things".  It should say
// "do the thing once, in a specific place, and then maybe play with the numbers
// a bit".  Then the next milestone can start with "ok, you did it once, notice
// I did it a few more times for you!".  That way, even when the game is 600
// lines (a daunting volume for a student), they only need to look at one thing.

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

// ANCHOR: ice
/** The ice on the map, as rectangles.  Everything else is snow. */
const ICE = [
  { l: 12, t: 0, r: 27.5, b: 9 },
  { l: 30.5, t: 3.9, r: 41.5, b: 5.1 },
];
// ANCHOR_END: ice

/** How fast the penguin walks in boots */
const BOOT_SPEED = 3.2;

/** How hard skates push */
const SKATE_PUSH = 3.5;

/** How much the penguin slows down on ice */
const ICE_DAMPING = 1.3;

/** How much the penguin slows down while wearing skates */
const SNOW_DAMPING = 7;

/** How fast the walrus chases the penguin */
const WALRUS_SPEED = 1.2;

/** How fast the gull chases the penguin */
const GULL_SPEED = 2.7;

/** How far a seal can see when it stops to look around */
const SEAL_SIGHT = 1.8;

/**
 * Penguin Heist: sneak out of your igloo, cross the frozen lake, slip past the
 * walrus guarding the fence, steal a fish from the polar bears' camp, and get
 * home without being caught.
 *
 * Space swaps the penguin's movement between "boots" and "skates".  Boots are
 * slow, but stop quickly.  Skates are fast on ice, but hard to stop. The guards
 * use the automated policies: seals follow fixed patrol routes (stopping to
 * look around at some corners), the walrus chases you along the fence in Y
 * only, and once you have the fish, a gull chases you everywhere.  A compass
 * arrow on the HUD points toward the fish (and then the igloo).
 */
function builder() {
  const camp = startLevel(builder);
  const penguin = camp.penguin;
  stage.world.camera.setCameraFocus(penguin);

  // ANCHOR: held
  // Keep track of which directions are held down right now.  A key that stays
  // down keeps going down, because the keyboard repeats, so nothing needs to
  // run on every frame.
  const held = { l: false, r: false, u: false, d: false };
  // ANCHOR_END: held

  // ANCHOR: refresh
  // How many ice patches the penguin is on right now (the skates milestone sets
  // this up)
  let onIce = 0;

  // What the penguin does, given the held keys.  On boots, its velocity is the direction
  // times `BOOT_SPEED`.  On skates, the held keys write into the accelerometer, and
  // `TiltMovement` turns that into a force, so the penguin glides on ice, and drags on snow.
  const adjustPenguinSpeed = () => {
    // Which way do the held keys say to go?  Each of x and y starts out as -1, 0, or 1.
    let x = (held.r ? 1 : 0) - (held.l ? 1 : 0);
    let y = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    // On a diagonal, (x, y) is sqrt(2) long, which would make the penguin faster.
    // Scaling both by 1 / sqrt(2) makes the length 1 again.
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    if (penguin.movement instanceof TiltMovement) {
      stage.accelerometer.accel.Set(x * SKATE_PUSH, y * SKATE_PUSH);
      penguin.rigidBody.setDamping(onIce > 0 ? ICE_DAMPING : SNOW_DAMPING);
    } else {
      penguin.rigidBody.setVelocity(x * BOOT_SPEED, y * BOOT_SPEED);
    }
  };
  // ANCHOR_END: refresh

  // ANCHOR: keys
  // Each direction has two keys, one on the arrows and one on WASD.  When one goes
  // down, its direction is held.  When it goes up, it isn't.  Either way, `refresh`
  // decides what the penguin does about it.
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; adjustPenguinSpeed(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = false; adjustPenguinSpeed(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; adjustPenguinSpeed(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = false; adjustPenguinSpeed(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = true; adjustPenguinSpeed(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = false; adjustPenguinSpeed(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = true; adjustPenguinSpeed(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = false; adjustPenguinSpeed(); });
  // ANCHOR_END: keys

  // ANCHOR: ice_actors
  // The ice is drawn on the ground.  Each patch also has a `TouchPlateBehavior`,
  // which says when the penguin steps on, and off.
  for (const i of ICE) {
    new Actor({
      appearance: new FilledBox({ width: i.r - i.l, height: i.b - i.t, fillColor: "#bfe4f2", z: -2 }),
      rigidBody: new BoxBody({ cx: (i.l + i.r) / 2, cy: (i.t + i.b) / 2, width: i.r - i.l, height: i.b - i.t }, { collisionsEnabled: false }),
      behaviors: new TouchPlateBehavior({
        onEnter: () => { onIce += 1; adjustPenguinSpeed(); },
        onLeave: () => { onIce -= 1; adjustPenguinSpeed(); },
      }),
    });
  }
  // ANCHOR_END: ice_actors

  // ANCHOR: skates
  // Skates are driven by tilt, and these are the biggest push that the
  // simulated accelerometer will ever report
  stage.tilt.tiltMax.Set(SKATE_PUSH, SKATE_PUSH);

  // Space swaps the penguin's whole movement component, and its outline
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    if (penguin.movement instanceof TiltMovement) {
      penguin.movement = new PassThroughMovement();
      stage.accelerometer.accel.Set(0, 0);
      penguin.rigidBody.setDamping(0);
      camp.outline.lineColor = "#8b5a2b";
    } else {
      penguin.movement = new TiltMovement();
      camp.outline.lineColor = "#27c4ff";
    }
    adjustPenguinSpeed();
  });

  // Tell the player which one they're wearing
  hudText(0.3, 0.15, 24, "#1d2328", () => penguin.movement instanceof TiltMovement ? "Skates  (Space: boots)" : "Boots  (Space: skates)");
  // ANCHOR_END: skates

  // ANCHOR: walrus
  // The walrus guards the fence, and only chases the penguin's Y.  It's a
  // kinematic body, because it's `ChaseMovement`, and not the physics engine,
  // that decides where it goes.
  new Actor({
    appearance: [
      new FilledCircle({ radius: 0.6, fillColor: "#8a5a44", lineWidth: 0.05, lineColor: "#5a3a2a" }),
      new FilledBox({ width: 0.06, height: 0.35, fillColor: "#fffbe8", offset: { dx: -0.14, dy: 0.28 } }),
      new FilledBox({ width: 0.06, height: 0.35, fillColor: "#fffbe8", offset: { dx: 0.14, dy: 0.28 } }),
    ],
    rigidBody: new CircleBody({ cx: 28.5, cy: 4.5, radius: 0.6 }, { kinematic: true }),
    movement: new ChaseMovement({ speed: WALRUS_SPEED, target: penguin, chaseInX: false }),
    behaviors: new TouchPlateBehavior({ onEnter: () => caught("The walrus caught you at the fence!") }),
  });
  // ANCHOR_END: walrus

  // ANCHOR: seals
  // The seals: patrol routes, with stops to look around
  seal(penguin, new Path().to(29.8, 1.4).to(33.8, 1.4).to(33.8, 7.6).to(29.8, 7.6).to(29.8, 1.4), [1, 3], 2.2);
  seal(penguin, new Path().to(37.3, 0.9).to(37.3, 8.1).to(37.3, 0.9), [1], 2.6);
  seal(penguin, new Path().to(40.5, 2.6).to(43.2, 2.6).to(43.2, 6.4).to(40.5, 6.4).to(40.5, 2.6), [0, 2], 1.8);
  // ANCHOR_END: seals

  // The fish.  Grabbing it wakes up the gull.
  makeFish(() => {
    // ANCHOR: gull
    // The gull appears behind the penguin, and chases it in both
    // dimensions.  It's kinematic, for the same reason the walrus is.
    const c = penguin.rigidBody.getCenter();
    new Actor({
      appearance: [
        new FilledCircle({ radius: 0.32, fillColor: "#fbfbfb", lineWidth: 0.05, lineColor: "#777777" }),
        new FilledPolygon({ vertices: [{ x: -0.7, y: 0 }, { x: 0, y: -0.12 }, { x: 0.7, y: 0 }, { x: 0, y: 0.12 }], fillColor: "#d7dde2" }),
        new FilledCircle({ radius: 0.07, fillColor: "#f2b51f", offset: { dx: 0, dy: -0.2 } }),
      ],
      rigidBody: new CircleBody({ cx: Math.max(c.x - 9, 30), cy: 0.5, radius: 0.32 }, { kinematic: true }),
      movement: new ChaseMovement({ speed: GULL_SPEED, target: penguin }),
      behaviors: new TouchPlateBehavior({ onEnter: () => caught("The gull snatched your fish!") }),
    });
    // ANCHOR_END: gull
  });
}

// Introduced in the seals milestone
// ANCHOR: seal
/**
 * A seal that follows `path` forever.  When it reaches one of the `lookouts`
 * waypoints, it stops for a moment and looks around: while it's looking,
 * getting inside its ring gets you caught.
 *
 * @param penguin  The penguin, who has to stay out of the seal's sight
 * @param path     The route the seal patrols
 * @param lookouts The waypoints (by number) where the seal stops to look
 * @param velocity How fast the seal moves along the path
 */
function seal(penguin: Actor, path: Path, lookouts: number[], velocity: number) {
  const ring = new FilledCircle({ radius: SEAL_SIGHT, fillColor: "#00000000" });
  let looking = false, inSight = false;
  /** Caught, if the seal is looking, and the penguin is in the seal's sight */
  const spot = () => { if (looking && inSight) caught("A seal spotted you!"); };
  const patrol = new PathMovement({
    path, velocity, loop: true,
    waypointCallback: (which: number) => {
      if (!lookouts.includes(which)) return;
      // Stop, look around, then carry on along the route
      patrol.pause();
      looking = true;
      ring.fillColor = "#ff3b3b30";
      spot();
      stage.world.timer.addEvent(new TimedEvent(1.6, false, () => {
        looking = false;
        ring.fillColor = "#00000000";
        patrol.resume();
      }));
    },
  });
  const s = new Actor({
    appearance: [
      ring,
      new FilledCircle({ radius: 0.45, fillColor: "#7d8a96", lineWidth: 0.05, lineColor: "#4f5a64" }),
      new FilledCircle({ radius: 0.07, fillColor: "#111111", offset: { dx: -0.14, dy: -0.12 } }),
      new FilledCircle({ radius: 0.07, fillColor: "#111111", offset: { dx: 0.14, dy: -0.12 } }),
    ],
    rigidBody: new CircleBody({ cx: path.getPoint(0).x, cy: path.getPoint(0).y, radius: 0.45 }, { kinematic: true }),
    movement: patrol,
    behaviors: [
      new TouchPlateBehavior({ onEnter: () => caught("You bumped right into a seal!") }),
      // The seal can see as far as the ring.  A proximity sensor says when the penguin comes in or goes out of range.
      new ProximityBehavior({
        onEnter: (_s: Actor, other: Actor) => { if (other === penguin) { inSight = true; spot(); } },
        onExit: (_s: Actor, other: Actor) => { if (other === penguin) inSight = false; },
      }),
    ],
  });
  s.rigidBody.proximityRadius = SEAL_SIGHT;
}
// ANCHOR_END: seal

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
