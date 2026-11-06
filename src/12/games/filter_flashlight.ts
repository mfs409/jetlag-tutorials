import { Actor, AlphaFilter, BoxBody, CircleBody, DebugToggle, FilledBox, getAppearance, GoalBehavior, ImageSprite, JetLagGameConfig, PlayerControlBehavior, Scene, SpriteLocation, TextSprite, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";
import { FadeOutFilterComponent } from "./filters_lib";

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
    imageNames: ["sprites.json", "noise.png", "radial.png"],
  };
}

/**
 * Set up the level
 */
function levelBuilder() {
  DebugToggle.enable();

  // Turn on Tilt
  enableArrowKeyForces(10, 10);
  boundingBox();
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 1);
  stage.score.onLose = levelBuilder;
  stage.score.onWin = levelBuilder;

  // Make a pause button
  new Actor({
    appearance: new ImageSprite({ img: "pause.png", width: 1, height: 1 }),
    rigidBody: new BoxBody({ cx: 0.5, cy: 1.5, width: 1, height: 1 }, { scene: stage.hud }),
    gestures: { onTap: () => { pauseGame(); return true; } },
  });

  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 2, cy: 3, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // A big noisy backdrop, so there's something for the flashlight to reveal
  // as it moves around
  new Actor({
    appearance: new ImageSprite({ width: 16, height: 9, img: "noise.png", z: -2 }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.01 }),
  });

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 15, cy: 8, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // The "flashlight" is just a big image: a black rectangle with a
  // transparent circle in the middle, fading to opaque toward the edges.  A
  // tiny, near-invisible rigidBody is enough, since we only need to move it
  // around, not collide with anything.
  let light = new Actor({
    appearance: new ImageSprite({ width: 64, height: 36, img: "radial.png", z: 2 }),
    rigidBody: new BoxBody({ width: 0.001, height: 0.001, cx: 8, cy: 4.5 }),
  });
  // This is a plain Pixi filter attached directly to the sprite's underlying
  // Pixi image, not a JetLag FilterComponent -- it just softens the
  // blackness a bit so it reads as "dim", not "pitch black".
  getAppearance(light, ImageSprite).image.sprite.filters = [new AlphaFilter({ alpha: 0.8 })];
  // TODO: see https://pixijs.com/8.x/examples/masks/filter
  stage.world.repeatEvents.push(() => {
    // Every frame, re-center the flashlight image on the hero, so it looks
    // like the hero is carrying the light around.
    let hc = hero.rigidBody.getCenter();
    light.rigidBody.setCenter(hc.x, hc.y);
  });
}

/**
 * Create an overlay (blocking all game progress) consisting of a text box over
 * a snapshot of the in-progress game.  Clearing the overlay will resume the
 * current level.
 */
function pauseGame() {
  // Immediately install the overlay, to pause the game
  stage.requestOverlay(
    (overlay: Scene, screenshot: ImageSprite) => {
      // Draw the screenshot
      screenshot.z = -2;
      new Actor({
        appearance: screenshot,
        rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: overlay }),
      });

      // Fade the screenshot out, so the "Paused" text fades into view
      let f = new FadeOutFilterComponent();
      stage.renderer.addZFilter(f, -2, SpriteLocation.OVERLAY);

      // It's always good to have a way to go back to the chooser:
      new Actor({
        appearance: new ImageSprite({ img: "back_arrow.png", width: 1, height: 1 }),
        rigidBody: new BoxBody({ cx: 15.5, cy: 0.5, width: 1, height: 1 }, { scene: overlay }),
        gestures: {
          onTap: () => {
            stage.clearOverlay();
            stage.switchTo(levelBuilder);
            return true;
          },
        },
      });

      // Pressing anywhere on the text box will make the overlay go away
      new Actor({
        appearance: [
          new FilledBox({ width: 2, height: 1, fillColor: "#000000" }),
          new TextSprite({ center: true, face: "Arimo Regular", color: "#FFFFFF", size: 28, z: 0 }, "Paused"),
        ],
        rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 2, height: 1 }, { scene: overlay }),
        gestures: { onTap: () => { stage.clearOverlay(); return true; } },
      });
    },
    true,
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), levelBuilder);
