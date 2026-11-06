import { DebugToggle, JetLagGameConfig, initializeAndLaunch, ScoreService, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";
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

  // Automatically lose in 5 seconds
  stage.score.addLoseCondition(
    () => stage.score.counters.get(ScoreService.STOPWATCH) >= 5,
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
