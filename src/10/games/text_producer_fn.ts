import { Actor, BoxBody, DebugToggle, JetLagGameConfig, TextSprite, initializeAndLaunch } from "jetlag2d";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json"],
  };
}

/**
 * Build the levels of the game.
 *
 * @param level Which level should be displayed
 */
function builder() {
  DebugToggle.enable();

  let tap_count = 0;
  new Actor({
    rigidBody: new BoxBody({ cx: 1, cy: 1, width: 0.5, height: 0.5 }),
    // Fix: a producer function instead of a fixed string.  JetLag calls this
    // function every time it redraws, so it always sees the current
    // `tap_count`, instead of the value from when `builder()` first ran.
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 64, color: "#FF0000aa", strokeColor: "#0000FF", strokeWidth: 2 }, () => "Taps: " + tap_count),
    gestures: {
      onTap: () => {
        tap_count += 1;
        return true;
      },
    },
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
