import { Actor, CircleBody, DebugToggle, GoalBehavior, ImageSprite, JetLagGameConfig, PlayerControlBehavior, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

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
    imageNames: ["sprites.json"],
  };
}

/**
 * The same "two arrivals needed" idea also works as *multiple* destinations,
 * each with the default capacity of 1, instead of one destination with
 * `capacity: 2`.
 */
function builder() {
  DebugToggle.enable();

  // Restart the level when we win or lose
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Every level will use tilt, and every level will have a box around it
  enableArrowKeyForces(10, 10);
  boundingBox();

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 2, cy: 3, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 2, cy: 5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 12, cy: 3, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 12, cy: 6, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // As before, requiring two arrivals has to be explicit, since a
  // destination's default win condition is satisfied by the first hero to
  // arrive anywhere
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 2);
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
