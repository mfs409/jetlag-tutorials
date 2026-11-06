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
 * This starts as `pool_dry.ts`, with two small fixes. First, each
 * projectile's `ThrowableBehavior` gets a `reclaimer`, so that when a
 * projectile disables (e.g. by hitting an obstacle), it goes back into the
 * pool instead of being lost -- so the supply never runs dry. Second,
 * `projectiles.limit` caps the *total* number of shots for the whole game,
 * independent of how many projectiles the pool can hold at once.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  boundingBox();
  stage.world.gravity = { x: 0, y: 10 };
  let projectiles = new ActorPoolSystem();
  for (let i = 0; i < 10; ++i) {
    // Where we put them doesn't matter, because the pool will disable them
    let p = new Actor({
      appearance: new ImageSprite({ width: 0.2, height: 0.2, img: "grey_ball.png" }),
      rigidBody: new CircleBody({ cx: -10, cy: -10, radius: 0.1 }),
      movement: new ProjectileMovement(),
      // The reclaimer runs when the projectile becomes disabled, putting it
      // straight back in the pool so it can be re-used.  This is the key
      // difference from `pool_dry.ts`.
      behaviors: new ThrowableBehavior({ reclaimer: (actor: Actor) => projectiles.put(actor) }),
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
    let p = projectiles.get();
    if (p)
      (getBehavior(p, ThrowableBehavior)).tossFixedDir({
        actor: hero,
        offset: { dx: 0.2, dy: 0 },
        velocity: { x: 5, y: 0 },
      });
  });
  // A "limit" is different from the pool size: this caps the total number of
  // projectiles thrown across the whole game (like a quiver of arrows),
  // regardless of how many the pool can recycle at once.
  projectiles.limit = 15;
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
