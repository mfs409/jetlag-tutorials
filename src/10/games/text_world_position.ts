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

  // A producer function can report on *any* actor's state, not just a tap
  // counter -- here it re-reads the hero's live position and rotation every
  // time the text redraws.
  new Actor({
    rigidBody: new CircleBody({ cx: 0.5, cy: 0.5, radius: 0.001 }),
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#FF0000aa" },
      () => `${hero.rigidBody.getCenter().x.toFixed(2)}, ${hero.rigidBody.getCenter().y.toFixed(2)}, ${hero.rigidBody.rotation.toFixed(2)}`,
    ),
  });

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.addVelocity(-1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.addVelocity(1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => hero.rigidBody.addVelocity(0, -1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => hero.rigidBody.addVelocity(0, 1));

  stage.world.camera.setCameraFocus(hero);
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
