import { Actor, ActorPoolSystem, CircleBody, DebugToggle, HazardBehavior, HealthBehavior, ImageSprite, JetLagGameConfig, KeyCodes, ProjectileMovement, TextSprite, ThrowableBehavior, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, heroBehaviors } from "../common/common";

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

  boundingBox();
  stage.world.gravity = { x: 0, y: 10 };

  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.4, cy: 8.5, radius: 0.4 }, { density: 2, disableRotation: true }),
    behaviors: heroBehaviors(),
  });

  // set up the pool of projectiles
  let projectiles = new ActorPoolSystem();
  for (let i = 0; i < 10; ++i) {
    let appearance = new ImageSprite({ img: "color_star_1.png", width: 0.5, height: 0.5, z: 0 });
    let rigidBody = new CircleBody({ radius: 0.25, cx: -100, cy: -100 });
    rigidBody.collisionsEnabled = false;
    rigidBody.body.SetGravityScale(0);
    let reclaimer = (actor: Actor) => { projectiles.put(actor); };
    let behaviors = new ThrowableBehavior({ damage: 1, disappearOnCollide: true, reclaimer });
    let p = new Actor({ appearance, rigidBody, movement: new ProjectileMovement(), behaviors });
    projectiles.put(p);
  }
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    let p = projectiles.get();
    if (!p) return;
    (getBehavior(p, ThrowableBehavior)).tossFixedDir({ actor: hero, offset: { dx: 0.4, dy: 0 }, velocity: { x: 8, y: 0 } });
  });

  // An ordinary hazard: one hit from any projectile defeats it, since it has
  // no HealthBehavior of its own -- any nonzero takeDamage() defeats a plain
  // HazardBehavior outright.
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 6, cy: 8.4, radius: 0.5 }),
    behaviors: new HazardBehavior(),
  });

  // A "boss" hazard: giving its actor a HealthBehavior is all it takes.
  // HazardBehavior notices the HealthBehavior (in its attach()) and forwards
  // takeDamage() to it instead of defeating itself immediately, so this one
  // survives until its 3 hit points reach 0.
  let boss = new Actor({
    appearance: new ImageSprite({ width: 1.5, height: 1.5, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 12, cy: 8.1, radius: 0.75 }),
    behaviors: [new HazardBehavior({ damage: 1 }), new HealthBehavior({ hitPoints: 3 })],
  });

  // The boss's remaining hit points are readable the same way a hero's are:
  // getBehavior(boss, HealthBehavior).hitPoints.  This text updates live,
  // every frame, since the second argument to TextSprite is a function.
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#000000" },
      () => `Boss HP: ${(getBehavior(boss, HealthBehavior)).hitPoints}`,
    ),
    rigidBody: new CircleBody({ cx: 0.1, cy: 0.1, radius: 0.01 }, { scene: stage.hud }),
  });
  stage.score.addWinCondition(() => stage.score.counters.get(HazardBehavior.ENEMIES_DEFEATED) >= stage.score.counters.get(HazardBehavior.ENEMIES_CREATED));

  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 20, color: "#000000" }, "Press [space] to toss a projectile"),
    rigidBody: new CircleBody({ cx: 0.1, cy: 0.4, radius: 0.01 }, { scene: stage.hud }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
