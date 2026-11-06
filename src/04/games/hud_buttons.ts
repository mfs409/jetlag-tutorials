import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, GoalBehavior, HazardBehavior, ImageSprite, JetLagGameConfig, JumpBehavior, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, heroBehaviors } from "../common/common";

// [mfs] Does this demo provide value?

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
    imageNames: ["sprites.json", "grid_bg.png"],
  };
}

/**
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  // There will be winning and losing in these chapters, and we'll always want
  // to restart
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // The world here is bigger than the screen, so covering the whole screen
  // with a tap button (as before) only works because the button lives on the
  // HUD instead of in the world -- a world-space button would scroll out of
  // view along with everything else as the camera follows the hero.
  boundingBox(0, 0, 32, 9);
  stage.world.gravity = { x: 0, y: 10 };
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: 32, maxY: 9 });

  // A background image, to help see that the hero is moving
  new Actor({
    appearance: new ImageSprite({ z: -2, width: 32, height: 9, img: "grid_bg.png" }),
    rigidBody: new BoxBody({ cx: 16, cy: 4.5, width: 0.1, height: 0.1 }),
  });

  // A hero who can jump and who is moving
  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 1, cy: 8.5, radius: 0.4 }, { dynamic: true }),
    behaviors: [...heroBehaviors(), new JumpBehavior()],
  });
  hero.rigidBody.setVelocity(5, 0);
  stage.world.camera.setCameraFocus(hero);

  // A destination to reach
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 27, cy: 6, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // If you don't make it, you'll lose
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 31.95, cy: 4.5, width: 0.1, height: 9 }),
    behaviors: new HazardBehavior(),
  });

  // A button for jumping.  It's on the HUD, so it stays put on screen and
  // remains tappable no matter where the camera has scrolled to.
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 0.1, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        (getBehavior(hero, JumpBehavior)).jump(0, -7.5);
        return true;
      },
    },
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
