/**
 * Helpers for Penguin Heist.
 *
 * Everything in this file is provided for you.  It builds the parts of the game
 * that aren't about movement: the world, the map, the igloo, the penguin
 * itself, the fish, the compass, the HUD, and the end screens.  You don't need
 * to write any of it, and you don't need to understand it to finish this
 * chapter.  The milestone pages will point at the parts that matter.  Feel free to
 * read it when you're curious, but leave it alone.
 */

import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, GoalBehavior, PlayerControlBehavior, PolygonBody, Scene, ScoreService, SolidBehavior, stage } from "jetlag2d";
import { boundingBox, endScreen, hudText } from "../common/common";

/** The size of the world */
const WORLD_W = 44;

/** Where the igloo is */
const HOME_SPOT = { x: 1.6, y: 4.5 };

/** Where the fish is */
const FISH_SPOT = { x: 42.3, y: 4.5 };

/** Colors for this game's end screens */
const END_STYLE = { background: "#0b1a26dd", titleColor: "#ffffff", detailColor: "#bfe4f2" };

/** How to start the level over, which is what the end screens do when they're clicked */
let restart: () => void;

/**
 * Build everything in the level except what you write: the world's edges, the
 * snowdrifts, the rocks, the fence, the tents, the igloo, the penguin, the
 * compass, the HUD, and the win screen.
 *
 * @param thisLevel The builder that called this function, so that the end
 *                  screens can start the level over
 *
 * @returns The penguin, and the colored outline around it
 */
