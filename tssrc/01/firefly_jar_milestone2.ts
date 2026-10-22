import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, GoalBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, ScoreService, SolidBehavior, stage, TextSprite, TimedEvent } from "../jetlag";
import { endScreen } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    prefix: "../assets/",
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * MILESTONE 2 for Firefly Jar (the end of Part 2).
 *
 * The whole game works, but everything is gray.
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

  // The location and size of the jar
  const JAR = { cx: 14.2, cy: 4.5, width: 0.9, height: 1.1 };

  // How many fireflies it takes to fill the jar
  const GOAL = 10;

  // How many seconds until dawn
  const DAWN = 45;

  // How often a new firefly blinks on
  const SPAWN_FREQ = 1.3;

  // How long a firefly stays lit
  const FIREFLY_LIFETIME = 4;

  // How long a firefly flickers, as a warning, before it goes out
  const FLICKER_TIME = 1.2;

  /** The hard-to-reach nooks where a golden firefly might appear */
  const GOLDEN_SPOTS = [{ cx: 4.6, cy: 1.2 }, { cx: 15.5, cy: 8.5 }, { cx: 11.5, cy: 0.5 }, { cx: 4.4, cy: 8.5 }];

  // Colors for this game's end screens
  const END_STYLE = { background: "#000000cc", titleColor: "#fff27a", detailColor: "#ffffff" };

  // Pressing 'b' will show hit boxes
  DebugToggle.enable();

  // Set the color of the background
  stage.backgroundColor = "#1f2937";

  // ANCHOR: solid_shapes
  // Draw the hedges as labeled boxes
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

  // Draw the trees as labeled circles
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
  // ANCHOR_END: solid_shapes

  // The main character, who moves via the arrow keys
  const hero = new Actor({
    appearance: [
      new FilledBox({ width: 0.7, height: 0.7, fillColor: "#9ca3af", lineWidth: 0.04, lineColor: "#d1d5db" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#111827" }, "you"),
    ],
    rigidBody: new CircleBody({ cx: 1.2, cy: 4.5, radius: 0.35 }, { dynamic: true }),
    behaviors: new PlayerControlBehavior(),
  });
  const speed = 5;
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = -speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = -speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = speed));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = 0));
  // TODO if up and right are pressed at the same time, the total velocity will actually be 5 * sqrt(2)

  // ANCHOR: jar
  // The jar only accepts the hero once it has enough fireflies.  It sets
  // "arrivals" in that case, so that the game will end in victory.
  new Actor({
    appearance: [
      new FilledBox({ width: JAR.width, height: JAR.height, fillColor: "#6b7280", lineWidth: 0.04, lineColor: "#9ca3af" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#f3f4f6" }, "jar"),
    ],
    rigidBody: new BoxBody({ cx: JAR.cx, cy: JAR.cy, width: JAR.width, height: JAR.height }),
    behaviors: new GoalBehavior({
      onArrival: () => {
        if (caught() < GOAL) return false;
        stage.score.counters.add("arrivals", 1);
        return true;
      },
    }),
  });

  // Describe the conditions for winning and losing
  stage.score.addWinCondition(() => stage.score.counters.get("arrivals") >= 1);
  stage.score.addLoseCondition(() => timeLeft(DAWN) <= 0);
  // ANCHOR_END: jar

  // ANCHOR: spawners
  // Fireflies blink on every so often, somewhere in the open
  stage.world.timer.addEvent(new TimedEvent(SPAWN_FREQ, true, () => {
    const spot = randomOpenSpot();
    makeFirefly(spot.cx, spot.cy, "fireflies", "firefly", FIREFLY_LIFETIME, FLICKER_TIME);
  }));

  // Golden fireflies are rarer, hide in corners, and blink out faster
  stage.world.timer.addEvent(new TimedEvent(8, true, () => {
    const spot = GOLDEN_SPOTS[Math.floor(Math.random() * GOLDEN_SPOTS.length)];
    makeFirefly(spot.cx, spot.cy, "golden", "gold", 3, FLICKER_TIME);
  }));

  // One firefly is already lit when the game starts
  makeFirefly(5.5, 4.5, "fireflies", "firefly", FIREFLY_LIFETIME, FLICKER_TIME);
  // ANCHOR_END: spawners

  // ANCHOR: hud
  // Put three bits of info on the hud
  // ANCHOR: hud_count
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 28, color: "#fff27a" },
      () => caught() >= GOAL ? `Jar full (${caught()})! Get to the jar!` : `Fireflies: ${caught()} / ${GOAL}`),
    rigidBody: new BoxBody({ cx: 0.3, cy: 0.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  // ANCHOR_END: hud_count
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 28, color: "#ffffff" },
      () => `Dawn in ${Math.ceil(timeLeft(DAWN))}`),
    rigidBody: new BoxBody({ cx: 13.4, cy: 0.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  // For the first few seconds, say what to do
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 26, color: "#ffffff", strokeColor: "#000000", strokeWidth: 4 },
      () => stage.score.counters.get(ScoreService.STOPWATCH) < 6 ? "Arrow keys to move.  Catch 10 fireflies, then get to the jar!" : ""),
    rigidBody: new BoxBody({ cx: 8, cy: 7.9, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  // ANCHOR_END: hud

  // ANCHOR: end
  // Provide nice messages when the game is won or lost.  When the player
  // clicks, `stage.switchTo(builder)` starts a fresh game: it wipes out the
  // old actors, timers, and score, and then calls `builder()` again.
  stage.score.winSceneBuilder = (overlay: Scene) => {
    endScreen(overlay, { 
      title: "The jar is glowing!", 
      detail: `${caught()} fireflies, with ${Math.floor(timeLeft(DAWN))} seconds to spare`, 
      prompt: "Click or press Enter to play again", 
      next: () => stage.switchTo(builder), ...END_STYLE });
  };
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    endScreen(overlay, { 
      title: "The sun came up...", 
      detail: `...and the fireflies went to sleep.  You caught ${caught()}.`, 
      prompt: "Click or press Enter to play again", 
      next: () => stage.switchTo(builder), ...END_STYLE });
    };
  // ANCHOR_END: end
}

