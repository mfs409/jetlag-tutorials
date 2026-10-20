import { Actor, BoxBody, DebugToggle, JetLagGameConfig, TextSprite, initializeAndLaunch } from "../jetlag";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the files (fonts, images, and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    prefix: "../assets/",
    // This should say "Arimo-Regular.ttf".  There is no file called
    // "Arimo-Regualr.ttf", so JetLag won't be able to load it
    fonts: ["Arimo-Regualr.ttf"],
  };
}

/**
 * Build the first (and only) scene of the game.
 */
function builder() {
  DebugToggle.enable();

  // This is the same kind of text that Firefly Jar uses for its labels.  It
  // asks for the face "Arimo Regular", which comes from the font file that
  // never loaded.  You should see what happens if you ask for a different
  // face, such as "Arimo Bold", and fix the file name in `fonts`
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 40, color: "#ffffff" }, "Hello, fireflies!"),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 8, height: 2 }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
