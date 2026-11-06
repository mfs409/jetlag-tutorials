import { Actor, ActorPoolSystem, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, HazardBehavior, ImageSprite, JetLagGameConfig, JumpBehavior, PolygonBody, SolidBehavior, TextSprite, TouchPlateBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { heroBehaviors } from "../common/common";

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
    imageNames: ["mid.png", "back.png", "sprites.json", "alien.json"],
  };
}

/**
 * Build the levels of the game.
 */
function builder() {
  DebugToggle.enable();

  {
    stage.score.onWin = builder;
    stage.score.onLose = builder;

    // Gravity pulls down as usual, but the camera's bounds only constrain
    // the vertical range (minY/maxY) -- there's no maxX, since the whole
    // point of an endless runner is a world that keeps going.
    stage.world.gravity = { x: 0, y: 10 };
    stage.world.camera.setBounds({ minX: 0, minY: 0, maxY: 9 });

    // ANCHOR: hero
    // The hero uses a plain static image here -- a real endless runner
    // would probably want a walk/jump animation, which the Animations
    // (Game Feel) chapter covers in depth.
    const jumpBehavior = new JumpBehavior();
    let h = new Actor({
      appearance: new ImageSprite({ width: 2, height: 2, img: "alien_walk_r_0.png" }),
      rigidBody: new PolygonBody({ cx: 0.5, cy: 5.9, vertices: [{ x: -0.5, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.5, y: -0.5 }, { x: -0.5, y: -0.5 }] }, { dynamic: true, disableRotation: true }),
      behaviors: [...heroBehaviors(), jumpBehavior],
    });
    h.rigidBody.xVelocity = 10;
    // ANCHOR_END: hero

    // Focus the camera ahead of the hero instead of directly on it, so more
    // of the world coming up is visible than what's already behind -- an
    // obstacle appears on screen with more warning time before the hero
    // reaches it.
    stage.world.camera.setCameraFocus(h, { dx: 6, dy: 0 });

    // ANCHOR: jump_cooldown
    // Put a button on screen that makes the hero jump. Note that we can put a
    // delay (in this case, 2500 milliseconds) to prevent rapid re-jumping.  If
    // you make it 0, you still can't jump while in the air, but you can jump as
    // soon as you land.
    //
    // Using `Date.now()` timestamps to gate the cooldown is a lightweight
    // alternative to a `TimedEvent` when all we need is "not too often," not
    // a recurring callback.
    let last = 0;
    new Actor({
      appearance: new FilledBox({ width: 0.1, height: 0.1, fillColor: "#00000000" }),
      rigidBody: new BoxBody({ width: 16, height: 9, cx: 8, cy: 4.5 }, { scene: stage.hud }),
      gestures: {
        onTap: () => {
          if (Date.now() < last + 2500) return true;
          last = Date.now();
          jumpBehavior.jump(0, -10);
          return false;
        },
      },
    });
    // ANCHOR_END: jump_cooldown

    // ANCHOR: parallax
    // Set up the background.  `speed: 0` means this layer doesn't scroll
    // relative to the camera at all -- it's pinned in place, which is what
    // makes it read as distant sky instead of part of the foreground.  A
    // single static layer like this is enough to sell the illusion of a
    // world that keeps going, without needing true parallax.
    stage.backgroundColor = "#17b4ff";
    stage.background.addLayer(
      { anchor: { cx: 0, cy: 4.5 }, speed: 0 },
      () => new ImageSprite({ width: 16, height: 9, img: "mid.png" }),
    );
    // ANCHOR_END: parallax

    // Put a distance display on the HUD.  Instead of setting the
    // `TextSprite`'s string once, its constructor takes a function that gets
    // re-evaluated every render, so `h.rigidBody.getCenter().x` -- which only
    // ever increases in an endless runner -- becomes a live "how far have you
    // gone" readout for free, with no explicit update code anywhere.
    new Actor({
      appearance: new TextSprite(
        { center: false, face: "Arimo Regular", size: 40, color: "#FFFFFF", strokeColor: "#000000", strokeWidth: 1 },
        () => h.rigidBody.getCenter().x.toFixed(2) + " m",
      ),
      rigidBody: new CircleBody({ cx: 0.1, cy: 0.1, radius: 0.05 }, { scene: stage.hud }),
    });

    // ANCHOR: floor_tiles
    // Draw some floor.  There are only ever 3 floor tiles: as the hero passes
    // the leftmost one, we don't create a new tile, we just move that same
    // tile 192 meters ahead, so it becomes the new rightmost tile.  This is
    // the simplest form of recycling: a fixed-size ring buffer of actors that
    // are always on screen, just relocated instead of re-created.
    let floor0 = new Actor({
      appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
      rigidBody: new BoxBody({ cx: -32, cy: 9.05, width: 64, height: 0.1 }),
      behaviors: new SolidBehavior(),
    });
    let floor1 = new Actor({
      appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
      rigidBody: new BoxBody({ cx: 32, cy: 9.05, width: 64, height: 0.1 }),
      behaviors: new SolidBehavior(),
    });
    let floor2 = new Actor({
      appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
      rigidBody: new BoxBody({ cx: 96, cy: 9.05, width: 64, height: 0.1 }),
      behaviors: new SolidBehavior(),
    });
    // ANCHOR_END: floor_tiles

    // Goodies and enemies are a different story: they're spawned one at a
    // time, at unpredictable moments, so a 3-slot ring buffer doesn't fit.
    // Instead we use an `ActorPoolSystem`: a fixed number of actors are
    // created up front (off-screen and disabled), and instead of ever
    // `new Actor(...)`-ing another one, we `.get()` a disabled one out of the
    // pool, reposition it, and re-enable it.  When it scrolls behind the
    // hero, a `prerenderTasks` callback -- the same mechanism used to
    // recycle projectiles in the Projectiles chapter -- calls `.put()` to
    // disable it and return it to the pool.  This is what keeps the actor
    // count bounded no matter how long the player survives.
    const RECYCLE_DISTANCE = 20; // how far behind the hero an actor must fall before it's recycled
    const POOL_SIZE = 8; // more than we could ever need on screen at once

    function makePool(build: (pool: ActorPoolSystem) => Actor): ActorPoolSystem {
      const pool = new ActorPoolSystem();
      for (let i = 0; i < POOL_SIZE; ++i) pool.put(build(pool));
      return pool;
    }

    const goodiePool = makePool((pool) => {
      const collectable = new CollectableBehavior({
        // Collecting a goodie normally makes JetLag permanently remove the
        // actor.  We don't want that -- we want it to go back in the pool
        // -- so we do the score update ourselves and return `false` to
        // tell JetLag not to remove it.
        onCollect: (g) => {
          stage.score.counters.add("goodies", 1);
          pool.put(g);
          return false;
        },
      });
      const g = new Actor({
        appearance: new ImageSprite({ width: 0.75, height: 0.75, img: "blue_ball.png" }),
        rigidBody: new CircleBody({ radius: 0.375, cx: -100, cy: -100 }),
        behaviors: collectable,
      });
      // Decide *when* this actor has scrolled far enough behind the hero to
      // be recycled, checked every tick.
      g.prerenderTasks.push((_elapsedMs, actor) => {
        if (!actor.enabled) return;
        if (actor.rigidBody.getCenter().x < h.rigidBody.getCenter().x - RECYCLE_DISTANCE) pool.put(actor);
      });
      return g;
    });

    const enemyPool = makePool((pool) => {
      const hazard = new HazardBehavior();
      const e = new Actor({
        appearance: new ImageSprite({ width: 0.75, height: 0.75, img: "red_ball.png" }),
        rigidBody: new CircleBody({ radius: 0.375, cx: -100, cy: -100 }),
        behaviors: hazard,
      });
      e.prerenderTasks.push((_elapsedMs, actor) => {
        if (!actor.enabled) return;
        if (actor.rigidBody.getCenter().x < h.rigidBody.getCenter().x - RECYCLE_DISTANCE) pool.put(actor);
      });
      return e;
    });

    // ANCHOR: chunk_sensor
    // This sensor will keep "building" the next part of the level as the hero
    // moves forward
    new Actor({
      appearance: new FilledBox({ width: 0.1, height: 9, fillColor: "#00000000" }),
      rigidBody: new BoxBody({ width: 0.1, height: 9, cx: 63.95, cy: 4.5 }),
      behaviors: new TouchPlateBehavior({
        onEnter: (s: Actor, _h: Actor) => {
          // First, rotate the floor names, move the backmost to the front
          let tmp = floor0;
          floor0 = floor1;
          floor1 = floor2;
          floor2 = tmp;
          floor2.rigidBody.setCenter(floor2.rigidBody.getCenter().x + 192, floor2.rigidBody.getCenter().y);

          // This would be a good place to draw the next 64 meters of the level,
          // with walls, enemies, goodies, or whatever else would make for a fun
          // game.  We'll just draw a goodie and an enemy, pulling both from
          // their pools instead of allocating new actors. You could also speed
          // up the hero (permanently or temporarily), if that would make the
          // game more fun.
          let g = goodiePool.get();
          if (g) {
            g.rigidBody.setCenter(s.rigidBody.getCenter().x + 64 + stage.random.next() * 64, 8.5 * stage.random.next());
            g.enabled = true;
          }
          let e = enemyPool.get();
          if (e) {
            e.rigidBody.setCenter(s.rigidBody.getCenter().x + 64 + stage.random.next() * 64, 8.5 * stage.random.next());
            e.enabled = true;
          }

          // Finally, move the sensor
          s.rigidBody.setCenter(s.rigidBody.getCenter().x + 64, s.rigidBody.getCenter().y);
        },
      }),
    });
    // ANCHOR_END: chunk_sensor
  }
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
