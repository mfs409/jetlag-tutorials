import { AccelerometerMode, Actor, BoxBody, CircleBody, CollectableBehavior, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, SolidBehavior, stage, TiltMovement } from "jetlag2d";
import { boundingBox, enableArrowKeyForces, endScreen, heroBehaviors, hudText, requireWelcomeClick } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// ANCHOR: config
/**
 * Screen dimensions and other game configuration.  The `accelerometerMode` is
 * what turns the phone's tilt sensor on.  `ANDROID_LANDSCAPE` means "an Android
 * phone, held sideways", which is how we'll lock the app in a moment.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = false;
  accelerometerMode = AccelerometerMode.ANDROID_LANDSCAPE;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}
// ANCHOR_END: config

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
        // ANCHOR: vibrate
        // A short buzz.  On a phone, you feel it.  On a computer, JetLag just
        // writes a note to the console
        stage.platform.vibrate(40);
        // ANCHOR_END: vibrate
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

// ANCHOR: wake_lock
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
// ANCHOR_END: wake_lock

/**
 * Build the level: a marble that you roll around by tilting the phone (or by
 * pressing the arrow keys, on a computer), and some gems to roll it into.
 */
function builder() {
  boundingBox();
  keepScreenOn();
  stage.visibility.onGainVisibility = keepScreenOn;

  // ANCHOR: marble
  // The marble is moved by tilt.  Tilt only moves dynamic bodies
  new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#3a86ff", lineWidth: 0.05, lineColor: "#1d4e9e" }),
    rigidBody: new CircleBody({ cx: 1.5, cy: 7.5, radius: 0.4 }, { dynamic: true, elasticity: 0.3 }),
    movement: new TiltMovement(),
    behaviors: heroBehaviors(),
  });
  // Tilt sets the marble's speed, up to 4 meters per second, instead of pushing
  // it.  That way, it stops when the phone is level.  On a computer, the arrow
  // keys stand in for tilt
  enableArrowKeyForces(4, 4);
  stage.tilt.tiltVelocityOverride = true;
  // ANCHOR_END: marble

  // A few walls to roll around
  wall(5, 5, 0.3, 6);
  wall(9, 4, 0.3, 6);
  wall(13, 5, 0.3, 6);

  gem(3, 1.5);
  gem(7, 7.5);
  gem(11, 1.5);
  gem(11, 7.5);
  gem(14.5, 4.5);

  hudText(0.3, 0.4, 24, "#222222", () => `Gems: ${stage.score.counters.get("gems")} / ${GEMS_TO_WIN}`);

  stage.score.addWinCondition(() => stage.score.counters.get("gems") >= GEMS_TO_WIN);
  stage.score.winSceneBuilder = (overlay) => {
    // A longer buzz for winning
    stage.platform.vibrate(300);
    endScreen(overlay, { title: "You got them all!", next: () => stage.switchTo(builder) });
  };
}

// Browsers only allow vibration and sound after the player has touched the
// page, so start with a "click to begin" screen
initializeAndLaunch("game-player", new Config(), () => requireWelcomeClick(builder));
