import { Actor, CircleBody, DebugToggle, FilledCircle, initializeAndLaunch, JetLagGameConfig, KeyCodes, stage } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
}

/**
 * Firefly Jar, milestone 1, step 3: the hero's body is dynamic, so the right arrow walks it right.
 */
function builder() {
  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // ANCHOR: background
  // Set the color of the background
  stage.backgroundColor = "#0b1430";
  // ANCHOR_END: background

  // ANCHOR: hero
  // The main character, who starts at the left
  const hero = new Actor({
    appearance: new FilledCircle({ radius: 0.35, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }, { dynamic: true }),
  });
  // ANCHOR_END: hero

  // ANCHOR: keys
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 5));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 0));
  // ANCHOR_END: keys
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
