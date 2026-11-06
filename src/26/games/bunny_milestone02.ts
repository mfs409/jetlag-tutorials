import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, GoalBehavior, HazardBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, Path, PathMovement, Scene, SessionValue, stage, TextSprite, VideoSprite } from "jetlag2d";
import { boundingBox, endScreen, heroBehaviors } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    videoNames: ["big_buck_bunny.mp4"],
  };
}

/**
 * MILESTONE 2 for Bunny Burrow: the playback controls all work.
 *
 * TODO (A cut scene in an overlay): a cut scene that plays over the win screen of some levels.
 *
 * TODO (The story): a way to watch the story again from the title, and a game that ends back at the title.
 */

/** One level of the game */
interface Level {
  /** What it's called */
  name: string;
  /** Where the carrots are */
  carrots: { x: number; y: number }[];
  /** The foxes, each of which walks back and forth along a path */
  foxes: [number, number][][];
  /** Is there a cut scene after this level? */
  clip: boolean;
}

/** The levels, from the easiest to the hardest */
const LEVELS: Level[] = [
  { name: "The Meadow", carrots: [{ x: 4, y: 6.5 }, { x: 7, y: 2.5 }, { x: 10, y: 6 }, { x: 12.5, y: 3.5 }], foxes: [[[8, 1.5], [8, 7.5]]], clip: false },
  { name: "The Hollow Log", carrots: [{ x: 3, y: 2 }, { x: 5, y: 7 }, { x: 8, y: 4.5 }, { x: 11, y: 7 }, { x: 13, y: 2.5 }, { x: 14.5, y: 6 }], foxes: [[[6.5, 1.5], [6.5, 7.5]], [[11.5, 7.5], [11.5, 1.5]]], clip: true },
  { name: "The Fox's Den", carrots: [{ x: 2.5, y: 3 }, { x: 4, y: 7 }, { x: 6, y: 4 }, { x: 8, y: 7.5 }, { x: 9.5, y: 2 }, { x: 12, y: 5 }, { x: 13.5, y: 7.5 }, { x: 14, y: 3 }], foxes: [[[5, 1.5], [5, 7.5]], [[8, 7.5], [8, 1.5]], [[11, 1.5], [11, 7.5]]], clip: true },
];

/**
 * Play a cut scene: a video, with buttons to skip it, pause it, and watch it
 * again.  It works in a level, or in an overlay, and does the same things in
 * both.
 *
 * @param scene  The overlay to play it in, or nothing, to play it in the level
 * @param onDone What to do when the video ends, or the player skips it
 */
function cutScene(scene: Scene | undefined, onDone: () => void) {
  const video = new VideoSprite({ width: 16, height: 9, vid: "big_buck_bunny.mp4" });
  new Actor({ appearance: video, rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.005 }, { scene }) });
  // A video is shared, and could be left at the end, or paused, by the last
  // cut scene.  Say exactly what we want, and don't count on it starting by itself.
  video.restart();
  video.play();

  /** Has the cut scene already finished?  The video ending, and a skip, can both try to finish it. */
  let done = false;
  /** Stop the video, and carry on with the game.  It does this only once. */
  const finish = () => {
    if (done) return;
    done = true;
    // Moving to a new screen hides a video, but doesn't stop it, so stop it ourselves
    video.pause();
    onDone();
  };
  video.onEnd = finish;

  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_SPACE, KeyCodes.KEY_ENTER, KeyCodes.KEY_ESCAPE], finish);
  /** Is the video playing, as far as the pause button knows? */
  let playing = true;
  /**
   * One of the buttons at the bottom of the screen
   *
   * @param cx     The x coordinate of the middle of the button
   * @param label  The words on it, or a function that makes them
   * @param action What it does when it's tapped
   */
  const button = (cx: number, label: string | (() => string), action: () => void) => new Actor({
    appearance: [new FilledBox({ width: 2.4, height: 0.7, fillColor: "#000000bb", lineWidth: 0.04, lineColor: "#ffffffaa" }), new TextSprite({ center: true, face: "Roboto Black", size: 20, color: "#ffffff" }, label)],
    rigidBody: new BoxBody({ cx, cy: 8.3, width: 2.4, height: 0.7 }, { scene, collisionsEnabled: false }),
    gestures: { onTap: () => { action(); return true; } },
  });
  button(5.4, "Replay", () => { video.restart(); if (!playing) { playing = true; video.play(); } });
  button(8, () => (playing ? "Pause" : "Play"), () => { playing = !playing; if (playing) video.play(); else video.pause(); });
  button(10.6, "Skip", finish);
}

