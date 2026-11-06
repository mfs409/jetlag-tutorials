import { Actor, BoxBody, ChaseMovement, CircleBody, CollisionExemptions, DebugToggle, FilledBox, HazardBehavior, ImageSprite, JetLagGameConfig, SolidBehavior, TiltMovement, findBehavior, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces, heroBehaviors } from "../common/common";

// [mfs] Does this demo provide value?

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

/** What the red balls need to remember: whether the fence can defeat them.  It is kept on each ball's actor, as its `data`. */
class BallData {
  /** Can the fence defeat this ball? */
  weak: boolean;

  /**
   * Make the data for a new ball
   *
   * @param weak True if the fence can defeat the ball
   */
  constructor(weak: boolean) {
    this.weak = weak;
  }
}

/**
 * Is this actor a weak ball?  Actors that were given no data aren't.
 *
 * @param a Any actor
 * @returns True if the actor's data says it is weak
 */
const isWeak = (a: Actor): boolean => a.data instanceof BallData && a.data.weak;

/**
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  // Restart the level when we win or lose
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Every level will use tilt, and every level will have a box around it
  enableArrowKeyForces(10, 10);
  boundingBox();

  // We can run code when an enemy collides with an obstacle.  We can also
  // disable collisions for heroes but not anything else
  // ANCHOR: hero
  let h = new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "green_ball.png",
    }),
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors(),
  });
  // ANCHOR_END: hero

  // ANCHOR: fence
  const fence = new SolidBehavior({
    onContact: (_o: Actor, e: Actor) => {
      if (!findBehavior(e, HazardBehavior)) return;
      // Force an instant defeat, regardless of the hazard's remaining hit points
      if (isWeak(e))
        getBehavior(e, HazardBehavior).takeDamage(Infinity);
    },
  });
  fence.disableCollision(CollisionExemptions.PLAYER_CONTROL);
  new Actor({
    appearance: new FilledBox({ width: 0.2, height: 2, fillColor: "#FF0000" }),
    rigidBody: new BoxBody({ cx: 12, cy: 8, width: 0.2, height: 2 }),
    behaviors: fence,
  });
  // ANCHOR_END: fence

  // ANCHOR: balls
  new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "red_ball.png",
    }),
    rigidBody: new CircleBody({ cx: 1, cy: 1, radius: 0.4 }, { dynamic: true }),
    movement: new ChaseMovement({ target: h, speed: 1 }),
    behaviors: new HazardBehavior(),
    data: new BallData(true),
  });

  new Actor({
    appearance: new ImageSprite({
      width: 0.8,
      height: 0.8,
      img: "red_ball.png",
    }),
    rigidBody: new CircleBody({ cx: 2, cy: 2, radius: 0.4 }, { dynamic: true }),
    movement: new ChaseMovement({ target: h, speed: 1 }),
    behaviors: new HazardBehavior(),
    data: new BallData(false),
  });
  // ANCHOR_END: balls
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
