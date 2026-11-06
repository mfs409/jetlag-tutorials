import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, PlayerControlBehavior, TextSprite, TimedEvent, initializeAndLaunch, stage } from "jetlag2d";
import { currentLevel, switchToLevel } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 *
 * The key thing to notice here is the split between `loadingScreenImageNames`
 * (small enough to load before anything is drawn at all) and `imageNames`
 * (the "real" game's assets, which can be much bigger -- here, `pirate.json`
 * plus its spritesheet). Configuring `loadingScreenImageNames` is what tells
 * JetLag "don't load everything up front -- load just enough to draw level
 * 1, then let level 1 load the rest and show its own progress".
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    loadingScreenImageNames: ["blue_ball.png"],
    imageNames: ["pirate.json"],
  };
}

/**
 * Build the animations and diagonal-direction remap for a pirate
 * AnimatedSprite. This only runs once `pirate.json` has actually finished
 * loading, in level 2.
 */
function buildPirateAnimations() {
  const animations = new Map();
  animations.set(AnimationState.IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 750, repeat: true, images: ["pirate_walk_r_1.png"] }));
  return { animations, remap: undefined };
}

/**
 * Level 1 is the loading screen. It's drawn using only `blue_ball.png` (an
 * asset small enough to already be loaded by the time this function runs),
 * and it kicks off loading of the rest of the game's assets itself.
 */
function loadingScreen() {
  stage.backgroundColor = "#101820";

  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 32, color: "#FFFFFF" }, "Loading..."),
    rigidBody: new CircleBody({ cx: 8, cy: 3, radius: 0.1 }, { scene: stage.hud }),
  });

  // The spinning ball is just a bit of "juice" to prove the screen is alive
  // while assets are loading in the background -- it has nothing to do with
  // the loading mechanism itself.
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "blue_ball.png" }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.5 }, { scene: stage.hud, rotationSpeed: 0.5 }),
  });

  // This is the actual asset loading. `resources.imageNames` (`pirate.json`,
  // ~130KB) was deliberately *not* loaded before this function ran -- only
  // `loadingScreenImageNames` was. Kicking off the load here, instead of
  // letting JetLag do it before `begin()` returns, is what makes the
  // progress bar below possible to draw at all.
  const resources = CONFIG.resources;
  // The progress starts out at 2, which means "nothing is loading", so put it
  // back to 0 first.  Otherwise, the progress check below could run before
  // the first bit of loading reports in, and think that we're already done.
  stage.imageLibrary.imageLoadingProgress = 0;
  // (Images are in the `assets` folder next to the page, unless the config says otherwise)
  stage.imageLibrary.loadImageList(resources.imageNames ?? [], "./assets/");

  // A simple progress bar: a fixed-size outline, and a fill bar that we
  // rebuild every tick at a width proportional to
  // `stage.imageLibrary.imageLoadingProgress`. That field goes from 0 (just
  // started) to 1 (images decoded) to 2 (fully done, including sprite-sheet
  // bookkeeping) -- so we clamp it to `[0, 1]` for display purposes.
  const barWidth = 6,
    barX = 5,
    barY = 5.5;
  new Actor({
    appearance: new FilledBox({ width: barWidth, height: 0.6, lineWidth: 2, lineColor: "#FFFFFF", fillColor: "#101820" }),
    rigidBody: new BoxBody({ cx: barX + barWidth / 2, cy: barY, width: barWidth, height: 0.6 }, { scene: stage.hud }),
  });
  let fill: Actor | undefined;
  const percentText = new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 24, color: "#FFFFFF" }, () => {
      const pct = Math.round(Math.min(stage.imageLibrary.imageLoadingProgress, 1) * 100);
      return `${pct}%`;
    }),
    rigidBody: new CircleBody({ cx: 8, cy: 6.5, radius: 0.1 }, { scene: stage.hud }),
  });

  stage.world.timer.addEvent(
    new TimedEvent(0.05, true, () => {
      const progress = Math.min(stage.imageLibrary.imageLoadingProgress, 1);

      fill?.remove();
      if (progress > 0) {
        fill = new Actor({
          appearance: new FilledBox({ width: barWidth * progress, height: 0.5, fillColor: "#4caf50" }),
          rigidBody: new BoxBody({ cx: barX + (barWidth * progress) / 2, cy: barY, width: barWidth * progress, height: 0.5 }, { scene: stage.hud }),
        });
      }

      // `imageLoadingProgress` is only set to exactly `2` once loading (and
      // the sprite-sheet bookkeeping that follows it) is entirely finished --
      // that's our cue that it's safe to move on to the real game.
      if (stage.imageLibrary.imageLoadingProgress >= 2)
        switchToLevel(builder, 2);
    }),
  );

  // Silence an unused-variable warning; `percentText` only exists to be
  // drawn, its `Actor` handle isn't needed for anything else.
  void percentText;
}

/** Level 2 is the real game -- a tiny scene using the pirate spritesheet
 * that we just finished loading, to prove it's actually available now. */
function realGame() {
  stage.backgroundColor = "#b3cde0";
  const { animations, remap } = buildPirateAnimations();
  new Actor({
    appearance: new AnimatedSprite({ width: 1.5, height: 1.5, animations, remap }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.6 }, { density: 1, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 24, color: "#000000" }, "Loaded!"),
    rigidBody: new BoxBody({ cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}

function builder() {
  DebugToggle.enable();

  if (currentLevel() === 1) loadingScreen();
  else realGame();
}

// call the function that kicks off the game
const CONFIG = new Config();
initializeAndLaunch("game-player", CONFIG, builder);