/** The screens of the game */
type Screen = "title" | "intro" | "play";

/** Which screen is showing, and which level it is (if it's the playing screen) */
class Showing {
  /**
   * @param screen Which screen
   * @param level  Which level
   */
  constructor(public screen: Screen = "title", public level = 0) { }
}

/** What is showing, in session storage.  Before anything has been shown, it's the title screen. */
const SHOWING = new SessionValue<Showing>("showing", () => new Showing());

/**
 * Go to another screen
 *
 * @param screen Which one
 * @param level  Which level to play, if it's the playing screen
 */
function show(screen: Screen, level = 0) {
  SHOWING.set(new Showing(screen, level));
  stage.switchTo(builder);
}

/**
 * A bunny, drawn from shapes
 *
 * @param fur The HTML hex color of the fur
 */
const bunnyLook = (fur: string) => [
  new FilledPolygon({ vertices: [{ x: -0.12, y: 0 }, { x: -0.05, y: -0.55 }, { x: 0.02, y: 0 }], fillColor: fur, lineWidth: 0.03, lineColor: "#8a7a7a", offset: { dx: -0.1, dy: -0.35 }, z: 1 }),
  new FilledPolygon({ vertices: [{ x: -0.02, y: 0 }, { x: 0.05, y: -0.55 }, { x: 0.12, y: 0 }], fillColor: fur, lineWidth: 0.03, lineColor: "#8a7a7a", offset: { dx: 0.14, dy: -0.35 }, z: 1 }),
  new FilledCircle({ radius: 0.34, fillColor: fur, lineWidth: 0.04, lineColor: "#8a7a7a", z: 1 }),
  new FilledCircle({ radius: 0.05, fillColor: "#222222", offset: { dx: -0.1, dy: -0.05 }, z: 2 }),
  new FilledCircle({ radius: 0.05, fillColor: "#222222", offset: { dx: 0.14, dy: -0.05 }, z: 2 }),
  new FilledCircle({ radius: 0.07, fillColor: "#ff9ab0", offset: { dx: 0.02, dy: 0.08 }, z: 2 }),
];

