import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, GoalBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, ScoreService, SolidBehavior, stage, TextSprite, TimedEvent } from "jetlag2d";
import { endScreen } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * Firefly Jar, milestone 6, step 3: a golden firefly is worth three.
 */
function builder() {
  // The garden's hedges, as rectangles (left, top, right, bottom)
  const HEDGES = [
    { l: 3.25, t: 0, r: 3.75, b: 3.2 },
    { l: 3.25, t: 5.8, r: 3.75, b: 9 },
    { l: 5.5, t: 2.0, r: 10.5, b: 2.5 },
    { l: 5.5, t: 6.5, r: 10.5, b: 7.0 },
    { l: 12.25, t: 1.5, r: 12.75, b: 4.1 },
    { l: 12.25, t: 4.9, r: 12.75, b: 7.5 },
    { l: 12.75, t: 1.5, r: 15.0, b: 2.0 },
    { l: 12.75, t: 7.0, r: 14.2, b: 7.5 },
    { l: 8.75, t: 0, r: 9.25, b: 1.1 },
    { l: 6.75, t: 7.9, r: 7.25, b: 9 },
    { l: 10.5, t: 3.6, r: 11.0, b: 5.4 },
  ];

  // The garden's trees, as circles (center and radius)
  const TREES = [
    { cx: 1.6, cy: 1.4, radius: 0.6 },
    { cx: 1.8, cy: 7.6, radius: 0.7 },
    { cx: 8.0, cy: 4.5, radius: 0.8 },
    { cx: 6.2, cy: 1.0, radius: 0.45 },
    { cx: 10.8, cy: 8.0, radius: 0.5 },
    { cx: 14.8, cy: 0.7, radius: 0.4 },
  ];

  /** The hard-to-reach nooks where a golden firefly might appear */
  const GOLDEN_SPOTS = [{ cx: 4.6, cy: 1.2 }, { cx: 15.5, cy: 8.5 }, { cx: 11.5, cy: 0.5 }, { cx: 4.4, cy: 8.5 }];

  // How often a golden firefly blinks on
  const GOLDEN_SPAWN_FREQ = 8;

  // How long a golden firefly stays lit
  const GOLDEN_FIREFLY_LIFETIME = 3;

  // How many seconds the instructions stay on the screen
  const HELP_TIME = 6;

  // How many fireflies it takes to fill the jar
  const GOAL = 10;

  // The location and size of the jar
  const JAR = { cx: 14.2, cy: 4.5, width: 0.9, height: 1.1 };

  // The night sky color
  const NIGHT_COLOR = "#0b1430";

  // The color at dawn
  const DAWN_COLOR = "#b86a7c";

  // How many seconds until dawn
  const DAWN = 45;

  // Colors for this game's end screens
  const END_STYLE = { background: "#000000cc", titleColor: "#fff27a", detailColor: "#ffffff" };

  // How often a new firefly blinks on
  const SPAWN_FREQ = 1.3;

  // How far a firefly's glow reaches, in meters
  const GLOW_RADIUS = 0.45;

  // How long a firefly stays lit
  const FIREFLY_LIFETIME = 4;

  // How long a firefly flickers, as a warning, before it goes out
  const FLICKER_TIME = 1.2;

  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // Set the color of the background
  stage.backgroundColor = NIGHT_COLOR;

  // Draw the hedges as solid, labeled gray boxes
  for (const hedge of HEDGES) {
    new Actor({
      appearance: [
        new FilledBox({ width: hedge.r - hedge.l, height: hedge.b - hedge.t, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "hedge"),
      ],
      rigidBody: new BoxBody({ cx: (hedge.l + hedge.r) / 2, cy: (hedge.t + hedge.b) / 2, width: hedge.r - hedge.l, height: hedge.b - hedge.t }),
      behaviors: new SolidBehavior(),
    });
  }

  // Draw the trees as solid, labeled gray circles
  for (const tree of TREES) {
    new Actor({
      appearance: [
        new FilledCircle({ radius: tree.radius, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "tree"),
      ],
      rigidBody: new CircleBody({ cx: tree.cx, cy: tree.cy, radius: tree.radius }),
      behaviors: new SolidBehavior(),
    });
  }

  // The main character, who starts at the left
  const hero = new Actor({
    appearance: [
      new FilledCircle({ radius: 0.35, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#111827" }, "you"),
    ],
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }, { dynamic: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // The arrow keys say which way the hero wants to go.  `dx` is -1 (left), 0,
  // or 1 (right), and `dy` is -1 (up), 0, or 1 (down).
  //
  // The key handlers set or clear dx/dy, and a helper function computes the
  // actual velocity.
  const speed = 5;
  let dx = 0;
  let dy = 0;

  // Turn the direction into a velocity whose *length* is 5
  const updateVelocity = () => {
    const length = Math.hypot(dx, dy);
    // If the length is 0, dx == dy == 0, so we can't divide by length, we need
    // to just use 0.
    const scale = length > 0 ? speed / length : 0;
    hero.rigidBody.xVelocity = dx * scale;
    hero.rigidBody.yVelocity = dy * scale;
  };

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => { dx = 1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => { dx = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => { dx = -1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => { dx = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => { dy = -1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_UP, () => { dy = 0; updateVelocity(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => { dy = 1; updateVelocity(); });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_DOWN, () => { dy = 0; updateVelocity(); });

  // A new firefly blinks on every so often, somewhere in the open
  stage.world.timer.addEvent(new TimedEvent(SPAWN_FREQ, true, () => {
    const spot = randomOpenSpot(GLOW_RADIUS);
    makeFirefly(spot.cx, spot.cy, "fireflies", "firefly", FIREFLY_LIFETIME, FLICKER_TIME);
  }));

  // Golden fireflies are rarer, hide in corners, and blink out faster
  stage.world.timer.addEvent(new TimedEvent(GOLDEN_SPAWN_FREQ, true, () => {
    const spot = GOLDEN_SPOTS[Math.floor(Math.random() * GOLDEN_SPOTS.length)];
    makeFirefly(spot.cx, spot.cy, "golden", "gold", GOLDEN_FIREFLY_LIFETIME, FLICKER_TIME);
  }));

  // One firefly is already lit when the game starts
  makeFirefly(5.5, 4.5, "fireflies", "firefly", FIREFLY_LIFETIME, FLICKER_TIME);

  // The jar.  When the hero gets to it, it sets "arrivals", so that the game will end in victory.
  new Actor({
    appearance: [
      new FilledBox({ width: JAR.width, height: JAR.height, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "jar"),
    ],
    rigidBody: new BoxBody({ cx: JAR.cx, cy: JAR.cy, width: JAR.width, height: JAR.height }),
    behaviors: new GoalBehavior({
      onArrival: () => {
        // The jar only accepts the hero once it has enough fireflies
        if (caught() < GOAL) return false;
        stage.score.counters.add("arrivals", 1);
        return true;
      },
    }),
  });

  // Describe the condition for winning
  stage.score.addWinCondition(() => stage.score.counters.get("arrivals") >= 1);

  // A nice message for when the game is won
  stage.score.winSceneBuilder = (overlay: Scene) => {
    endScreen(overlay, {
      title: "The jar is glowing!",
      detail: `${caught()} fireflies, with ${Math.floor(timeLeft(DAWN))} seconds to spare`,
      prompt: "Click or press Enter to play again",
      next: () => stage.switchTo(builder), ...END_STYLE });
  };

  // The sky slowly brightens toward dawn
  stage.world.timer.addEvent(new TimedEvent(0.25, true, () => {
    stage.backgroundColor = mixColor(NIGHT_COLOR, DAWN_COLOR, stage.score.counters.get(ScoreService.STOPWATCH) / DAWN);
  }));

  // The game is lost if dawn comes first
  stage.score.addLoseCondition(() => timeLeft(DAWN) <= 0);

  // Provide a nice message when the game is lost.  When the player clicks,
  // `stage.switchTo(builder)` starts a fresh game: it wipes out the old actors,
  // timers, and score, and then calls `builder()` again.
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    endScreen(overlay, {
      title: "The sun came up...",
      detail: `...and the fireflies went to sleep.  You caught ${caught()}.`,
      prompt: "Click or press Enter to play again",
      next: () => stage.switchTo(builder),
      background: END_STYLE.background,
      titleColor: END_STYLE.titleColor,
      detailColor: END_STYLE.detailColor,
    });
  };

  // Put some info on the hud.  The words are a function, so they stay current.
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 28, color: "#fff27a" },
      () => caught() >= GOAL ? `Jar full (${caught()})! Get to the jar!` : `Fireflies: ${caught()} / ${GOAL}`),
    rigidBody: new BoxBody({ cx: 0.3, cy: 0.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 28, color: "#ffffff" },
      () => `Dawn in ${Math.ceil(timeLeft(DAWN))}`),
    rigidBody: new BoxBody({ cx: 13.4, cy: 0.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  // At the start, say what to do.  The words go away after a few seconds.
  const help = new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 26, color: "#ffffff", strokeColor: "#000000", strokeWidth: 4 },
      `Arrow keys to move.  Catch ${GOAL} fireflies, then get to the jar!`),
    rigidBody: new BoxBody({ cx: 8, cy: 7.9, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  stage.world.timer.addEvent(new TimedEvent(HELP_TIME, false, () => help.remove()));
}

/**
 * Make one firefly at (cx, cy).  It has a CollectableBehavior, so when the hero touches it, it disappears, and the
 * "fireflies" counter goes up by one.  It doesn't wait around forever: it blinks out on its own after `lifetime` seconds.  For the
 * last `flickerTime` seconds of its life it flickers, so the player gets a warning that it's about to go.
 *
 * @param cx          The X coordinate of the firefly's center
 * @param cy          The Y coordinate of the firefly's center
 * @param counter     The name of the counter to bump when it's caught ("fireflies" or "golden")
 * @param label       The text to write on the firefly's gray box
 * @param lifetime    How many seconds before it blinks out on its own
 * @param flickerTime How many seconds, at the end of its life, it flickers
 */
function makeFirefly(cx: number, cy: number, counter: string, label: string, lifetime: number, flickerTime: number) {
  // For now, a firefly is a light gray box with a label on it
  const box = new FilledBox({ width: 0.55, height: 0.55, fillColor: "#d1d5db" });

  const firefly = new Actor({
    appearance: [box, new TextSprite({ center: true, face: "Arimo Regular", size: 11, color: "#111827" }, label)],
    rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
    behaviors: new CollectableBehavior({ onCollect: counter }),
  });

  // For the very last half second, the flicker gets twice as fast
  const fastFlickerTime = 0.5;

  // Every tenth of a second, this timer adds 0.1 to the firefly's age, and
  // decides what the firefly should look like right now.
  let age = 0;
  const ticker = new TimedEvent(0.1, true, () => {
    age += 0.1;
    if (age >= lifetime) {
      // Its time is up: remove the firefly, and stop this timer.  (If the
      // hero already caught it, removing it again does no harm.)
      firefly.remove();
      ticker.cancelled = true;
    } else if (age >= lifetime - flickerTime) {
      // It's almost out of time, so flicker.  `Math.floor(age * 5) % 2` flips
      // between 0 and 1 every 0.2 seconds, and for the last `fastFlickerTime`
      // seconds, `* 10` makes it flip twice as fast.  When `on` is true, the
      // box is solid gray.  When it's false, it dims by becoming mostly
      // see-through ("30").
      const on = Math.floor(age * (age >= lifetime - fastFlickerTime ? 10 : 5)) % 2 == 0;
      box.fillColor = on ? "#d1d5db" : "#d1d5db30";
    }
  });
  stage.world.timer.addEvent(ticker);
}

/**
 * Pick a random spot where a firefly fits: all of its glow is on the screen, and nothing else (a hedge, a tree, the
 * jar, the hero, or another firefly) is in the way
 *
 * @param glowRadius How far the firefly's glow reaches, in meters
 *
 * @returns The cx/cy of an available spot
 */
function randomOpenSpot(glowRadius: number) {
  while (true) {
    // Keep the whole glow on the screen, which is 16 meters wide and 9 meters tall
    const cx = glowRadius + Math.random() * (16 - 2 * glowRadius);
    const cy = glowRadius + Math.random() * (9 - 2 * glowRadius);
    // Ask the world what's near that spot, in a square the size of the glow.  If the answer is "nothing", we're done.
    // Otherwise, pick a different spot.
    if (stage.world.physics.actorsAt({ x: cx, y: cy }, 2 * glowRadius).length == 0) return { cx, cy };
  }
}

// ANCHOR: score
/** How many ordinary fireflies a golden firefly is worth */
const GOLDEN_FIREFLY_VALUE = 3;

/**
 * Report how many fireflies the player has caught.  Any time a firefly is
 * caught, the "fireflies" score counter goes up by one, and any time a golden
 * firefly is caught, the "golden" score counter goes up by one.  A golden
 * firefly is worth `GOLDEN_FIREFLY_VALUE` ordinary ones.
 *
 * @returns The player's score
 */
function caught() {
  return stage.score.counters.get("fireflies") + GOLDEN_FIREFLY_VALUE * stage.score.counters.get("golden");
}
// ANCHOR_END: score

/**
 * Report how many seconds are left until dawn.  JetLag has a built-in counter,
 * `ScoreService.STOPWATCH`, that goes up by one every second that the game is
 * running.
 *
 * @param dawn How many seconds the night lasts
 *
 * @returns The seconds until dawn, but never less than zero
 */
function timeLeft(dawn: number) {
  return Math.max(0, dawn - stage.score.counters.get(ScoreService.STOPWATCH));
}

/**
 * Blend two "#rrggbb" colors
 *
 * @param color1 The first color as a hex string
 * @param color2 The second color as a hex string
 * @param ratio  A ratio: 0 means "all first color", 1 means "all second color",
 *               fractions blend.
 * @returns      The blended color as a hex string
 */
function mixColor(color1: string, color2: string, ratio: number) {
  // Keep the ratio between 0 and 1, even if the caller gives something else
  ratio = Math.min(1, Math.max(0, ratio));

  // A color like "#0b1430" is three two-digit hex numbers: red ("0b"), green
  // ("14"), and blue ("30").  `slice` cuts out each pair of digits, and
  // `parseInt(..., 16)` turns it into a regular number from 0 to 255.
  const red1 = parseInt(color1.slice(1, 3), 16);
  const green1 = parseInt(color1.slice(3, 5), 16);
  const blue1 = parseInt(color1.slice(5, 7), 16);
  const red2 = parseInt(color2.slice(1, 3), 16);
  const green2 = parseInt(color2.slice(3, 5), 16);
  const blue2 = parseInt(color2.slice(5, 7), 16);

  // Blend each part on its own.  When ratio is 0, this is all color1.  When
  // it's 1, it's all color2.  When it's 0.25, it's 75% color1 and 25% color2.
  const red = Math.round(red1 * (1 - ratio) + red2 * ratio);
  const green = Math.round(green1 * (1 - ratio) + green2 * ratio);
  const blue = Math.round(blue1 * (1 - ratio) + blue2 * ratio);

  // Turn each number back into two hex digits.  `toString(16)` writes a number
  // in hex, and `padStart(2, "0")` adds a leading zero when the number is small
  // (so 11 becomes "0b", not "b").
  const redHex = red.toString(16).padStart(2, "0");
  const greenHex = green.toString(16).padStart(2, "0");
  const blueHex = blue.toString(16).padStart(2, "0");
  return "#" + redHex + greenHex + blueHex;
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
