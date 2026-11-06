import { Actor, AnimatedSprite, AnimationSequence, AnimationState, CircleBody, DebugToggle, getAppearance, JetLagGameConfig, initializeAndLaunch } from "jetlag2d";

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

  // Same setup as before: a coin flipbook animation, mapped to the required
  // "IDLE_E" state.
  let coins = AnimationSequence.makeSimple({ timePerFrame: 100, repeat: true, images: ["coin0.png", "coin1.png", "coin2.png", "coin3.png", "coin4.png", "coin5.png", "coin6.png", "coin7.png"] });
  let animation_map = new Map();
  animation_map.set(AnimationState.IDLE_E, coins);

  // Draw 16 coins that all share the same animation, but use `skipTo` to
  // jump each one to a different point in the sequence.  Without this,
  // every coin would be perfectly in sync, and it would look like one coin
  // repeated 16 times instead of 16 independently-animating coins.
  //
  // `skipTo`'s first argument is which frame to start on; we use
  // `Math.trunc(i / 2)` so every two coins share a frame.  The second
  // argument is how many milliseconds into that frame to pretend have
  // already elapsed; `(i % 2) * 50` alternates between 0 and half of the
  // 100ms frame time, so those paired coins are still offset from each
  // other by half a frame.
  for (let i = 0; i < 16; ++i) {
    let coin = new Actor({
      appearance: new AnimatedSprite({ width: 0.5, height: 0.5, animations: animation_map }),
      rigidBody: new CircleBody({ cx: i + 0.5, cy: 2, radius: 0.25 }),
    });
    getAppearance(coin, AnimatedSprite).skipTo(Math.trunc(i / 2), (i % 2) * 50);
  }
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