function startLevel(thisLevel: () => void) {
  restart = thisLevel;
  DebugToggle.enable();
  stage.backgroundColor = "#eef4f8";
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: 9 });

  // The world's edges
  boundingBox(0, 0, WORLD_W, 9);

  // Snowdrifts near home
  snowdrift(6.5, 0, 7.1, 6.0);
  snowdrift(9.3, 3.0, 9.9, 9);
  snowdrift(4.3, 7.2, 5.8, 9);
  snowdrift(11.0, 0, 12.0, 1.6);

  // Rocks on the lake
  const rocks = [
    { cx: 16.5, cy: 3.0, r: 0.6 },
    { cx: 19.5, cy: 6.6, r: 0.7 },
    { cx: 22.5, cy: 2.2, r: 0.5 },
    { cx: 24.5, cy: 5.4, r: 0.65 },
    { cx: 18.0, cy: 8.3, r: 0.4 },
  ];
  for (const rock of rocks) {
    new Actor({
      appearance: new FilledCircle({ radius: rock.r, fillColor: "#8c9aa6", lineWidth: 0.05, lineColor: "#5d6a75" }),
      rigidBody: new CircleBody({ cx:rock.cx, cy:rock.cy, radius: rock.r }, { elasticity: 0.4 }),
      behaviors: new SolidBehavior(),
    });
  }

  // The camp fence, with three gates
  const fences = [{ t: 0, b: 1.2 }, { t: 2.5, b: 3.85 }, { t: 5.15, b: 6.5 }, { t: 7.8, b: 9 }];
  for (const f of fences) {
    fence(27.3, f.t, 27.7, f.b);
  }

  // Tents in the camp, to hide behind
  tent(32.0, 4.5, 1.6);
  tent(35.5, 2.4, 1.3);
  tent(35.5, 6.8, 1.3);
  tent(39.2, 1.3, 1.1);
  tent(39.2, 7.7, 1.1);

  // Home: the igloo only matters once you're carrying a fish
  new Actor({
    appearance: [
      new FilledCircle({ radius: 1.1, fillColor: "#ffffff", lineWidth: 0.06, lineColor: "#a9c2d4" }),
      new FilledRoundedBox({ width: 0.7, height: 0.6, radius: 0.25, fillColor: "#33414d", offset: { dx: 0.75, dy: 0.2 } }),
    ],
    rigidBody: new CircleBody({ cx: HOME_SPOT.x, cy: HOME_SPOT.y, radius: 1.1 }),
    behaviors: new GoalBehavior({
      onArrival: () => {
        if (stage.score.counters.get("fish") < 1) return false;
        stage.score.winLevel();
        return true;
      },
    }),
  });

  // The penguin.  It's a dynamic body, but nothing moves it yet.
  const outline = new FilledCircle({ radius: 0.35, fillColor: "#1d2328", lineWidth: 0.08, lineColor: "#8b5a2b" });
  const penguin = new Actor({
    appearance: [
      outline,
      new FilledCircle({ radius: 0.22, fillColor: "#ffffff", offset: { dx: 0, dy: 0.06 } }),
      new FilledPolygon({ vertices: [{ x: -0.08, y: 0 }, { x: 0.08, y: 0 }, { x: 0, y: 0.12 }], fillColor: "#f29c1f", offset: { dx: 0, dy: -0.12 } }),
    ],
    rigidBody: new CircleBody({ cx: 3.3, cy: 4.5, radius: 0.35 }, { dynamic: true, elasticity: 0.3, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // The compass: the camp is much wider than the screen, so an arrow on the HUD
  // points the way to the fish, or to the igloo once you have it.
  const compass = new Actor({
    appearance: new FilledPolygon({ vertices: [{ x: 0.45, y: 0 }, { x: -0.25, y: -0.3 }, { x: -0.1, y: 0 }, { x: -0.25, y: 0.3 }], fillColor: "#b0431f", lineWidth: 0.04, lineColor: "#5e2a14" }),
    rigidBody: new BoxBody({ cx: 8, cy: 1.0, width: 0.6, height: 0.6 }, { scene: stage.hud, collisionsEnabled: false }),
  });
  stage.world.repeatEvents.push(() => {
    const from = penguin.rigidBody.getCenter();
    const goal = stage.score.counters.get("fish") > 0 ? HOME_SPOT : FISH_SPOT;
    compass.rigidBody.rotation = Math.atan2(goal.y - from.y, goal.x - from.x);
  });

  // The HUD
  hudText(6.5, 0.15, 24, "#b0431f", () => stage.score.counters.get("fish") > 0 ? "You have the fish.  Get home!" : "Steal the fish from the bears' camp");
  hudText(14.2, 0.15, 24, "#1d2328", () => stage.score.counters.get(ScoreService.STOPWATCH).toFixed(1));

  stage.score.winSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "Heist complete!", detail: `Home with the fish in ${stage.score.counters.get(ScoreService.STOPWATCH).toFixed(1)} seconds`, prompt: "Click or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });
  return { penguin, outline };
}

/**
 * The fish.  Grabbing it adds one to the "fish" counter, which the igloo and the
 * HUD both look at.
 *
 * @param onCollect What else should happen when the penguin picks the fish up
 */
function makeFish(onCollect: () => void) {
  new Actor({
    appearance: [
      new FilledBox({ width: 0.9, height: 0.9, fillColor: "#9b6a3c", lineWidth: 0.06, lineColor: "#5e3f22" }),
      new FilledPolygon({ vertices: [{ x: -0.3, y: 0 }, { x: 0.1, y: -0.18 }, { x: 0.25, y: 0 }, { x: 0.1, y: 0.18 }], fillColor: "#f28c4a" }),
      new FilledPolygon({ vertices: [{ x: 0.25, y: 0 }, { x: 0.4, y: -0.15 }, { x: 0.4, y: 0.15 }], fillColor: "#f28c4a" }),
    ],
    rigidBody: new BoxBody({ cx: FISH_SPOT.x, cy: FISH_SPOT.y, width: 0.9, height: 0.9 }),
    behaviors: new CollectableBehavior({
      onCollect: () => {
        stage.score.counters.add("fish", 1);
        onCollect();
        return true;
      },
    }),
  });
}

// ANCHOR: caught
/**
 * End the level because a guard caught the penguin
 *
 * @param why What to tell the player, on the "Caught!" screen
 */
function caught(why: string) {
  stage.score.loseSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "Caught!", detail: why, prompt: "Click or press Enter to play again", next: restart, ...END_STYLE });
  stage.score.loseLevel();
}
// ANCHOR_END: caught

/**
 * A snowdrift
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 */
function snowdrift(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledRoundedBox({ width: r - l, height: b - t, radius: 0.25, fillColor: "#d6e3ed", lineWidth: 0.05, lineColor: "#aebfcc" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * A section of the camp's wooden fence
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 */
function fence(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#7a5634", lineWidth: 0.05, lineColor: "#4d3620" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * A triangular tent
 *
 * @param cx   The x coordinate of the center of the tent
 * @param cy   The y coordinate of the center of the tent
 * @param size The width and height of the tent
 */
function tent(cx: number, cy: number, size: number) {
  const vertices = [{ x: -size / 2, y: size / 2 }, { x: 0, y: -size / 2 }, { x: size / 2, y: size / 2 }];
  new Actor({
    appearance: new FilledPolygon({ vertices, fillColor: "#c96f3b", lineWidth: 0.05, lineColor: "#7e4122" }),
    rigidBody: new PolygonBody({ cx, cy, vertices }),
    behaviors: new SolidBehavior(),
  });
}

export { startLevel, makeFish, caught };
