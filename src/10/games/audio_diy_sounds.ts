import { Actor, BoxBody, DebugToggle, FilledBox, JetLagGameConfig, initializeAndLaunch, stage } from "jetlag2d";
import { drawMuteButton } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  // Here's where we name all the images/sounds/background music files.
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    soundNames: [
      "flap_flap.ogg",
      "high_pitch.ogg",
      "low_pitch.ogg",
      "lose_sound.ogg",
      "slow_down.ogg",
      "win_sound.ogg",
    ],
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

  // Not every sound should be tied to one of the six built-in
  // SoundEffectComponent events.  This shows how to play a sound directly,
  // via stage.musicLibrary.getSound() -- useful for anything triggered by a
  // gesture rather than a physics event.

  // Every web page needs a user gesture before it's allowed to play audio
  drawMuteButton({ cx: 15.5, cy: 0.5, width: 1, height: 1, scene: stage.hud });

  // Tapping this repeatedly layers a new copy of the sound on top of the old
  // ones, since play() doesn't check whether one is already running.
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#0000FF" }),
    rigidBody: new BoxBody({ cx: 1.5, cy: 1.5, width: 0.75, height: 0.75 }),
    gestures: {
      onTap: () => {
        let x = stage.musicLibrary.getSound("lose_sound.ogg").play();
        console.log(x);
        return true;
      },
    },
  });

  // playing() can guard against that: this one won't start a second copy
  // while the first is still going.
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#00FFFF" }),
    rigidBody: new BoxBody({ cx: 3.5, cy: 1.5, width: 0.75, height: 0.75 }),
    gestures: {
      onTap: () => {
        let sound = stage.musicLibrary.getSound("lose_sound.ogg");
        if (!sound.playing()) sound.play();
        return true;
      },
    },
  });

  // stop() with no argument affects *every* currently-playing copy of the
  // sound, not just the one this actor started.
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#00FF00" }),
    rigidBody: new BoxBody({ cx: 5.5, cy: 1.5, width: 0.75, height: 0.75 }),
    gestures: {
      onTap: () => {
        let sound = stage.musicLibrary.getSound("lose_sound.ogg");
        if (sound.playing()) sound.stop();
        else sound.play();
        return true;
      },
    },
  });

  // Same idea, but pause() instead of stop() -- and pause() also affects
  // every currently-playing copy, not just this actor's.
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#FF00FF" }),
    rigidBody: new BoxBody({ cx: 7.5, cy: 1.5, width: 0.75, height: 0.75 }),
    gestures: {
      onTap: () => {
        let sound = stage.musicLibrary.getSound("lose_sound.ogg");
        if (sound.playing()) sound.pause();
        else sound.play();
        return true;
      },
    },
  });

  // ANCHOR: one_copy
  // play() returns a number identifying that specific copy of the sound.
  // Saving it (here, in a variable that the tap handler can see) lets
  // playing()/pause() target *this* copy instead of affecting every copy at
  // once, which is the only way to manage several overlapping sounds
  // independently.  -1 is smaller than any value returned by play().
  let soundId = -1;
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody({ cx: 9.5, cy: 1.5, width: 0.75, height: 0.75 }),
    gestures: {
      onTap: () => {
        let sound = stage.musicLibrary.getSound("lose_sound.ogg");
        if (sound.playing(soundId)) sound.pause(soundId);
        else soundId = sound.play();
        return true;
      },
    },
  });
  // ANCHOR_END: one_copy
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
