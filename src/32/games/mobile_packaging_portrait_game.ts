import { AccelerometerMode, Actor, BoxBody, CircleBody, CollectableBehavior, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, SolidBehavior, stage, TiltMovement } from "jetlag2d";
import { boundingBox, enableArrowKeyForces, endScreen, heroBehaviors, hudText, requireWelcomeClick } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// ANCHOR: config
/**
 * The same game as the landscape one, for a phone held upright.  Three things
 * change: the shape of the screen, the way that tilt is read, and (outside this
 * file) the manifest's `screenOrientation`.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 9, height: 16 };
  hitBoxes = false;
  accelerometerMode = AccelerometerMode.ANDROID_PORTRAIT;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}
// ANCHOR_END: config

/** The size of the world, in meters */
const WORLD = { width: 9, height: 16 };

/** How many gems the player needs to collect */
const GEMS_TO_WIN = 5;

/**
 * Put a gem in the world.  Collecting it counts it, and buzzes the phone.
 *
 * @param cx The x coordinate of the gem's center
 * @param cy The y coordinate of the gem's center
 */
function gem(cx: number, cy: number) {
  new Actor({
    appearance: new FilledCircle({ radius: 0.25, fillColor: "#ffd23f", lineWidth: 0.05, lineColor: "#c9971c" }),
    rigidBody: new CircleBody({ cx, cy, radius: 0.25 }),
    behaviors: new CollectableBehavior({
      onCollect: () => {
        stage.score.counters.add("gems", 1);
        stage.platform.vibrate(40);
        return true;
      },
    }),
  });
}

/**
 * Put a solid wall in the world.
 *
 * @param cx     The x coordinate of the wall's center
 * @param cy     The y coordinate of the wall's center
 * @param width  The wall's width
 * @param height The wall's height
 */
function wall(cx: number, cy: number, width: number, height: number) {
  new Actor({
    appearance: new FilledBox({ width, height, fillColor: "#4a4e69" }),
    rigidBody: new BoxBody({ cx, cy, width, height }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * Ask the phone not to dim its screen, because nobody touches the screen while
 * they tilt the phone.  The phone only allows this while the game is on
 * screen, and it takes the request back whenever the player leaves, so we ask
 * again when they come back.
 */
async function keepScreenOn() {
  try {
    await navigator.wakeLock.request("screen");
  } catch (e) {
    // This device can't do it, or won't right now.  The game still works.
  }
}

/**
 * Build the level: a marble that you roll around by tilting the phone (or by
 * pressing the arrow keys, on a computer), and some gems to roll it into.
 */
function builder() {
  // ANCHOR: world
  // The world is 9 meters wide and 16 meters tall, so the walls around it need
  // to say so.  They default to 16 by 9
  boundingBox(0, 0, WORLD.width, WORLD.height);
  // ANCHOR_END: world
  keepScreenOn();
  stage.visibility.onGainVisibility = keepScreenOn;

  new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#3a86ff", lineWidth: 0.05, lineColor: "#1d4e9e" }),
    rigidBody: new CircleBody({ cx: 7.5, cy: 1.5, radius: 0.4 }, { dynamic: true, elasticity: 0.3 }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors(),
  });
  enableArrowKeyForces(4, 4);
  stage.tilt.tiltVelocityOverride = true;

  // Three walls to roll around, with the gaps on alternating sides
  wall(4, 5, 6, 0.3);
  wall(6, 9, 6, 0.3);
  wall(4, 13, 6, 0.3);

  gem(1.5, 3);
  gem(7.5, 7);
  gem(1.5, 11);
  gem(7.5, 11);
  gem(4.5, 14.5);

  hudText(0.3, 0.4, 24, "#222222", () => `Gems: ${stage.score.counters.get("gems")} / ${GEMS_TO_WIN}`);

  stage.score.addWinCondition(() => stage.score.counters.get("gems") >= GEMS_TO_WIN);
  stage.score.winSceneBuilder = (overlay) => {
    stage.platform.vibrate(300);
    // ANCHOR: end_screen
    endScreen(overlay, { title: "You got them all!", width: WORLD.width, height: WORLD.height, next: () => stage.switchTo(builder) });
    // ANCHOR_END: end_screen
  };
}

// ANCHOR: begin
// The "click to begin" screen needs to know the shape of the world, too
initializeAndLaunch("game-player", new Config(), () => requireWelcomeClick(builder, WORLD.width, WORLD.height));
// ANCHOR_END: begin
