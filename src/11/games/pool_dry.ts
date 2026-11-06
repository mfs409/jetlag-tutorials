import { Actor, ActorPoolSystem, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, KeyCodes, PlayerControlBehavior, ProjectileMovement, ThrowableBehavior, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
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
 * This is the same `ActorPoolSystem` from Chapter 11, applied to projectiles
 * instead of off-screen actors: pre-populate a pool with 10 of them, and
 * hand them out with `get()` instead of constructing a new Actor per shot.
 * Nothing here ever calls `projectiles.put()` on a thrown projectile,
 * though, so once 10 are in flight, the pool runs dry -- `get()` starts
 * returning `undefined`, and shooting silently stops working. See
 * `pool_reclaim.ts` for the fix.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Making all of those projectiles is a bad idea... we'll end up with too
  // many, and the game will slow down.  We can use a "pool" to hold just
  // enough to make the game work:
  boundingBox();
  stage.world.gravity = { x: 0, y: 10 };
  let projectiles = new ActorPoolSystem();
  for (let i = 0; i < 10; ++i) {
    // Where we put them doesn't matter, because the pool will disable them
    let p = new Actor({
      appearance: new ImageSprite({ width: 0.2, height: 0.2, img: "grey_ball.png" }),
      rigidBody: new CircleBody({ cx: -10, cy: -10, radius: 0.1 }),
      movement: new ProjectileMovement(),
      behaviors: new ThrowableBehavior(),
    });
    projectiles.put(p);
  }
  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 1.25, cy: 5.25, radius: 0.4 }, { density: 2, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  // No TiltMovement here -- the hero's horizontal velocity is set directly by
  // the keyboard handlers below.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.setVelocity(-5, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => hero.rigidBody.setVelocity(0, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.setVelocity(5, hero.rigidBody.getVelocity().y));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => hero.rigidBody.setVelocity(0, hero.rigidBody.getVelocity().y));

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    // If the pool is empty, `get()` returns `undefined` instead of an actor
    // -- once we've thrown 10 projectiles, further taps of Space do nothing.
    let p = projectiles.get();
    if (p)
      (getBehavior(p, ThrowableBehavior)).tossFixedDir({
        actor: hero,
        offset: { dx: 0.2, dy: 0 },
        velocity: { x: 5, y: 0 },
      });
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
