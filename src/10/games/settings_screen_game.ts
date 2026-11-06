import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, PlayerControlBehavior, Scene, TextSprite, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, drawMuteButton, enableArrowKeyForces } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "green_ball.png"],
  };
}

/**
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  enableArrowKeyForces(10, 10);
  boundingBox();

  new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "green_ball.png",
    }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  /**
   * Draw the settings overlay.  The mute button remembers its choice in
   * session storage, so the choice survives moving between levels, but not
   * reloading the page.  (A setting that should last longer would use
   * `savePersistent`, as Chapter 11 shows.)
   */
  function renderSettings(overlay: Scene) {
    new Actor({
      appearance: new FilledBox({
        width: 16,
        height: 9,
        fillColor: "#000000aa",
      }),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 16, height: 9 },
        { scene: overlay },
      ),
    });

    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", size: 36, color: "#FFFFFF" },
        "Settings",
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 2.2, width: 6, height: 1.2 },
        { scene: overlay },
      ),
    });

    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", size: 20, color: "#FFFFFF" },
        "Sound",
      ),
      rigidBody: new BoxBody(
        { cx: 6, cy: 4, width: 2, height: 1 },
        { scene: overlay },
      ),
    });
    // The mute button itself is ordinary, reusable code -- the same
    // `drawMuteButton` helper any chapter can call, not something special
    // about this being a "settings screen."
    drawMuteButton({ cx: 9.5, cy: 4, width: 1, height: 1, scene: overlay });

    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", size: 16, color: "#CCCCCC" },
        "(remembered while you play, but not after the page reloads)",
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 5.1, width: 12, height: 0.8 },
        { scene: overlay },
      ),
    });

    new Actor({
      appearance: [
        new FilledBox({ width: 4, height: 1, fillColor: "#4caf50" }),
        new TextSprite(
          { center: true, face: "Arimo Regular", size: 22, color: "#FFFFFF" },
          "Back",
        ),
      ],
      rigidBody: new BoxBody(
        { cx: 8, cy: 7, width: 4, height: 1 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          return true;
        },
      },
    });
  }

  new Actor({
    appearance: [
      new FilledBox({ width: 1.8, height: 0.7, fillColor: "#00000088" }),
      new TextSprite(
        { center: true, face: "Arimo Regular", size: 18, color: "#FFFFFF" },
        "Settings",
      ),
    ],
    rigidBody: new BoxBody(
      { cx: 14.8, cy: 0.5, width: 1.8, height: 0.7 },
      { scene: stage.hud },
    ),
    gestures: {
      onTap: () => {
        stage.requestOverlay(renderSettings, false);
        return true;
      },
    },
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
