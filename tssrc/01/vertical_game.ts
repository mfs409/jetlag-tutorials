import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DIRECTION, DebugToggle, FilledBox, GoalBehavior, HazardBehavior, HealthBehavior, ImageSprite, JetLagGameConfig, JumpBehavior, KeyCodes, PlayerControlBehavior, SolidBehavior, TiltMovement, findBehavior, getBehavior, initializeAndLaunch, stage } from "../jetlag";

/**
 * Even though this is a vertical game, it's still a game for laptop/desktop
 * screens, so we'll stick with a 16x9 screen ratio. Also, we're going to use a
 * few pictures.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    prefix: "../assets/",
    imageNames: ["green_ball.png", "mustard_ball.png", "night_0.png", "night_1.png"],
  };
}

/**
 * A doodle-jump-style climber: gravity pulls down, but the destination is far
 * *above* the hero, so the only way to make progress is to keep landing on
 * platforms and jumping higher.
 *
 * The camera follows the hero, but focuses on a point 2 meters above it, so
 * there's always more of "what's coming up" visible than "what's below." Tilt
 * (or arrow keys) moves the hero side-to-side, space makes it jump, platforms
 * only collide from above (so the hero can jump up through them from below),
 * and touching either side of the world is a hazard that ends the level. Win by
 * reaching the destination near the top.
 */
function builder() {
  // Enable toggling hit boxes:
  DebugToggle.enable();

  // Gravity pulls down
  stage.world.gravity = { x: 0, y: 10 };

  // The camera setup is interesting.  There's no `minY`.  Since up is negative,
  // that means increasingly negative numbers are still OK, and the action can
  // keep moving upward "forever".
  stage.world.camera.setBounds({ minX: 0, maxX: 16, maxY: 9 });

  // Make the floor.  It's wider than the camera on purpose, because that works
  // nicely with the side borders
  new Actor({
    appearance: new FilledBox({ width: 16, height: 0.1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 9.05, width: 20, height: 0.1 }),
    behaviors: new SolidBehavior(),
  });

  // Make the left and right edges of the world into hazards, set back a little
  // from the camera so a hero drifting off-screen restarts the level.  The
  // floor is at y=9, and up is negative, so a strip centered at y=-16 with
  // height 50 covers from about y=-41 up through the floor.
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 50, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: -0.5, cy: -16, width: 0.1, height: 50 }),
    // Note that HazardBehavior's default will defeat a default HealthBehavior
    behaviors: new HazardBehavior(),
  });
  new Actor({
    appearance: new FilledBox({ width: 0.1, height: 50, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 16.5, cy: -16, width: 0.1, height: 50 }),
    behaviors: new HazardBehavior(),
  });

  // Make the hero.  `disableRotation` keeps it from spinning as it grazes
  // platforms and walls, which would otherwise look strange for a round sprite
  // with an obvious "up." PlayerControlBehavior marks it as the actor the
  // player controls; HealthBehavior (default 1 hit point) is what lets the
  // hazard strips actually defeat it; JumpBehavior is what lets the space bar
  // make it jump.
  //
  // Jumping is a new and special behavior: Once you jump, you can't jump again
  // until you touch the floor.  In this game, it's pretty coarse: you can jump
  // after walking off the side of a platform, while in mid air.  You can also
  // jump once you nick the slide of a platform.
  const h = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    // Tilt only moves dynamic bodies
    rigidBody: new CircleBody({ cx: 1.25, cy: 5.25, radius: 0.4 }, { disableRotation: true, dynamic: true }),
    movement: new TiltMovement(),
    behaviors: [
      new PlayerControlBehavior(),
      new HealthBehavior({ onDefeated: () => stage.score.counters.add("heroDefeated", 1) }),
      new JumpBehavior(),
    ],
  });

  // Set up tilt, with left/right arrow keys simulating tilt on devices that
  // lack an accelerometer
  stage.tilt.tiltMax.Set(10, 10);
  if (!stage.accelerometer.tiltSupported) {
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT], () => (stage.accelerometer.accel.x = 0));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (stage.accelerometer.accel.x = -5));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (stage.accelerometer.accel.x = 5));
  }

  // The level is lost once the hero is defeated.  Heroes being defeated
  // (running out of health) is a stat JetLag tracks automatically.
  stage.score.addLoseCondition(() => stage.score.counters.get("heroDefeated") >= 1);

  // The camera follows the hero, but focused 2 meters above it, so the
  // player can see the next platform to aim for instead of just the ground
  // they're standing on.
  stage.world.camera.setCameraFocus(h, { dx: 0, dy: -2 });

  // Space bar makes the hero jump
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => (getBehavior(h, JumpBehavior)).jump(0, -10));

  // Add a destination that's "up high" (a large negative Y, since the
  // world's Y axis increases downward).
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 15, cy: -26, radius: 0.5 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // The level is won when the hero gets to the destination
  stage.score.addWinCondition(() => stage.score.counters.get("destinationArrivals") >= 1);

  // Restart the game when it is won or lost
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // This *function* will make platforms, since we're about to make a bunch of
  // them.  `singleRigidSide: DIRECTION.N` means the platform only collides on
  // its north (top) side, so the hero can jump up through it from below, but
  // still lands on it from above.
  function platform(cx: number, cy: number) {
    new Actor({
      appearance: new FilledBox({ z: -1, width: 2, height: 0.2, fillColor: "#FF0000" }),
      rigidBody: new BoxBody({ cx, cy, width: 2, height: 0.2 }, { singleRigidSide: DIRECTION.N }),
      // Give the hero a little upward boost on landing, so hopping feels
      // snappier than just standing on each platform.
      behaviors: new SolidBehavior({
        onContact: (_self: Actor, other: Actor) => {
          if (!findBehavior(other, PlayerControlBehavior)) return;
          other.rigidBody.yVelocity = -5;
        },
      }),
    });
  }

  // Use that function to build the platforms the hero climbs
  platform(3, 7.5);
  platform(5, 3.5);
  platform(3, -1.5);
  platform(6, -5.5);
  platform(10, -9.5);
  platform(3, -13.5);
  platform(4, -17.5);
  platform(5, -21.5);
  platform(6, -24.5);

  // Set up an animated parallax background, so the climb feels like it's
  // happening in a real space, not against a blank void or flat wallpaper
  let animations = new Map();
  animations.set(AnimationState.IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 550, repeat: true, images: ["night_0.png", "night_1.png"] }));
  stage.background.addLayer(
    { anchor: { cx: 8, cy: 4.5 }, speed: 0.3, isHorizontal: false, isAuto: false },
    () => new AnimatedSprite({ width: 16, height: 9, animations }),
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
