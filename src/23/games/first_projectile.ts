import { Actor, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, KeyCodes, PlayerControlBehavior, ProjectileMovement, ThrowableBehavior, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox } from "../common/common";

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

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Projectiles are something that we can "toss" on the screen.  They are
  // unique among behaviors, because it really only makes sense to have a
  // ThrowableBehavior along with Projectile movement.
  boundingBox();
  stage.world.gravity = { x: 0, y: 10 };
  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 1.25, cy: 5.25, radius: 0.4 }, { density: 2, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  // Note that you could have different buttons, or different keys, for
  // tossing projectiles in a few specific directions
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    // Every press makes a brand-new actor -- there's no pool yet, so if you
    // hold the key down, projectiles just keep piling up forever.
    let p = new Actor({
      appearance: new ImageSprite({ width: 0.2, height: 0.2, img: "grey_ball.png" }),
      rigidBody: new CircleBody({ cx: hero.rigidBody.getCenter().x + 0.2, cy: hero.rigidBody.getCenter().y, radius: 0.1 }),
      movement: new ProjectileMovement(),
      behaviors: new ThrowableBehavior(),
    });
    // "tossFixedDir" moves the actor to a position relative to another
    // actor's center, then gives it a fixed velocity.  It doesn't matter
    // where the rigid body started out above: this call relocates it to
    // .2 to the right of the hero and sends it right at 5 meters/second.
    (getBehavior(p, ThrowableBehavior)).tossFixedDir({ actor: hero, offset: { dx: 0.2, dy: 0 }, velocity: { x: 5, y: 0 } });
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.setVelocity(-5, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.setVelocity(0, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.setVelocity(5, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.setVelocity(0, hero.rigidBody.getVelocity().y));
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