// ANCHOR: score
/**
 * Report how many fireflies the player has caught.  Any time a firefly is
 * caught, the "fireflies" score counter goes up by one, and any time a golden
 * firefly is caught, the "golden" score counter goes up by one.  A golden
 * firefly is worth three ordinary ones.
 *
 * @returns The player's score
 */
function caught() {
  return stage.score.counters.get("fireflies") + 3 * stage.score.counters.get("golden");
}

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
// ANCHOR_END: score

// ANCHOR: make_firefly
/**
 * Make one firefly at (cx, cy).
 *
 * A firefly is an ordinary actor with a CollectableBehavior, so when the hero
 * touches it, it disappears and `counter` goes up by one.  What makes it a
 * *firefly* is that it doesn't wait around forever: it blinks out on its own
 * after `lifetime` seconds.  For the last `flickerTime` seconds of its life it
 * flickers, so the player gets a warning that it's about to go.
 *
 * @param cx          The X coordinate of the firefly's center
 * @param cy          The Y coordinate of the firefly's center
 * @param counter     The name of the counter to bump when it's caught
 *                    ("fireflies" or "golden")
 * @param label       The text to write on the firefly's gray box
 * @param lifetime    How many seconds before it blinks out on its own
 * @param flickerTime How many seconds, at the end of its life, it flickers
 */
function makeFirefly(cx: number, cy: number, counter: string, label: string, lifetime: number, flickerTime: number) {
  // For now, a firefly is a light gray box with a label on it
  const box = new FilledBox({ width: 0.55, height: 0.55, fillColor: "#d1d5db" });

  // ANCHOR: firefly_actor
  const firefly = new Actor({
    appearance: [box, new TextSprite({ center: true, face: "Arimo Regular", size: 11, color: "#111827" }, label)],
    rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
    behaviors: new CollectableBehavior({ onCollect: counter }),
  });
  // ANCHOR_END: firefly_actor

  // For the very last half second, the flicker gets twice as fast
  const fastFlickerTime = 0.5;

  // Every tenth of a second, this timer adds 0.1 to the firefly's age, and
  // decides what the firefly should look like right now.
  // ANCHOR: ticker
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
  // ANCHOR_END: ticker
}
// ANCHOR_END: make_firefly

// ANCHOR: random_open_spot
/**
 * Pick a random spot where a firefly fits: nothing else (a hedge, a tree, the
 * jar, the hero, or another firefly) is in the way
 *
 * @returns The cx/cy of an available spot
 */
function randomOpenSpot() {
  // The size of a firefly's outer glow (a circle with a radius of 0.45)
  const fireflySize = 0.9;
  while (true) {
    // NB: Don't go all the way from 0,0 to 16,9, or else some of the circle
    //     will be off screen
    const cx = 0.5 + Math.random() * 15;
    const cy = 0.6 + Math.random() * 7.9;
    // Ask the world what's near that spot.  If the answer is "nothing", we're
    // done.  Otherwise, pick a different spot.
    if (stage.world.physics.actorsAt({ x: cx, y: cy }, fireflySize).length == 0) return { cx, cy };
  }
}
// ANCHOR_END: random_open_spot

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
