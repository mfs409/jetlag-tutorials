import { Actor, BoxBody, CircleBody, FilledBox, HazardBehavior, Scene, ScoreService, TextSprite, stage } from "../jetlag";

export function makeScoreInfo() {
  // Put all the info on the screen
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () => "Arrivals: " + stage.score.counters.get("destinationArrivals"),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 0.1, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () =>
        "Defeated: " +
        stage.score.counters.get(HazardBehavior.ENEMIES_DEFEATED) +
        " / " +
        stage.score.counters.get(HazardBehavior.ENEMIES_CREATED),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 0.4, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () =>
        "Goodies: " +
        stage.score.counters.get("goodies") +
        ", " +
        stage.score.counters.get("goodie1") +
        ", " +
        stage.score.counters.get("goodie2") +
        ", " +
        stage.score.counters.get("goodie3"),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 0.7, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () =>
        "Heroes: " +
        stage.score.counters.get("heroesDefeated") +
        " / " +
        stage.score.counters.get("heroesCreated"),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 1, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () => "Stopwatch: " + stage.score.counters.get(ScoreService.STOPWATCH).toFixed(2),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 1.3, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () => "FPS: " + stage.renderer.getFPS().toFixed(2),
    ),
    rigidBody: new CircleBody(
      { cx: 0.1, cy: 1.6, radius: 0.01 },
      { scene: stage.hud },
    ),
  });
}

/**
 * Create an overlay (blocking all game progress) consisting of a black screen
 * with text.  Clearing the overlay will start the next level.
 *
 * @param message A message to display in the middle of the screen
 */
export function winMessage(message: string) {
  stage.score.winSceneBuilder = (overlay: Scene) => {
    new Actor({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#000000" }),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 16, height: 9 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          stage.switchTo(stage.score.onWin);
          return true;
        },
      },
    });
    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", color: "#FFFFFF", size: 28, z: 0 },
        message,
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 0.1, height: 0.1 },
        { scene: overlay },
      ),
    });
  };
}

/**
 * Create an overlay (blocking all game progress) consisting of a black screen
 * with text.  Clearing the overlay will restart the level.
 *
 * @param message A message to display in the middle of the screen
 */
export function loseMessage(message: string) {
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    new Actor({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#000000" }),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 16, height: 9 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          stage.switchTo(stage.score.onLose);
          return true;
        },
      },
    });
    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", color: "#FFFFFF", size: 28, z: 0 },
        message,
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 0.1, height: 0.1 },
        { scene: overlay },
      ),
    });
  };
}
