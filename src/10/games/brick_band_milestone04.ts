import { initializeAndLaunch, JetLagGameConfig, stage, Actor, BoxBody, TextSprite, TimedEvent, Scene, SoundEffectComponent, ImageSprite, KeyCodes } from "jetlag2d";
import { welcome, startLevel } from "./helpers";

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    soundNames: ["high_pitch.ogg", "low_pitch.ogg", "lose_sound.ogg", "win_sound.ogg", "slow_down.ogg", "flap_flap.ogg"],
  };
}
// ANCHOR_END: config

/**
 * MILESTONE 4 for Brick Band: points pop up and fade.  The comments say what each remaining piece needs.
 */

// ANCHOR: note_fn
/**
 * Play a sound at a particular pitch and volume.  `play()` starts a new,
 * independent copy of the sound, and gives back a number that names *that*
 * copy, so the rate and the volume only change that one.
 *
 * @param file   The name of the sound (it has to be in `Config.resources`)
 * @param rate   How fast to play it: 1 is normal, 2 is twice as fast, and
 *               therefore an octave higher
 * @param volume How loud to play it, from 0 to 1
 */
function note(file: string, rate: number, volume = 1) {
  const s = stage.musicLibrary.getSound(file);
  if (!s) return;
  const id = s.play();
  s.rate(rate, id);
  s.volume(volume, id);
}
// ANCHOR_END: note_fn

// ANCHOR: pop_text
/**
 * Floating "+points" text, drawn above the bricks (z = 2), that drifts upward
 * and then disappears
 *
 * @param x     The x coordinate where the text starts
 * @param y     The y coordinate where the text starts
 * @param text  The text
 * @param color The HTML hex color of the text
 */
function popText(x: number, y: number, text: string, color: string) {
  const t = new Actor({
    appearance: new TextSprite({ center: true, face: "Roboto Black", size: 22, color, strokeColor: "#000000", strokeWidth: 4, z: 2 }, text),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  let age = 0;
  stage.world.timer.addEvent(new TimedEvent(0.03, true, () => {
    age += 0.03;
    const c = t.rigidBody.getCenter();
    t.rigidBody.setCenter(c.x, c.y - 0.02);
    if (age > 0.7) t.remove();
  }));
}
// ANCHOR_END: pop_text

// ANCHOR: say_fn
/**
 * The announcer: say something out loud, interrupting anything that is already being said
 *
 * @param text What to say
 */
function say(text: string) {
  stage.speech.stop();
  stage.speech.speak({ text, rate: 1.1, pitch: 1.2 });
}
// ANCHOR_END: say_fn

// ANCHOR: hud_fn
/**
 * Some text on the HUD.  `text` is a function, so it's asked again on every frame.
 *
 * @param x     The x coordinate of the left side of the text
 * @param y     The y coordinate of the top of the text
 * @param size  The font size
 * @param face  The name of the font
 * @param color The HTML hex color of the text
 * @param text  A function that says what the text should be
 */
function hud(x: number, y: number, size: number, face: string, color: string, text: () => string) {
  new Actor({
    // TODO (HUD): The HUD says what the numbers were when it was made, and never changes.  A `TextSprite` can be given a function instead of a string, which it asks again on every frame.
    appearance: new TextSprite({ center: false, face, size, color }, text()),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}
// ANCHOR_END: hud_fn

/** Build one level of the game */
function builder() {
  // The game, and the score and the combo, come from `helpers.ts`, and call the feedback functions below.
  const { levelDone, yes, no } = startLevel(builder, {
    // ANCHOR: wall_sound_def
    wallSounds: () => new SoundEffectComponent({ collide: "low_pitch.ogg" }),
    // ANCHOR_END: wall_sound_def
    note, say, popText, hud,
  });

  // TODO (Win and lose): Clearing every brick wins the level (the "bricks" counter is in `stage.score.counters`), and running out of balls (`r.lives`) loses.  A condition
  // is a function that is asked again on every tick, and the level is won (or lost) the moment that it says `true`.
  stage.score.addWinCondition(() => false);
  stage.score.winSceneBuilder = (overlay: Scene) => levelDone(overlay);
  stage.score.addLoseCondition(() => false);

  // ANCHOR: continue_prompt
  /**
   * "Continue?"
   */
  function continuePrompt(overlay: Scene, screenshot: ImageSprite) {
    new Actor({ appearance: screenshot, rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: overlay }) });
    // TODO (Continue): The prompt is only a line of text, which you answer with the Y and N keys.  Make it look like a box: one actor, with several appearance components, each drawn at
    // its own `offset` from the actor's center (a rounded box, "Continue?", "(it costs half your score)", and a Yes button and a No button), and a tap handler that
    // works out which half of the box was tapped (`yes()` or `no()`).
    new Actor({
      appearance: new TextSprite({ center: true, face: "Roboto Black", size: 40, color: "#ffffff" }, "Continue?  Y or N  (it costs half your score)"),
      rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 0.1, height: 0.1 }, { scene: overlay }),
    });
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_Y, yes);
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_N, no);
  }
  // ANCHOR_END: continue_prompt

  // ANCHOR: lose_scene
  // Running out of balls offers a continue
  stage.score.loseSceneBuilder = continuePrompt;
  // ANCHOR_END: lose_scene
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
// ANCHOR: launch_call
initializeAndLaunch("game-player", new Config(), () => welcome(builder));
// ANCHOR_END: launch_call
