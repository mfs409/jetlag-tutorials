import { initializeAndLaunch, JetLagGameConfig } from "jetlag2d";
import { splashBuilder } from "./micro_mania_screens";

/**
 * Micro Mania: a cabinet of five-second microgames, played back to back,
 * faster and faster, until you run out of lives.
 *
 * The game is split across files the way a real game would be:
 * - this file: configuration, and launching the first screen
 * - micro_mania_screens.ts: the splash, menu, help, "get ready",
 *   game-over, and pause screens
 * - micro_mania_flow.ts: the state of a run (lives, score, speed) and
 *   the rules for moving from one screen to the next
 * - helpers.ts: the microgames themselves, the state of a run, and the pieces that screens are made of
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
