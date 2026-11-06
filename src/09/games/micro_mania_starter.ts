import { initializeAndLaunch, JetLagGameConfig } from "jetlag2d";
import { splashBuilder } from "./micro_mania_starter_screens";

/**
 * STARTER CODE for Micro Mania.
 *
 * The microgames, the state of a run (`Run`), and the pieces that the screens are made of (`title`, `label`, `button`) are in
 * `helpers.ts`.  The cabinet is split across files, the way a real game would be: this file configures the game, and launches the
 * first screen; the screens are in `micro_mania_starter_screens.ts`; and the rules of a run are in `micro_mania_starter_flow.ts`.
 * But each part of the cabinet is missing one thing: the splash screen never goes anywhere, a run is forgotten as soon as it is
 * made, there is no music, the best score is forgotten when the page is reloaded, the help screen has no song of its own, and P
 * doesn't pause.  The comments say what each one needs.
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
