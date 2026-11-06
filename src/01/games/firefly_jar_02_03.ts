import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, stage } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
}

/**
 * Firefly Jar, milestone 2, step 3: the hero has a PlayerControlBehavior, so the solid hedge and tree stop it.
 */
function builder() {
  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // Set the color of the background
  stage.backgroundColor = "#0b1430";

  // ANCHOR: first_obstacles
  // A hedge, which is a box, and a tree, which is a circle, both in the hero's way
  new Actor({
    appearance: new FilledBox({ width: 0.5, height: 3.2, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
    rigidBody: new BoxBody({ cx: 3.5, cy: 4.5, width: 0.5, height: 3.2 }),
    behaviors: new SolidBehavior(),
  });

  new Actor({
    appearance: new FilledCircle({ radius: 0.8, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.8 }),
    behaviors: new SolidBehavior(),
  });
  // ANCHOR_END: first_obstacles

  // ANCHOR: hero
  // The main character, who starts at the left
  const hero = new Actor({
    appearance: new FilledCircle({ radius: 0.35, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }, { dynamic: true }),
    behaviors: new PlayerControlBehavior(),
  });
  // ANCHOR_END: hero

  // ANCHOR: keys
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
  // ANCHOR_END: keys
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
