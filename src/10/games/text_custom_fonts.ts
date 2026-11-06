import { Actor, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, KeyCodes, Path, PathMovement, TextSprite, initializeAndLaunch, stage } from "jetlag2d";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  // A CSS-based font (a `<link>`, an `@font-face` block) races against
  // JetLag's own startup, so the first frame can render with a fallback
  // font if the download hasn't finished yet.  Listing a `.ttf` here
  // instead guarantees it's loaded before `builder()` ever runs.
  resources = {
    imageNames: ["sprites.json"],
    fonts: ["Roboto-Black.ttf", "Arimo-Bold.ttf"],
  };
}

/**
 * Build the levels of the game.
 *
 * @param level Which level should be displayed
 */
function builder() {
  DebugToggle.enable();

  // Nothing stops you from putting arbitrary appearances -- even one with
  // movement -- on the HUD.  It usually looks strange in a real game, but
  // it's a useful reminder that the HUD is a full physics simulation, not
  // just a place for static text.
  let hero = new Actor({
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.5 }, { kinematic: true, rotateByDirection: true }),
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
  });

  new Actor({
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.5 }, { scene: stage.hud }),
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
    movement: new PathMovement({ path: new Path().to(1, 1).to(15, 1).to(15, 8).to(1, 8).to(1, 1), velocity: 4, loop: true }),
  });

  // For reference, here's the "Arial" font we had been using so far
  new Actor({
    rigidBody: new CircleBody({ cx: 0.5, cy: 0.5, radius: 0.001 }, { scene: stage.hud }),
    appearance: new TextSprite(
      { center: false, face: "Arial", size: 20, color: "#FF0000aa" },
      () => `${hero.rigidBody.getCenter().x.toFixed(2)}, ${hero.rigidBody.getCenter().y.toFixed(2)}, ${hero.rigidBody.rotation.toFixed(2)}`,
    ),
  });

  // A font's `face` is just its filename, with the extension dropped and
  // dashes turned to spaces.
  new Actor({
    rigidBody: new CircleBody({ cx: 0.5, cy: 1.5, radius: 0.001 }, { scene: stage.hud }),
    appearance: new TextSprite(
      { center: false, face: "Arimo Bold", size: 20, color: "#FF0000aa" },
      () => `${hero.rigidBody.getCenter().x.toFixed(2)}, ${hero.rigidBody.getCenter().y.toFixed(2)}, ${hero.rigidBody.rotation.toFixed(2)}`,
    ),
  });

  // A second downloaded font, to show that you can list as many as you need
  new Actor({
    rigidBody: new CircleBody({ cx: 0.5, cy: 1, radius: 0.001 }, { scene: stage.hud }),
    appearance: new TextSprite(
      { center: false, face: "Roboto Black", size: 20, color: "#FF0000aa" },
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
