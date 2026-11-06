import { Actor, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, KeyCodes, TextSprite, initializeAndLaunch, stage } from "jetlag2d";

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
 * @param level Which level should be displayed
 */
function builder() {
  DebugToggle.enable();

  let hero = new Actor({
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.5 }, { kinematic: true, rotateByDirection: true }),
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
  });

  // A `stage.world` actor scrolls off-screen the moment the camera follows
  // the hero elsewhere.  Text reporting the hero's position should stay put
  // -- so this one goes on the HUD instead, via `scene: stage.hud`.
  new Actor({
    rigidBody: new CircleBody({ cx: 0.5, cy: 0.5, radius: 0.001 }, { scene: stage.hud }),
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#FF0000aa" },
      () => `${hero.rigidBody.getCenter().x.toFixed(2)}, ${hero.rigidBody.getCenter().y.toFixed(2)}, ${hero.rigidBody.rotation.toFixed(2)}`,
    ),
  });

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.addVelocity(-1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.addVelocity(1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => hero.rigidBody.addVelocity(0, -1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => hero.rigidBody.addVelocity(0, 1));

  // No camera bounds were set, so the visible world is effectively infinite
  // -- there's nothing stopping the hero (and the camera) from wandering
  // arbitrarily far, which is exactly why the HUD text matters here.
  stage.world.camera.setCameraFocus(hero);
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
