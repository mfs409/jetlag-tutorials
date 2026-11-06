import { Actor, CircleBody, DebugToggle, FilledCircle, initializeAndLaunch, JetLagGameConfig, stage } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
}

/**
 * Firefly Jar, milestone 1, step 1: a hero is drawn, and can't do anything.
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
  new Actor({
    appearance: new FilledCircle({ radius: 0.35, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }),
  });
  // ANCHOR_END: hero
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
