import { Actor, CircleBody, CollectableBehavior, DebugToggle, getAppearance, HealthBehavior, ImageSprite, JetLagGameConfig, TiltMovement, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces, heroBehaviors } from "../common/common";

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

  boundingBox();
  stage.world.gravity = { x: 0, y: 10 };
  enableArrowKeyForces(10, 0);

  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 8.5, radius: 0.5 }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors({ hitPoints: 1 }),
  });

  // We don't use the goodie that's passed in here, so its name starts with
  // an underscore.  JetLag doesn't let us swap in a `new ImageSprite()`, so
  // instead we mutate the `img` field of the hero's existing ImageSprite --
  // that's `appearance[0]`, since `appearance` is actually an array.
  let onCollect = (_g: Actor, h: Actor) => {
    let s = ++(getBehavior(h, HealthBehavior)).hitPoints;
    getAppearance(h, ImageSprite).img = "color_star_" + s + ".png";
    return true;
  };

  // Four goodies share the same `onCollect` above.  Because the field name
  // (`onCollect`) matches the variable name, we can write `{ onCollect }`
  // instead of the more verbose `{ onCollect: onCollect }`.
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "blue_ball.png" }),
    rigidBody: new CircleBody({ cx: 2.5, cy: 8.5, radius: 0.5 }),
    behaviors: new CollectableBehavior({ onCollect }),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "blue_ball.png" }),
    rigidBody: new CircleBody({ cx: 4.5, cy: 8.5, radius: 0.5 }),
    behaviors: new CollectableBehavior({ onCollect }),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "blue_ball.png" }),
    rigidBody: new CircleBody({ cx: 6.5, cy: 8.5, radius: 0.5 }),
    behaviors: new CollectableBehavior({ onCollect }),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "blue_ball.png" }),
    rigidBody: new CircleBody({ cx: 6.5, cy: 8.5, radius: 0.5 }),
    behaviors: new CollectableBehavior({ onCollect }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
