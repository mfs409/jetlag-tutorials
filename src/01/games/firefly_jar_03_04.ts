import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, stage, TextSprite, TimedEvent } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * Firefly Jar, milestone 3, step 4: new fireflies keep blinking on, but only in the open, and they never go away.
 */
function builder() {
  // The garden's hedges, as rectangles (left, top, right, bottom)
  const HEDGES = [
    { l: 3.25, t: 0, r: 3.75, b: 3.2 },
    { l: 3.25, t: 5.8, r: 3.75, b: 9 },
    { l: 5.5, t: 2.0, r: 10.5, b: 2.5 },
    { l: 5.5, t: 6.5, r: 10.5, b: 7.0 },
    { l: 12.25, t: 1.5, r: 12.75, b: 4.1 },
    { l: 12.25, t: 4.9, r: 12.75, b: 7.5 },
    { l: 12.75, t: 1.5, r: 15.0, b: 2.0 },
    { l: 12.75, t: 7.0, r: 14.2, b: 7.5 },
    { l: 8.75, t: 0, r: 9.25, b: 1.1 },
    { l: 6.75, t: 7.9, r: 7.25, b: 9 },
    { l: 10.5, t: 3.6, r: 11.0, b: 5.4 },
  ];

  // The garden's trees, as circles (center and radius)
  const TREES = [
    { cx: 1.6, cy: 1.4, radius: 0.6 },
    { cx: 1.8, cy: 7.6, radius: 0.7 },
    { cx: 8.0, cy: 4.5, radius: 0.8 },
    { cx: 6.2, cy: 1.0, radius: 0.45 },
    { cx: 10.8, cy: 8.0, radius: 0.5 },
    { cx: 14.8, cy: 0.7, radius: 0.4 },
  ];

  // How often a new firefly blinks on
  const SPAWN_FREQ = 1.3;

  // How far a firefly's glow reaches, in meters
  const GLOW_RADIUS = 0.45;

  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // Set the color of the background
  stage.backgroundColor = "#0b1430";

  // Draw the hedges as solid, labeled gray boxes
  for (const hedge of HEDGES) {
    new Actor({
      appearance: [
        new FilledBox({ width: hedge.r - hedge.l, height: hedge.b - hedge.t, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "hedge"),
      ],
      rigidBody: new BoxBody({ cx: (hedge.l + hedge.r) / 2, cy: (hedge.t + hedge.b) / 2, width: hedge.r - hedge.l, height: hedge.b - hedge.t }),
      behaviors: new SolidBehavior(),
    });
  }

  // Draw the trees as solid, labeled gray circles
  for (const tree of TREES) {
    new Actor({
      appearance: [
        new FilledCircle({ radius: tree.radius, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "tree"),
      ],
      rigidBody: new CircleBody({ cx: tree.cx, cy: tree.cy, radius: tree.radius }),
      behaviors: new SolidBehavior(),
    });
  }

  // The main character, who starts at the left
  const hero = new Actor({
    appearance: [
      new FilledCircle({ radius: 0.35, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#111827" }, "you"),
    ],
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }, { dynamic: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // The arrow keys say which way the hero wants to go.  `dx` is -1 (left), 0,
  // or 1 (right), and `dy` is -1 (up), 0, or 1 (down).
  //
  // The key handlers set or clear dx/dy, and a helper function computes the
  // actual velocity.
  const speed = 5;
  let dx = 0;
  let dy = 0;

  // Turn the direction into a velocity whose *length* is 5
  const updateVelocity = () => {
    const length = Math.hypot(dx, dy);
    // If the length is 0, dx == dy == 0, so we can't divide by length, we need
    // to just use 0.
    const scale = length > 0 ? speed / length : 0;
    hero.rigidBody.xVelocity = dx * scale;
    hero.rigidBody.yVelocity = dy * scale;
  };

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => { dx = 1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => { dx = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => { dx = -1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => { dx = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => { dy = -1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_UP, () => { dy = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => { dy = 1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_DOWN, () => { dy = 0; updateVelocity(); });

  // ANCHOR: spawners
  // A new firefly blinks on every so often, somewhere in the open
  stage.world.timer.addEvent(new TimedEvent(SPAWN_FREQ, true, () => {
    const spot = randomOpenSpot(GLOW_RADIUS);
    makeFirefly(spot.cx, spot.cy);
  }));

  // One firefly is already lit when the game starts
  makeFirefly(5.5, 4.5);
  // ANCHOR_END: spawners
}

/**
 * Make one firefly at (cx, cy).  For now, it's a light gray box with a label, on a round rigid body.  It has a
 * CollectableBehavior, so when the hero touches it, it disappears, and the "fireflies" counter goes up by one.
 *
 * @param cx The X coordinate of the firefly's center
 * @param cy The Y coordinate of the firefly's center
 */
function makeFirefly(cx: number, cy: number) {
  new Actor({
    appearance: [new FilledBox({ width: 0.55, height: 0.55, fillColor: "#d1d5db" }), new TextSprite({ center: true, face: "Arimo Regular", size: 11, color: "#111827" }, "firefly")],
    rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
    behaviors: new CollectableBehavior({ onCollect: "fireflies" }),
  });
}

// ANCHOR: random_open_spot
/**
 * Pick a random spot where a firefly fits: all of its glow is on the screen, and nothing else (a hedge, a tree, the
 * jar, the hero, or another firefly) is in the way
 *
 * @param glowRadius How far the firefly's glow reaches, in meters
 *
 * @returns The cx/cy of an available spot
 */
function randomOpenSpot(glowRadius: number) {
  while (true) {
    // Keep the whole glow on the screen, which is 16 meters wide and 9 meters tall
    const cx = glowRadius + Math.random() * (16 - 2 * glowRadius);
    const cy = glowRadius + Math.random() * (9 - 2 * glowRadius);
    // Ask the world what's near that spot, in a square the size of the glow.  If the answer is "nothing", we're done.
    // Otherwise, pick a different spot.
    if (stage.world.physics.actorsAt({ x: cx, y: cy }, 2 * glowRadius).length == 0) return { cx, cy };
  }
}
// ANCHOR_END: random_open_spot

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
