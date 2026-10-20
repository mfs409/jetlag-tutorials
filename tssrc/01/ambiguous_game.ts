import { Actor, CircleBody, DebugToggle, DynamicBodyMovement, FilledCircle, FilledPolygon, GridSystem, HazardBehavior, JetLagGameConfig, KeyCodes, Path, PathMovement, PolygonBody, ProjectileMovement, ThrowableBehavior, TimedEvent, initializeAndLaunch, stage } from "../jetlag";
import { heroBehaviors } from "../common/common";

/** The game will use a 16:9 aspect ratio.  Hit boxes are turned on. */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
}

/**
 * A simple shooter game with an ambiguous perspective.  The hero doesn't move,
 * it just rotates in place (arrow keys spin it left/right).  It can shoot
 * projectiles in whatever direction it's facing, via space bar. Make sure you
 * look at the math for that.  It's not a ton of trig, but there is a little
 * bit.
 *
 * Enemies fly in toward the hero. This is achieved with random number
 * generation, and paths.  Again, that takes a little bit of trig.
 *
 * There isn't any gravity here.  The enemies aren't drawn to the hero by
 * gravity, and there's nothing to suggest the hero is being pulled in any
 * direction.  There's no visible ground, and no sense of "up".
 *
 * In addition, the camera never moves.  This helps make the view ambiguous.
 * Nothing here tells you whether it's an overhead game or a side view.
 *
 * Win by defeating 10 enemies.
 * Lose immediately if one enemy hits the hero.
 */
function builder() {
  // Let the 'b' key toggle hit boxes
  DebugToggle.enable();

  // Draw a grid on the screen, covering the whole visible area
  GridSystem.makeGrid(stage.world, { x: 0, y: 0 }, { x: 16, y: 9 });

  // Place a hero in the middle of the screen.  The hero is a polygon (a
  // triangle).  Try changing the vertices to make sure you understand how they
  // work.
  let h = new Actor({
    appearance: new FilledPolygon({ vertices: [{ x: 0, y: -0.5 }, { x: 0.25, y: 0.5 }, { x: -0.25, y: 0.5 },], fillColor: "#0000ff", lineWidth: 0.03, lineColor: "#000044", z: 1 }),
    rigidBody: new PolygonBody({ cx: 8, cy: 4.5, vertices: [{ x: 0, y: -0.5 }, { x: 0.25, y: 0.5 }, { x: -0.25, y: 0.5 },] }, { collisionsEnabled: false }),
    behaviors: heroBehaviors(),
    movement: new DynamicBodyMovement(),
  });

  // The left and right keys rotate the hero.  Make sure you understand whether
  // a negative value is clockwise or counterclockwise.
  //
  // Also, notice that the value '6' is in radians per second.  That's just
  // about 360 degrees per second, so roughly one full rotation per second.  If
  // you don't know how to do that math, it's OK, because you can try different
  // numbers until you like how it plays.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => h.rigidBody.body.SetAngularVelocity(-6));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => h.rigidBody.body.SetAngularVelocity(0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => h.rigidBody.body.SetAngularVelocity(6));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => h.rigidBody.body.SetAngularVelocity(0));

  // This is where we set up the ability to shoot projectiles.
  //
  // Before you read this code, please note that **this is really bad code**.
  // The problem is that once you toss a projectile, it will keep moving
  // FOREVER.  Chapter 11 will show you how to "recycle" projectiles.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    // The way we drew the hero, a 0 degree rotation looks like "pointing
    // upward".  But that's actually -90 degrees or -pi/2 radians. We need to
    // know where the hero is, and which direction it's facing, so we know the
    // direction to shoot.
    let dx = Math.cos(h.rigidBody.rotation - Math.PI / 2);
    let dy = Math.sin(h.rigidBody.rotation - Math.PI / 2);
    let x = h.rigidBody.getCenter().x;
    let y = h.rigidBody.getCenter().y;
    let scale = 8; // This is the speed of the projectile

    // Make the projectile.  There is a small issue: after we make the actor, we
    // need to access its ThrowableBehavior.  We could say '(actor.behavior as
    // ThrowableBehavior).tossAt()`, but it's cleaner to just make the behavior
    // first:
    let throwable = new ThrowableBehavior();
    // Notice: the actor has Projectile movement and Throwable behavior.
    // ProjectileMovement is expensive, but makes sure Box2D knows that the
    // actor can move *really fast*.
    new Actor({
      appearance: new FilledCircle({ radius: 0.125, fillColor: "#bbbbbb", z: 0 }),
      rigidBody: new CircleBody({ radius: 0.125, cx: -100, cy: -100 }),
      movement: new ProjectileMovement(),
      behaviors: throwable,
    });

    // Now that the actor is in the world, toss it in a direction.  Remember
    // that before we got dx and dy as the cosine and sine of the hero's
    // rotation.  They're the components of the projectile velocity, in the x
    // and y directions.  If we add them to the hero's position, we'll have a
    // good idea of where to shoot *at*, so it looks like the projectile travels
    // from the center of the hero, toward the apex of its triangular shape.
    //
    // Note that multiplying by scale makes it go faster, because the point to
    // shoot toward is farther away.
    throwable.tossAt({ actor: h, from: { x, y }, to: { x: x + scale * dx, y: y + scale * dy }, offset: { dx: 0, dy: 0 } });
  });

  // Now set up the enemies.  We make a timer that runs every two seconds
  stage.world.timer.addEvent(new TimedEvent(2, true, () => {
    // Each time the timer runs, it picks a number between 0 and 2*PI
    // (equivalent to 0 to 360 degrees)
    let angle = stage.random.next() * 2 * Math.PI;
    // Now we can use sine and cosine to compute a point that is 9 meters away
    // from the hero, in the direction determined by `angle`.
    //
    // If you're wondering "why 9 meters, isn't that off screen", yes it is. But
    // it's still on stage.  And more importantly, it's *always* off stage,
    // since the screen is 16x9 meters.  Doing the math this way means that
    // every 2 seconds, a new enemy is exactly 9 meters away and set to travel
    // straight toward the hero center.

    // hx/hy are the hero center
    let hx = h.rigidBody.getCenter().x;
    let hy = h.rigidBody.getCenter().y;

    // sx/sy are the center of the new enemy
    let sx = 9 * Math.sin(angle) + hx;
    let sy = 9 * Math.cos(angle) + hy;

    // Make the enemy.  It has a HazardBehavior so that it damages the hero,
    // and it moves on a path, from its start point directly to where the hero
    // is.
    new Actor({
      appearance: new FilledCircle({ radius: 0.5, fillColor: "#F01100" }),
      // Path movement needs a kinematic body: one that moves on its own
      rigidBody: new CircleBody({ cx: sx, cy: sy, radius: 0.5 }, { kinematic: true }),
      behaviors: new HazardBehavior({ damage: 1 }),
      movement: new PathMovement({ path: new Path().to(sx, sy).to(hx, hy), velocity: 3, loop: false }),
    });
  }));

  // These lines say "when you win, run 'builder'" and "when you lose, run
  // 'builder'"
  stage.score.onWin = builder;
  stage.score.onLose = builder;

  // Every time a projectile defeats an enemy, an internal JetLag counter
  // increments.  We can use it to decide when the level is won.
  stage.score.addWinCondition(() => stage.score.counters.get(HazardBehavior.ENEMIES_DEFEATED) >= 10);
}

// call the function that starts the game
initializeAndLaunch("game-player", new Config(), builder);
