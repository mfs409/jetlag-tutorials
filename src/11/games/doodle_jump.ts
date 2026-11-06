import { Actor, BoxBody, CircleBody, DebugToggle, DIRECTION, FilledBox, FilledCircle, findBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, SolidBehavior, stage } from "jetlag2d";
import { endScreen, hudText } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * A climber, where falling off the bottom of the screen is the end.  The hero
 * bounces on every platform it lands on, and the arrow keys move it left and
 * right (and off one edge of the screen and back on the other).  The camera
 * only ever goes up: it never follows the hero back down.
 */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#87ceeb";
  stage.world.gravity = { x: 0, y: 14 };

  // The hero.  It bounces, so it needs no jump button.
  const hero = new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#ffd23f", lineWidth: 0.05, lineColor: "#8a4a12" }),
    rigidBody: new CircleBody({ cx: 8, cy: 7, radius: 0.4 }, { dynamic: true, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // The arrow keys set the hero's sideways speed
  const steer = (vx: number) => () => (hero.rigidBody.xVelocity = vx);
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], steer(-6));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], steer(6));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_A, KeyCodes.KEY_D], steer(0));

  // ANCHOR: platform_fn
  /** The platforms that exist right now, so we can remove the ones we've left behind */
  const platforms: Actor[] = [];
  /**
   * A platform that you can jump up through from below, and that bounces you
   * when you land on it
   *
   * @param cx    The x coordinate of the center
   * @param cy    The y coordinate of the center
   * @param width How wide it is
   */
  const platform = (cx: number, cy: number, width: number) => {
    platforms.push(new Actor({
      appearance: new FilledBox({ width, height: 0.25, fillColor: "#3a9d5d", lineWidth: 0.04, lineColor: "#1f5c36" }),
      rigidBody: new BoxBody({ cx, cy, width, height: 0.25 }, { singleRigidSide: DIRECTION.N }),
      behaviors: new SolidBehavior({
        onContact: (_self: Actor, other: Actor) => {
          if (findBehavior(other, PlayerControlBehavior)) other.rigidBody.yVelocity = -11;
        },
      }),
    }));
  };
  // The ground, to get started on
  platform(8, 8.4, 6);
  // ANCHOR_END: platform_fn

  // ANCHOR: camera_ratchet
  // Nothing is following the hero.  Every frame, the camera goes to the hero's
  // height, but only if that's higher than the camera has ever been.  (Up is
  // negative, so "higher" means a smaller y.)
  let cameraY = 4.5;
  stage.world.repeatEvents.push(() => {
    cameraY = Math.min(cameraY, hero.rigidBody.getCenter().y);
    stage.world.camera.setCenter({ x: 8, y: cameraY });
  });
  // ANCHOR_END: camera_ratchet

  // ANCHOR: lose
  // The hero fell out of the bottom of the screen
  stage.score.addLoseCondition(() => hero.rigidBody.getCenter().y > stage.world.camera.getBottom() + 0.5);
  // ANCHOR_END: lose

  // Make platforms above the top of the screen, as the camera climbs.  Remove
  // the ones that have fallen far below the bottom.
  let nextY = 6;
  stage.world.repeatEvents.push(() => {
    const cam = stage.world.camera;
    while (nextY > cam.getTop() - 2) {
      platform(stage.random.nextRange(1.5, 14.5), nextY, stage.random.nextRange(1.6, 3));
      nextY -= stage.random.nextRange(1.8, 3.2);
    }
    while (platforms.length && platforms[0].rigidBody.getCenter().y > cam.getBottom() + 2) platforms.shift()!.remove();
    // Going off one side brings the hero back on the other
    const x = hero.rigidBody.getCenter().x;
    if (x < -0.5) hero.rigidBody.setCenter(16.5, hero.rigidBody.getCenter().y);
    if (x > 16.5) hero.rigidBody.setCenter(-0.5, hero.rigidBody.getCenter().y);
  });

  // How high have we gotten?  The hero starts at y = 7.
  let best = 0;
  stage.world.repeatEvents.push(() => (best = Math.max(best, Math.floor(7 - hero.rigidBody.getCenter().y))));
  hudText(0.3, 0.5, 26, "#ffffff", () => `Height: ${best} m`, { outline: "#00000088" });

  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: "You fell!", detail: `You climbed ${best} meters`, next: () => stage.switchTo(builder) });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
