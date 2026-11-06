import { Actor, BoxBody, FilledBox, initializeAndLaunch, JetLagGameConfig, stage } from "jetlag2d";
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
 * STARTER CODE for Penguin Heist.
 *
 * The world is built for you, in `helpers.ts`: the frozen lake, the snowdrifts, the
 * camp's fence and tents, the igloo, the fish, the HUD, and the end screens.  The
 * penguin is there too, but nothing moves it yet, and nobody is guarding anything.
 * The comments in the builder say what each missing piece needs.
 */
function builder() {
  const camp = startLevel(builder);
  const penguin = camp.penguin;
  stage.world.camera.setCameraFocus(penguin);

  // TODO (Boots): The arrow keys (or WASD) should walk the penguin at `BOOT_SPEED`,
  // and it should stop when you let go.  Diagonals shouldn't be faster than going straight,
  // which means looking at both axes at once: keep track of which keys are held, and set
  // the penguin's velocity from all of them whenever a key goes down or up.
  // (A key that is held keeps going down, over and over, so nothing needs to run on every frame.)

  // ANCHOR: ice_actors
  // The ice is only a picture for now: it has no physics.
  for (const i of ICE) {
    new Actor({
      appearance: new FilledBox({ width: i.r - i.l, height: i.b - i.t, fillColor: "#bfe4f2", z: -2 }),
      rigidBody: new BoxBody({ cx: (i.l + i.r) / 2, cy: (i.t + i.b) / 2, width: i.r - i.l, height: i.b - i.t }, { collisionsEnabled: false }),
    });
  }
  // ANCHOR_END: ice_actors

  // TODO (Skates): Space should swap the penguin between boots and skates, by swapping its
  // movement component.  On skates, the held keys push the penguin like tilting the world
  // (use `TiltMovement`, and `stage.accelerometer`), so it speeds up gradually and glides.
  // On ice the penguin should glide (`ICE_DAMPING`), and on snow it should drag
  // (`SNOW_DAMPING`).  Add a `TouchPlateBehavior` to each patch of ice above, to count how many
  // patches the penguin is on.  Show which one it's wearing: its outline (`camp.outline`)
  // color, and the HUD text at (0.3, 0.15).

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
