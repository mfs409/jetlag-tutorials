import { Actor, CircleBody, DebugToggle, HazardBehavior, ImageSprite, JetLagGameConfig, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces, heroBehaviors } from "../common/common";
import { winMessage, loseMessage, makeScoreInfo } from "./score_helpers";

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
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  // first, set up winning and losing to both restart
  stage.score.onLose = builder;
  stage.score.onWin = builder;
  winMessage("Yay");
  loseMessage("Try Again");

  makeScoreInfo();

  // Set up some movement
  enableArrowKeyForces(10, 10);
  boundingBox();

  // Defeat all the enemies via collision
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 8.5, radius: 0.5 }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors({ hitPoints: 10 }),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 2.5, cy: 8.5, radius: 0.5 }),
    behaviors: new HazardBehavior(),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 3.5, cy: 8.5, radius: 0.5 }),
    behaviors: new HazardBehavior(),
  });
  stage.score.addWinCondition(
    () =>
      stage.score.counters.get(HazardBehavior.ENEMIES_DEFEATED) >=
      stage.score.counters.get(HazardBehavior.ENEMIES_CREATED),
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