/** Build whichever screen is showing */
function builder() {
  DebugToggle.enable();
  const showing = SHOWING.get();
  const screen = showing.screen;
  const levelNum = showing.level;
  const level = LEVELS[levelNum];

  if (screen == "title") {
    stage.backgroundColor = "#bfe3a0";
    new Actor({ appearance: bunnyLook("#f4f0ea"), rigidBody: new CircleBody({ cx: 8, cy: 3.4, radius: 0.34 }) }).resize(4);
    const text = (y: number, size: number, t: string, color = "#2e5a1c") => new Actor({
      appearance: new TextSprite({ center: true, face: "Roboto Black", size, color }, t),
      rigidBody: new BoxBody({ cx: 8, cy: y, width: 0.1, height: 0.1 }),
    });
    text(5.4, 64, "BUNNY BURROW");
    const button = (y: number, label: string, action: () => void) => new Actor({
      appearance: [new FilledBox({ width: 4.6, height: 0.9, fillColor: "#e07a2b", lineWidth: 0.05, lineColor: "#8a4a12" }), new TextSprite({ center: true, face: "Roboto Black", size: 26, color: "#ffffff" }, label)],
      rigidBody: new BoxBody({ cx: 8, cy: y, width: 4.6, height: 0.9 }),
      gestures: { onTap: () => { action(); return true; } },
    });
    // Browsers won't play a video until the player has tapped something.  A title screen is a natural place for that tap.
    button(6.6, "Play", () => show("intro"));
    return;
  }

  if (screen == "intro") {
    stage.backgroundColor = "#000000";
    // The story is a level that has nothing in it but a cut scene.  When it's over, the game begins, or, if it was
    // started from the title screen, goes back there.
    cutScene(undefined, () => (levelNum < 0 ? show("title") : show("play", 0)));
    return;
  }

  // --- The meadow --------------------------------------------------------------------------
  stage.backgroundColor = "#bfe3a0";
  boundingBox();
  const bunny = new Actor({
    appearance: bunnyLook("#f4f0ea"),
    rigidBody: new CircleBody({ cx: 1.2, cy: 7.6, radius: 0.34 }, { dynamic: true, disableRotation: true }),
    behaviors: heroBehaviors({ hitPoints: 1, mustSurvive: true }),
  });
  const held = { l: false, r: false, u: false, d: false };
  const bind = (keys: KeyCodes[], k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
  };
  bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
  bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
  stage.world.repeatEvents.push(() => {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    bunny.rigidBody.setVelocity(dx / len * 4.2, dy / len * 4.2);
  });

  for (const carrot of level.carrots) {
    new Actor({
      appearance: [new FilledPolygon({ vertices: [{ x: -0.16, y: -0.3 }, { x: 0.16, y: -0.3 }, { x: 0, y: 0.35 }], fillColor: "#f28c28", lineWidth: 0.03, lineColor: "#b35a00", z: 1 }), new FilledPolygon({ vertices: [{ x: -0.12, y: 0 }, { x: 0, y: -0.3 }, { x: 0.12, y: 0 }], fillColor: "#4cbf6a", offset: { dx: 0, dy: -0.4 }, z: 1 })],
      rigidBody: new CircleBody({ cx: carrot.x, cy: carrot.y, radius: 0.25 }),
      behaviors: new CollectableBehavior({ onCollect: "carrots" }),
    });
  }

  for (const route of level.foxes) {
    const [start] = route;
    new Actor({
      appearance: [
        new FilledCircle({ radius: 0.42, fillColor: "#d8601c", lineWidth: 0.05, lineColor: "#7a3208", z: 1 }),
        new FilledPolygon({ vertices: [{ x: -0.1, y: 0.1 }, { x: 0, y: -0.3 }, { x: 0.1, y: 0.1 }], fillColor: "#d8601c", lineWidth: 0.03, lineColor: "#7a3208", offset: { dx: -0.25, dy: -0.4 }, z: 1 }),
        new FilledPolygon({ vertices: [{ x: -0.1, y: 0.1 }, { x: 0, y: -0.3 }, { x: 0.1, y: 0.1 }], fillColor: "#d8601c", lineWidth: 0.03, lineColor: "#7a3208", offset: { dx: 0.25, dy: -0.4 }, z: 1 }),
        new FilledCircle({ radius: 0.07, fillColor: "#ffffff", offset: { dx: -0.14, dy: -0.06 }, z: 2 }),
        new FilledCircle({ radius: 0.07, fillColor: "#ffffff", offset: { dx: 0.14, dy: -0.06 }, z: 2 }),
      ],
      rigidBody: new CircleBody({ cx: start[0], cy: start[1], radius: 0.42 }, { disableRotation: true }),
      movement: new PathMovement({ path: new Path().to(route[0][0], route[0][1]).to(route[1][0], route[1][1]).to(route[0][0], route[0][1]), velocity: 2.2 + 0.3 * levelNum, loop: true }),
      behaviors: new HazardBehavior({ damage: 1 }),
    });
  }

  new Actor({
    appearance: [new FilledCircle({ radius: 0.7, fillColor: "#6b4a2b", lineWidth: 0.06, lineColor: "#3d2a18" }), new FilledCircle({ radius: 0.45, fillColor: "#1a120a", offset: { dx: 0, dy: 0.1 } })],
    rigidBody: new CircleBody({ cx: 14.6, cy: 1.4, radius: 0.5 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({
      // The burrow only opens for a bunny who has every carrot
      onArrival: () => {
        if (stage.score.counters.get("carrots") < level.carrots.length) return false;
        stage.score.counters.add("home", 1);
        return true;
      },
    }),
  });
  stage.score.addWinCondition(() => stage.score.counters.get("home") >= 1);

  new Actor({
    appearance: new TextSprite({ center: false, face: "Roboto Black", size: 24, color: "#2e5a1c" }, () => `${level.name}   Carrots ${stage.score.counters.get("carrots")}/${level.carrots.length}`),
    rigidBody: new BoxBody({ cx: 0.3, cy: 0.4, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: "The fox got you!", prompt: "Click or press Enter to try again", next: () => show("play", levelNum), background: "#3a1a0aee", titleColor: "#ffb36b" });
  stage.score.winSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: "Home safe!", prompt: "Click or press Enter to carry on", next: () => (levelNum == LEVELS.length - 1 ? show("play", 0) : show("play", levelNum + 1)), background: "#1d3a0aee", titleColor: "#bfe3a0" });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
