import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, getAppearance, GoalBehavior, HazardBehavior, ImageSprite, JetLagGameConfig, KeyCodes, Path, PathMovement, Scene, SolidBehavior, TextSprite, dispatchCollision, findBehavior, initializeAndLaunch, stage } from "jetlag2d";
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
    imageNames: ["sprites.json", "pirate.json"],
  };
}

/**
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  // Define the maze layout with walls, a hero, a destination, and a goodie.
  // This time, we'll make bigger exterior borders, so that we don't need
  // special code for the borders' conflict detection
  const mazeLayout = [
    "##################",
    "# #G             #",
    "# ####### ##### ##",
    "# #     # #G#   ##",
    "# # ### # # # # ##",
    "# #   #   # # #  #",
    "# #G#G# #   #G# ##",
    "# ##### ## ####  #",
    "# #   #   #   ## #",
    "#   #   #   #G#D #",
    "##################",
  ];

  stage.backgroundColor = "#b3cde0";

  // Create a hero whose movement we control "explicitly" -- there's no
  // movement policy attached at all.  We still give it a walk animation for
  // each direction, purely for looks; `tryMove`, below, is what actually
  // decides where the hero goes.
  let animations = new Map();
  let l_ani = AnimationSequence.makeSimple({ timePerFrame: 100, repeat: false, images: ["pirate_walk_l_0.png", "pirate_walk_l_3.png", "pirate_walk_l_6.png"] });
  let r_ani = AnimationSequence.makeSimple({ timePerFrame: 100, repeat: false, images: ["pirate_walk_r_0.png", "pirate_walk_r_3.png", "pirate_walk_r_6.png"] });
  let u_ani = AnimationSequence.makeSimple({ timePerFrame: 100, repeat: false, images: ["pirate_walk_u_0.png", "pirate_walk_u_3.png", "pirate_walk_u_6.png"] });
  let d_ani = AnimationSequence.makeSimple({ timePerFrame: 100, repeat: false, images: ["pirate_walk_d_0.png", "pirate_walk_d_3.png", "pirate_walk_d_6.png"] });
  animations.set(AnimationState.IDLE_E, d_ani);
  let h = new Actor({
    appearance: new AnimatedSprite({ width: 0.8, height: 0.8, z: 1, animations }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 0.5, radius: 0.3 }),
    behaviors: heroBehaviors(),
  });

  // This is the heart of "discrete movement": instead of a movement policy
  // that runs every tick, `tryMove` runs once per key press and repositions
  // the hero's rigid body by exactly one grid cell.
  let tryMove = (a: Actor, dx: number, dy: number) => {
    let cx = a.rigidBody.getCenter().x,
      cy = a.rigidBody.getCenter().y;
    for (let c of stage.world.physics.actorsAt({ x: cx + dx, y: cy + dy })) {
      if (findBehavior(c, SolidBehavior)) return;
      // Since we're moving the hero by hand instead of letting Box2D detect
      // a real contact, we need to give both actors' Behaviors the same
      // chance to react that a real collision would -- that's exactly what
      // `dispatchCollision` does (it's what the engine's own contact
      // listener calls internally).
      if (!dispatchCollision(a, c)) dispatchCollision(c, a);
    }
    // Swap in the walk animation that matches the direction pressed, purely
    // so the sprite faces the way it's moving.
    if (dx == -1) getAppearance(a, AnimatedSprite).animations.set(AnimationState.IDLE_E, l_ani);
    else if (dx == 1) getAppearance(a, AnimatedSprite).animations.set(AnimationState.IDLE_E, r_ani);
    if (dy == -1) getAppearance(a, AnimatedSprite).animations.set(AnimationState.IDLE_E, u_ani);
    if (dy == 1) getAppearance(a, AnimatedSprite).animations.set(AnimationState.IDLE_E, d_ani);
    getAppearance(a, AnimatedSprite).restartCurrentAnimation();
    // This is the actual "move": since there's no movement policy, we just
    // set the rigid body's center directly, one grid cell away.
    a.rigidBody.setCenter(cx + dx, cy + dy);
  };

  // Each arrow key calls `tryMove` once, moving the hero exactly one grid
  // cell in that direction.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => tryMove(h, 0, -1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => tryMove(h, 0, 1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => tryMove(h, -1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => tryMove(h, 1, 0));

  // Create walls and goodies from the `mazeLayout`
  for (let row = 0; row < mazeLayout.length; row++) {
    for (let col = 0; col < mazeLayout[row].length; col++) {
      if (mazeLayout[row][col] === "#") {
        new Actor({
          rigidBody: new BoxBody({
            cx: col - 0.5,
            cy: row - 0.5,
            width: 1,
            height: 1,
          }),
          appearance: new FilledBox({
            width: 1,
            height: 1,
            fillColor: "#6497b1",
          }),
          behaviors: new SolidBehavior(),
        });
      } else if (mazeLayout[row][col] === "G") {
        new Actor({
          appearance: new ImageSprite({
            width: 0.5,
            height: 0.5,
            img: "blue_ball.png",
          }),
          rigidBody: new CircleBody({
            cx: col - 0.5,
            cy: row - 0.5,
            radius: 0.25,
          }),
          behaviors: new CollectableBehavior({ onCollect: "goodies" }),
        });
      }
    }
  }

  // Create a destination that requires 6 goodies before it works
  new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "mustard_ball.png",
    }),
    rigidBody: new CircleBody({ cx: 14.5, cy: 8.5, radius: 0.4 }),
    behaviors: new GoalBehavior({
      onArrival: () => {
        if (stage.score.counters.get("goodies") != 6) return false;
        stage.score.counters.add("destinationArrivals", 1);
        return true;
      },
    }),
  });
  stage.score.addWinCondition(
    () => stage.score.counters.get("destinationArrivals") >= 1,
  );

  // Put a message on the screen to help the player along
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", color: "#005b96", size: 20, z: 2 },
      () =>
        "You need " +
        (6 - stage.score.counters.get("goodies")) +
        " more Goodies",
    ),
    rigidBody: new BoxBody(
      { cx: 13.6, cy: 0.05, width: 0.1, height: 0.1 },
      { scene: stage.hud },
    ),
  });

  // Add an enemy
  new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "red_ball.png",
    }),
    rigidBody: new CircleBody({ radius: 0.4, cx: 8.5, cy: 0.5 }),
    behaviors: new HazardBehavior(),
    movement: new PathMovement({
      path: new Path()
        .to(8.5, 0.5)
        .to(8.5, 5.5)
        .to(10.5, 5.5)
        .to(10.5, 2.5)
        .to(10.5, 5.5)
        .to(8.5, 5.5)
        .to(8.5, 0.5),
      velocity: 3,
      loop: true,
    }),
  });

  // When the level is won, put some white text on a black background.
  // Clicking restarts the level.
  stage.score.winSceneBuilder = (overlay: Scene) => {
    new Actor({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#000000" }),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 16, height: 9 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          stage.switchTo(stage.score.onWin);
          return true;
        },
      },
    });
    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", color: " #FFFFFF", size: 28 },
        "You Won!",
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 0.1, height: 0.1 },
        { scene: overlay },
      ),
    });
  };

  // When the level is lost, put some white text on a black background.
  // Clicking restarts the level.
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    new Actor({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#000000" }),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 16, height: 9 },
        { scene: overlay },
      ),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          stage.switchTo(stage.score.onLose);
          return true;
        },
      },
    });
    new Actor({
      appearance: new TextSprite(
        { center: true, face: "Arimo Regular", color: " #FFFFFF", size: 28 },
        "Try Again...",
      ),
      rigidBody: new BoxBody(
        { cx: 8, cy: 4.5, width: 0.1, height: 0.1 },
        { scene: overlay },
      ),
    });
  };

  stage.score.onLose = builder;
  stage.score.onWin = builder;
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
