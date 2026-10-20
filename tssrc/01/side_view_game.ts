import { Actor, BoxBody, CircleBody, DebugToggle, DynamicBodyMovement, FilledBox, FilledCircle, GoalBehavior, GridSystem, JetLagGameConfig, KeyCodes, PlayerControlBehavior, ScoreService, SolidBehavior, TextSprite, initializeAndLaunch, stage } from "../jetlag";

/** This game loads a font, so that it can display text */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    prefix: "../assets/",
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * A side-view platformer: gravity pulls straight down, the hero moves left
 * and right via the arrow keys, and tapping the hero makes it jump. The
 * world is twice as wide as the camera's view, so the camera follows the
 * hero horizontally as it runs. A HUD countdown timer forces a loss if the
 * hero doesn't reach the destination quickly enough.
 */
function builder() {
  DebugToggle.enable();

  // Draw a grid on the screen, covering the whole visible area
  GridSystem.makeGrid(stage.world, { x: 0, y: 0 }, { x: 32, y: 9 });

  // Tell the camera it's not allowed to show anything outside of (0,0):(32,9):
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: 32, maxY: 9 });

  // Draw four walls, covering the four borders of the (now-bigger) world
  new Actor({
    appearance: new FilledBox({ width: 32, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 16, cy: 0.05, width: 32, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 32, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 16, cy: 8.95, width: 32, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 9, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 0.05, cy: 4.5, width: 0.1, height: 9 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 9, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 31.95, cy: 4.5, width: 0.1, height: 9 }),
    behaviors: new SolidBehavior(),
  });

  // Make a hero.  Tapping it sets a big negative Y velocity, which (once we
  // add gravity, below) is what makes it look like a jump.
  let h = new Actor({
    appearance: new FilledCircle({ radius: 0.75, fillColor: "#0000ff", lineWidth: 0.03, lineColor: "#000044" }),
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.75 }),
    behaviors: new PlayerControlBehavior(),
    movement: new DynamicBodyMovement(),
    gestures: { onTap: () => { h.rigidBody.yVelocity = -8; return true; } },
  });

  // Make gravity pull straight down.  Without this line, "jump" wouldn't mean
  // anything... the hero would just drift upward forever.
  stage.world.gravity = { x: 0, y: 9.8 };

  // Set up arrow keys to control the hero's horizontal movement.  Jumping is
  // handled by the tap gesture above, not by a key.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (h.rigidBody.xVelocity = -5));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => (h.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (h.rigidBody.xVelocity = 5));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (h.rigidBody.xVelocity = 0));

  // Let the camera follow the hero.  Since the world is wider than the
  // camera, this is what makes the level feel like it scrolls as you run.
  stage.world.camera.setCameraFocus(h);

  // Make a destination for winning the game
  new Actor({
    appearance: new FilledCircle({ radius: 0.5, fillColor: "#00ff00", lineWidth: 0.03, lineColor: "#004400" }),
    rigidBody: new CircleBody({ cx: 31, cy: 6, radius: 0.5 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });
  stage.score.onWin = builder;
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 1);

  // Set up a countdown: reaching the destination is a race against the
  // clock.  `stage.score.counters.get(ScoreService.STOPWATCH)` counts up in seconds
  // automatically, so a lose condition just checks it against a limit.
  stage.score.onLose = builder;
  const loseDuration = 10;
  stage.score.addLoseCondition(() => stage.score.counters.get(ScoreService.STOPWATCH) >= 10);

  // Draw a box, and write the remaining time on it.  Both go on the HUD, so
  // they stay fixed on screen instead of scrolling away with the world.
  new Actor({
    appearance: new FilledBox({ width: 0.75, height: 0.75, fillColor: "#eeeeee", lineWidth: 0.03, lineColor: "#000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 0.75, width: 0.75, height: 0.75 }, { scene: stage.hud }),
  });
  // TextSprite can take a *function* that returns text, so that the text can
  // change on every frame.
  new Actor({
    appearance: new TextSprite(
      { center: true, face: "Arimo Regular", color: "#444444", size: 48 },
      () => Math.max(0, loseDuration - stage.score.counters.get(ScoreService.STOPWATCH)).toFixed(0),
    ),
    rigidBody: new BoxBody({ cx: 8, cy: 0.75, width: 1.8, height: 1 }, { scene: stage.hud }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
