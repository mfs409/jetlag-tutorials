import { Actor, BoxBody, ChaseMovement, CircleBody, DebugToggle, FilledBox, GoalBehavior, HazardBehavior, ImageSprite, JetLagGameConfig, KeyCodes, SolidBehavior, TiltMovement, initializeAndLaunch, stage } from "../jetlag";
import { heroBehaviors } from "../common/common";

/**
 * The game will use a 16:9 aspect ratio.  Hit boxes are turned on.  We'll also
 * list some images that we want to use.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  // In order to load images into the game, you need to add a `resources`
  // section to the `Config`.  It should say what folder to look in (`prefix`),
  // and then the names of the files that will be used:
  resources = {
    prefix: "../assets/",
    imageNames: ["green_ball.png", "mustard_ball.png", "red_ball.png", "grid_bg.png"],
  };
}

/**
 * An overhead game whose world (64x36 meters) is bigger than the camera's view
 * (16x9).  The camera follows the hero instead of staying fixed. Tilt
 * (simulated via arrow keys) drives the hero in any direction; there's no
 * gravity, since "down" on screen doesn't mean anything special when you're
 * looking straight down from above. A background grid of tiles makes the hero's
 * movement through the big world visible, four walls bound the level, and two
 * invisible HUD buttons (visible once hitboxes are on) zoom the camera in and
 * out. A chaser is loose somewhere in the world too.  Zoom out to spot it
 * coming, zoom in once you need precision to avoid it. Win by reaching the
 * destination; lose if the chaser catches you.
 */
function builder() {
  DebugToggle.enable();

  // Two important changes for this hero: it is using an ImageSprite (a picture)
  // as its appearance, and its movement is TiltMovement.  TiltMovement
  // registers this actor with the tilt infrastructure.  Any tilt event will
  // move the actor.
  let h = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    // Tilt only moves dynamic bodies
    rigidBody: new CircleBody({ cx: 2, cy: 3, radius: 0.4 }, { dynamic: true }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors(),
  });


  // By default, the camera is centered on the point (8, 4.5) (that is, the
  // center of the 16x9 screen).  We can instead have the camera stay centered
  // on the hero, so that we can keep seeing the hero as it moves around the
  // world.  Note that this is the most rudimentary way to follow the hero's
  // movement, and it's not going to look good when the hero is close to the
  // level's boundaries.  But if you remove this line, the game becomes quite
  // unenjoyable.
  stage.world.camera.setCameraFocus(h);

  // As the hero moves around, it's going to be hard to see that it's really
  // moving.  Draw a background grid so its motion makes that obvious.  Note
  // that we're changing the Z index here, to be sure these pictures are
  // *behind* the hero, whose Z is the default (0).  In JetLag, there are 9 Z
  // planes, from -4 to +4.
  //
  // This code uses "for loops".  The outer loop will run 4 times (0, 16, 32,
  // 48).  Each time, the inner loop will run 4 times (0, 9, 18, 27), drawing a
  // total of 16 images.
  for (let x = 0; x < 64; x += 16) {
    for (let y = 0; y < 36; y += 9) {
      // A picture is just an actor with collisions disabled
      new Actor({
        appearance: new ImageSprite({ width: 16, height: 9, img: "grid_bg.png", z: -1 }),
        rigidBody: new BoxBody({ cx: x + 8, cy: y + 4.5, width: 16, height: 9 }, { collisionsEnabled: false }),
      });
    }
  }

  // Set the camera's visible region.  Make sure you check out what happens if
  // the hero gets close to a camera boundary.
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: 64, maxY: 36 });

  // Draw four walls, covering the four borders of the world.
  // They're outside of the visible region of the camera
  new Actor({
    appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 32, cy: -0.05, width: 64, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 64, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 32, cy: 36.05, width: 64, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 36, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: -0.05, cy: 18, width: 0.1, height: 36 }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 36, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 64.05, cy: 18, width: 0.1, height: 36 }),
    behaviors: new SolidBehavior(),
  });


  // Set up a destination
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 55, cy: 28, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // Reaching the destination wins the level.  Destinations automatically count
  // how many actors arrive in them, so checking `destinationArrivals` is all we
  // need.
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 1);

  // A chaser, loose in the world, always heading straight for the hero.
  // `heroBehaviors()` gave the hero a HealthBehavior and wired up the "hero
  // defeated" lose condition already; this is the only thing in the level that
  // can trigger it.
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 40, cy: 10, radius: 0.4 }, { dynamic: true }),
    movement: new ChaseMovement({ speed: 2, target: h }),
    behaviors: new HazardBehavior(),
  });

  // There's no way to win except the destination, or lose except the chaser.
  stage.score.onWin = builder;
  stage.score.onLose = builder;

  // Add zoom buttons.  They are fully transparent rectangles.  We put them on
  // the HUD, not in the world.  That means we're drawing them on the screen in
  // a way that won't go out of focus when the camera moves.
  //
  // When debug rendering is turned on, we'll be able to see an outline of the
  // two rectangles. You could also use images, but if you did, you'd probably
  // want to use some transparency so that they don't cover up the gameplay.
  //
  // Note that these actors have a `gestures` field that says what to do when
  // they are tapped.
  new Actor({
    appearance: new FilledBox({ width: 8, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 4, cy: 4.5, width: 8, height: 9 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        // Shrinking the zoom zooms out.  We don't want to let things get too
        // small, so stop at half size.
        if (stage.world.camera.zoom > 0.5)
          stage.world.camera.zoom = stage.world.camera.zoom - 0.1;
        return true;
      },
    },
  });
  new Actor({
    appearance: new FilledBox({ width: 8, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 12, cy: 4.5, width: 8, height: 9 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        // In this zoom in button, we also want to cap the zoom so we don't zoom
        // in too much.
        if (stage.world.camera.zoom < 1.5)
          stage.world.camera.zoom = stage.world.camera.zoom + 0.1;
        return true;
      },
    },
  });

  // Put limits on how much force a tilt can produce
  stage.tilt.tiltMax.Set(10, 10);

  // Set up arrows to simulate tilt on devices that don't have an accelerometer
  //
  // Note that tilt isn't really very natural on desktops, but this override is
  // nice, because it makes it feel like there are gravitational forces to fight
  // against.
  if (!stage.accelerometer.tiltSupported) {
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (stage.accelerometer.accel.y = 0));
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT], () => (stage.accelerometer.accel.x = 0));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (stage.accelerometer.accel.y = -5));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (stage.accelerometer.accel.y = 5));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (stage.accelerometer.accel.x = -5));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (stage.accelerometer.accel.x = 5));
  }
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);

