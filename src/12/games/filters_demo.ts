import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, PlayerControlBehavior, Scene, SolidBehavior, TextSprite, TouchPlateBehavior, initializeAndLaunch, stage } from "jetlag2d";
// import { SpriteLocation } from "jetlag2d";
// import { BlurFilterComponent, FadeInFilterComponent, FadeOutFilterComponent, GrayscaleFilterComponent, HSLSandFilterComponent, SepiaTvFilterComponent } from "./filters_lib";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "mid.png", "back.png"],
  };
}

/** Set up the level */
function levelBuilder() {
  DebugToggle.enable();

  // Draw a floor
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxY: 9 });

  // set up the background
  stage.backgroundColor = "#17b4ff";
  stage.background.addLayer({ anchor: { cx: 8, cy: 4.5 }, speed: 1 }, () => new ImageSprite({ width: 16, height: 9, img: "back.png" }));
  stage.background.addLayer({ anchor: { cx: 0, cy: 4.5 }, speed: 0 }, () => new ImageSprite({ width: 16, height: 9, img: "mid.png" }));

  let h = new Actor({
    appearance: new ImageSprite({ width: 2, height: 2, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 5.9, radius: 1 }, { dynamic: true, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  h.rigidBody.xVelocity = 10;

  // center the camera a little ahead of the hero, so we can see more of the
  // world during gameplay
  stage.world.camera.setCameraFocus(h, { dx: 6, dy: 0 });

  // Put a distance display on the HUD
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 40, color: "#FFFFFF", strokeColor: "#000000", strokeWidth: 1 },
      () => h.rigidBody.getCenter().x.toFixed(2) + " m",
    ),
    rigidBody: new CircleBody({ cx: 0.1, cy: 0.1, radius: 0.05 }, { scene: stage.hud }),
  });

  // Draw some floor
  let floor0 = new Actor({
    appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: -32, cy: 9.05, width: 64, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  let floor1 = new Actor({
    appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 32, cy: 9.05, width: 64, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  let floor2 = new Actor({
    appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 96, cy: 9.05, width: 64, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });

  // This sensor will keep "building" the next part of the level as the hero
  // moves forward
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ width: 0.1, height: 9, cx: 63.95, cy: 4.5 }),
    behaviors: new TouchPlateBehavior({
      onEnter: (s: Actor, _h: Actor) => {
        // First, rotate the floor names, move the backmost to the front
        let tmp = floor0;
        floor0 = floor1;
        floor1 = floor2;
        floor2 = tmp;
        floor2.rigidBody.setCenter(floor2.rigidBody.getCenter().x + 192, floor2.rigidBody.getCenter().y);
        // Finally, move the sensor
        s.rigidBody.setCenter(s.rigidBody.getCenter().x + 64, s.rigidBody.getCenter().y);
      },
    }),
  });

  // Every level is won when a hero reaches the destination
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 1);

  // Make a pause button
  new Actor({
    appearance: new ImageSprite({ img: "pause.png", width: 1, height: 1 }),
    rigidBody: new BoxBody({ cx: 0.5, cy: 1.5, width: 1, height: 1 }, { scene: stage.hud }),
    gestures: { onTap: () => { pauseGame(); return true; } },
  });

  stage.score.onLose = levelBuilder;
  stage.score.onWin = levelBuilder;

  // Uncomment any of these lines to try out a filter.  Some make sense
  // attached to a single Z plane, some to the whole world, and some (like
  // the sepia effect) only look right when applied to the entire game via
  // addFilterToMain.  Try moving them around to see the difference.
  // stage.renderer.addFilter(new BlurFilterComponent(), SpriteLocation.HUD);
  // stage.renderer.addFilter(new GrayscaleFilterComponent(), SpriteLocation.WORLD);
  // stage.renderer.addZFilter(new HSLSandFilterComponent(), 0, SpriteLocation.WORLD);
  // stage.renderer.addFilterToMain(new SepiaTvFilterComponent());
  // stage.renderer.addFilterToMain(new FadeInFilterComponent());
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
      screenshot.z = -4;
      new Actor({
        appearance: screenshot,
        rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: overlay }),
      });

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

      // stage.renderer.addZFilter(new FadeOutFilterComponent(), -2, SpriteLocation.OVERLAY);
    },
    true,
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), levelBuilder);
