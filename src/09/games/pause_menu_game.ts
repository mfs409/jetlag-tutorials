import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, TextSprite, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["green_ball.png", "blue_ball.png"],
  };
}

/**
 * Build the levels of the game.
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
    rigidBody: new CircleBody({ cx: 2, cy: 4.5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // A few goodies, so it's obvious whether pausing preserves progress (it
  // does -- pausing doesn't rebuild the level, it just stops updating it).
  for (let i = 0; i < 5; i++) {
    new Actor({
      appearance: new ImageSprite({
        width: 0.6,
        height: 0.6,
        img: "blue_ball.png",
      }),
      rigidBody: new CircleBody({
        cx: 3 + i * 2.4,
        cy: 2 + (i % 2) * 5,
        radius: 0.3,
      }),
      behaviors: new CollectableBehavior({ onCollect: "goodies" }),
    });
  }

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 24, color: "#000000" },
      () => `Goodies: ${stage.score.counters.get("goodies")}/5`,
    ),
    rigidBody: new BoxBody(
      { cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 },
      { scene: stage.hud },
    ),
  });

  /**
   * Draw the pause overlay: a translucent backdrop, a "Paused" title, and
   * Resume/Restart buttons. `stage.requestOverlay` is what actually pauses
   * the game -- while an overlay is active, JetLag skips stepping the
   * world's physics and timers entirely (see `Stage.renderWorld`), so the
   * pause is real, not just a visual dimming.
   */
  function renderPauseMenu(overlay: Scene) {
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
        { center: true, face: "Arimo Regular", size: 40, color: "#FFFFFF" },
        "Paused",
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 3, width: 6, height: 1.5 },
        { scene: overlay },
      ),
    });

    // `stage.renderer.now` keeps ticking every frame even though the world
    // is frozen (that's the whole point of an overlay) -- so it's exactly
    // what an overlay needs to time its own on-screen duration.  Snapshot it
    // once, here, then diff against it on every render to show a live count.
    const shownAt = stage.renderer.now;
    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", size: 20, color: "#FFFFFF" },
        () =>
          `Paused for ${((stage.renderer.now - shownAt) / 1000).toFixed(1)}s`,
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 3.9, width: 6, height: 1 },
        { scene: overlay },
      ),
    });

    new Actor({
      appearance: [
        new FilledBox({ width: 5, height: 1, fillColor: "#4caf50" }),
        new TextSprite(
          { center: true, face: "Arimo Regular", size: 24, color: "#FFFFFF" },
          "Resume",
        ),
      ],
      rigidBody: new BoxBody(
        { cx: 8, cy: 5, width: 5, height: 1 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          return true;
        },
      },
    });

    new Actor({
      appearance: [
        new FilledBox({ width: 5, height: 1, fillColor: "#c62828" }),
        new TextSprite(
          { center: true, face: "Arimo Regular", size: 24, color: "#FFFFFF" },
          "Restart Level",
        ),
      ],
      rigidBody: new BoxBody(
        { cx: 8, cy: 6.3, width: 5, height: 1 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          stage.switchTo(builder);
          return true;
        },
      },
    });
  }

  // A HUD button, and a keyboard shortcut, both open the same overlay
  new Actor({
    appearance: [
      new FilledBox({ width: 1.4, height: 0.7, fillColor: "#00000088" }),
      new TextSprite(
        { center: true, face: "Arimo Regular", size: 20, color: "#FFFFFF" },
        "Pause",
      ),
    ],
    rigidBody: new BoxBody(
      { cx: 15, cy: 0.5, width: 1.4, height: 0.7 },
      { scene: stage.hud },
    ),
    gestures: {
      onTap: () => {
        stage.requestOverlay(renderPauseMenu, false);
        return true;
      },
    },
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_P, () =>
    stage.requestOverlay(renderPauseMenu, false),
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
