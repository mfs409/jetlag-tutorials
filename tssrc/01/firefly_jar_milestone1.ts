import { Actor, BoxBody, CircleBody, DebugToggle, DynamicBodyMovement, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, stage, TextSprite } from "../jetlag";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    prefix: "../assets/",
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * MILESTONE 1 for Firefly Jar (the end of Part 1).
 *
 * The garden is solid, every shape has a label so it's easy to tell what's
 * what, and the hero can walk around with the arrow keys.  Everything is still
 * plain gray, and there's nothing to do but walk around.
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

  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // Set the color of the background
  stage.backgroundColor = "#1f2937";

  // ANCHOR: solid_labeled
  // Draw the hedges as solid gray boxes.  Each one's appearance is a list: a
  // gray box, with a text label on top.
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
  // ANCHOR_END: solid_labeled

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

  // ANCHOR: hero
  // The main character, who moves via the arrow keys
  const hero = new Actor({
    appearance: [
      new FilledBox({ width: 0.7, height: 0.7, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#111827" }, "you"),
    ],
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }),
    movement: new DynamicBodyMovement(),
    behaviors: new PlayerControlBehavior(),
  });
  // ANCHOR_END: hero
  // ANCHOR: keys
  const speed = 5;
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = -speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = -speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = 0));
  // TODO if up and right are pressed at the same time, the total velocity will actually be 5 * sqrt(2)
  // ANCHOR_END: keys

  // TODO (Part 2): Every second or so, a firefly should appear at a random open
  // spot, and disappear on its own a few seconds later if nobody catches it.
  //
  // TODO (Part 2): Make a jar that activates once the hero has caught 10
  // fireflies.
  //
  // TODO (Part 2): If 45 seconds pass, the game is lost.
  //
  // TODO (Part 2): The HUD should shows how many fireflies are caught and how
  // many seconds are left until dawn.
  //
  // TODO (Part 2, bonus): Add a rare golden firefly that counts as three.
  //
  // TODO (Part 3): Make it look good.

  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 22, color: "#9ca3af" }, "Walk around the garden (arrow keys)"),
    rigidBody: new BoxBody({ cx: 0.3, cy: 0.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}

// NB: `export` keeps TypeScript from complaining that nothing uses this yet.
//     Part 2 will use it.
/**
 * Pick a random spot where a firefly fits: nothing else (a hedge, a tree, the
 * jar, the hero, or another firefly) is in the way
 *
 * @returns The cx/cy of an available spot
 */
export function randomOpenSpot() {
  // The size of a firefly's outer glow (a circle with a radius of 0.45)
  const fireflySize = 0.9;
  while (true) {
    // NB: Don't go all the way from 0,0 to 16,9, or else some of the circle
    //     will be off screen
    const cx = 0.5 + Math.random() * 15;
    const cy = 0.6 + Math.random() * 7.9;
    // Ask the world what's near that spot.  If the answer is "nothing", we're
    // done.  Otherwise, pick a different spot.
    if (stage.world.physics.actorsAt({ x: cx, y: cy }, fireflySize).length == 0) return { cx, cy };
  }
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
