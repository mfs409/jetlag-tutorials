import { Actor, ActorPoolSystem, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, PlayerControlBehavior, ProjectileMovement, ThrowableBehavior, TiltMovement, TimedEvent, b2Vec2, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
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
 * Projectiles don't have to be circles: here they're long, skinny rectangles,
 * so with hit boxes turned off, they look like laser beams.  The hero is
 * stationary and surrounded by a border, so every projectile is guaranteed to
 * hit something and get reclaimed, instead of flying forever.  Press and hold
 * anywhere on the screen to toss projectiles toward that point.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // A border gives every projectile something to collide with, so it always
  // gets reclaimed instead of flying off into the void forever
  boundingBox();

  let h = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // Set up a pool of projectiles with fixed velocity.  They'll be rotated to
  // face the direction they travel, so they read as "laser beams" instead of
  // skinny walls.
  let projectiles = new ActorPoolSystem();
  for (let i = 0; i < 100; ++i) {
    let appearance = new FilledBox({ width: 0.02, height: 1, fillColor: "#FF0000" });
    let rigidBody = new BoxBody({ width: 0.02, height: 0.5, cx: -100, cy: -100 }, { collisionsEnabled: false });
    let reclaimer = (actor: Actor) => { projectiles.put(actor); };
    // disappearOnCollide means when two projectiles collide, only one of them
    // disappears -- without it, both could vanish from a single hit
    let behaviors = new ThrowableBehavior({ disappearOnCollide: true, reclaimer });
    let p = new Actor({ appearance, rigidBody, movement: new ProjectileMovement(), behaviors });
    projectiles.put(p);
  }

  // Cover the HUD with a button for shooting these "laser beams".  It has the
  // same "toggle" feeling as the Gestures chapter, but here gestures decide
  // *where* to toss, while a timer (below) limits *how often*.
  let v = new b2Vec2(0, 0);
  let isHolding = false;
  // panStart doesn't fire until there's already movement, so touchDown,
  // touchUp, and panMove are combined instead: a press or move records
  // isHolding and the touch's world coordinates
  let touchDown = (_actor: Actor, hudCoords: { x: number; y: number }) => {
    isHolding = true;
    let pixels = stage.hud.camera.metersToScreen(hudCoords);
    let world = stage.world.camera.screenToMeters(pixels);
    v.x = world.x;
    v.y = world.y;
    return true;
  };
  let touchUp = () => {
    isHolding = false;
    return true;
  };
  let panMove = touchDown;

  // Track the time of the last toss, so we can limit how often the button
  // fires even while it's held down
  let lastToss = 0;
  stage.world.timer.addEvent(
    new TimedEvent(0.01, true, () => {
      if (isHolding) {
        let now = stage.renderer.now;
        // Use stage.renderer.now, not Date -- it only counts time spent in
        // the stage, not time spent on overlays like a pause scene
        if (lastToss + 100 < now) {
          lastToss = now;
          let p = projectiles.get();
          if (p)
            (getBehavior(p, ThrowableBehavior)).tossAt({
              from: h.rigidBody.getCenter(),
              to: { x: v.x, y: v.y },
              actor: h,
              offset: { dx: 0, dy: 0 },
              multiplier: 1,
              fixedVectorVelocity: 10,
              rotateVectorToss: true,
            });
        }
      }
    }),
  );

  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: { onTouchDown: touchDown, onTouchUp: touchUp, onPanMove: panMove },
  });

  // If projectiles seem to "not shoot", suspect a collision: since they spawn
  // at the hero's center, a nearby wall can reclaim them immediately
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
