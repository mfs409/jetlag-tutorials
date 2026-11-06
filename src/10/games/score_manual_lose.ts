import { Actor, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, initializeAndLaunch, stage } from "jetlag2d";
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

  // Lose via code
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 8.5, radius: 0.5 }),
    gestures: {
      onTap: () => {
        stage.score.loseLevel();
        return true;
      },
    },
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
