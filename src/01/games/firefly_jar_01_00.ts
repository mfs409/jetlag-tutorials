import { DebugToggle, initializeAndLaunch, JetLagGameConfig } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
}

/**
 * Firefly Jar, milestone 1, step 0: the shell of every game: it runs, and there's nothing in it.
 */
function builder() {
  // Pressing 'b' will show hit boxes
  DebugToggle.enable();
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
