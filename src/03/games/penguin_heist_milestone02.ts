import { Actor, BoxBody, FilledBox, initializeAndLaunch, JetLagGameConfig, KeyCodes, PassThroughMovement, stage, TiltMovement, TouchPlateBehavior } from "jetlag2d";
import { hudText } from "../common/common";
import { startLevel, makeFish } from "./helpers";

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
export const BOOT_SPEED = 3.2;

/** How hard skates push */
export const SKATE_PUSH = 3.5;

/** How much the penguin slows down on ice */
export const ICE_DAMPING = 1.3;

/** How much the penguin slows down while wearing skates */
export const SNOW_DAMPING = 7;

/** How fast the walrus chases the penguin */
export const WALRUS_SPEED = 1.2;

/** How fast the gull chases the penguin */
export const GULL_SPEED = 2.7;

/** How far a seal can see when it stops to look around */
export const SEAL_SIGHT = 1.8;

/**
 * MILESTONE 2 for Penguin Heist: boots and skates work.  The comments in the builder
 * say what each remaining piece needs.
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

  // TODO (Walrus): The walrus, a `ChaseMovement` that chases only the penguin's Y, guarding the fence just
  // inside it (x = 28.5).  Touching it gets you caught (`caught`, from `./helpers`).

  // TODO (Seals): Seals that patrol the camp on fixed routes, over and over.  At some corners, a seal
  // should stop for a moment and look around (show it), and getting close to a seal
  // while it's looking gets you caught.  Bumping into a seal gets you caught any time.
  // Write a `seal` helper, and call it three times, with the routes from the game.

  // The fish.  Grabbing it wakes up the gull.
  makeFish(() => {
    // TODO (Gull): Once the penguin has the fish, a gull should appear and chase it everywhere.
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
