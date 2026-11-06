import { initializeAndLaunch, JetLagGameConfig } from "jetlag2d";
import { splashBuilder } from "./micro_mania_m3_screens";

/**
 * MILESTONE 3 for Micro Mania: the music plays.  The comments in the screens and the flow say what each remaining piece needs.
 */
/** Screen dimensions and the names of everything the game loads */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    musicNames: ["tune.ogg", "tune2.ogg"],
    soundNames: ["win_sound.ogg", "lose_sound.ogg"],
    imageNames: ["sprites.json"],
  };
}

// ANCHOR: launch
// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), splashBuilder);
// ANCHOR_END: launch
