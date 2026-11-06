import { Actor, BoxBody, DebugToggle, DIRECTION, FilledBox, FilledPolygon, FilledRoundedBox, findBehavior, getAppearance, JumpBehavior, KeyCodes, LevelValue, PlayerControlBehavior, Scene, SolidBehavior, stage } from "jetlag2d";
import { currentLevel, endScreen, hudText, nextLevel, switchToLevel } from "../common/common";

/**
 * HELPERS for Duet.
 *
 * Everything in this file is provided, and you don't have to edit it.  It makes
 * the robots, the walls and doors, and the controls, the HUD, and the end
 * screens.  The puzzle pieces are what you write.
 */

/** The pass-through ID that every robot shares, so that robots never block each other */
export const ROBOTS = 9;

/** The two robots' colors, and the pass-through ID that lets each one through its own gates */
export const RED = { fill: "#e0463c", line: "#7d1f19", gate: "#e0463c55", id: 1 };
export const BLUE = { fill: "#3c7de0", line: "#1c3f7a", gate: "#3c7de055", id: 2 };
// [mfs] I'd prefer an interface to this typeof magic
export type Robot = typeof RED;

/** What a robot needs to remember: which color it is.  It is kept on the robot's actor, as its `data`. */
export class RobotData {
  /** Which robot this is */
  color: Robot;

  /**
   * Make the data for a new robot
   *
   * @param color Which robot it is
   */
  // [mfs] Dependency injection?
  constructor(color: Robot) {
    this.color = color;
  }
}

/**
 * Is this actor a robot?  Actors that were given no data (like a wall) aren't.
 * TypeScript learns from the answer: where this is true, `actor.data.color` is known.
 *
 * @param a Any actor
 * @returns True if the actor is one of the robots
 */
// [mfs] Consider removing this idiom throughout all games... it's complicated for beginners
export const isRobot = (a: Actor): a is Actor<RobotData> => a.data instanceof RobotData;

/** One room of the game: where the robots start, and a function that builds the room */
export interface Level { name: string; hint: string; red: [number, number]; blue: [number, number]; build: () => void; }

/** Colors for this game's end screens */
const END_STYLE = { background: "#000000cc", titleColor: "#ffffff" };

// ANCHOR: zapped
/** What zapped the robots, for the lose screen.  Level storage is forgotten when the level restarts. */
export const ZAPPED = new LevelValue<string>("zapped", () => "");
// ANCHOR_END: zapped

/**
 * Build one room of Duet: its walls, the room's own pieces (from `levels`), the
 * two robots and their controls, the HUD, and the end screens.  Which room
 * comes from the current level number.
 *
 * Duet: two robots, Red and Blue, have to reach their own exits -- at the
 * same time.  Tab switches which one you control.
 *
 * Every puzzle piece is a collision rule: colored gates only let their own
 * color through (pass-through IDs), dashed ledges can be jumped up through
 * (one-sided walls), elevators carry whoever stands on them (sticky
 * sides), and pressure plates only hold a door open while someone is
 * standing on them (begin *and* end contact).  The robots themselves share
 * a pass-through ID, so they never block each other.
 */
export function startRoom(thisLevel: () => void, levels: Level[]) {
  DebugToggle.enable();
  const levelNum = currentLevel();

  // [mfs] While I very much like declarative programming, is it coming too soon
  // in the book?  Should we have an 'if' statement instead of picking the level
  // from an array?
  const level = levels[levelNum - 1];
  stage.backgroundColor = "#1f232b";
  stage.world.gravity = { x: 0, y: 20 };

  // The room
  solid(-1, 8.6, 17, 10);
  solid(-1, -1, 0, 9);
  solid(16, -1, 17, 9);
  solid(-1, -1, 17, 0);
  level.build();

  // The robots
  const red = robot(level.red[0], level.red[1], RED);
  const blue = robot(level.blue[0], level.blue[1], BLUE);
  const robots = [red, blue];
  let active = red;
  // Each robot has a little triangle on its head, which is lit for the robot that the player is controlling
  const redMarker = getAppearance(red, FilledPolygon);
  const blueMarker = getAppearance(blue, FilledPolygon);
  const showActive = () => {
    redMarker.fillColor = active == red ? "#ffffff" : "#00000000";
    blueMarker.fillColor = active == blue ? "#ffffff" : "#00000000";
  };
  showActive();

  // ANCHOR: controls
  // Controls.  Walking is event-driven: each key press (and each repeat of a held key) and each
  // key release calls `walk`, which sets the active robot's speed.  Nothing sets the velocity of a
  // robot that is standing still, so that standing on an elevator doesn't break the sticky joint.
  const held = { l: false, r: false };
  const walk = () => {
    if (held.l != held.r) active.rigidBody.xVelocity = held.r ? 4 : -4;
    else active.rigidBody.xVelocity = 0;
  };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = false; walk(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = false; walk(); });

  // A robot that isn't being walked skids to a stop if something shoves it.  This has to be a job
  // for every frame: damping would also slow a robot that is falling or jumping, and friction would
  // need to be on every floor, and would also eat the walking speed between key repeats.
  stage.world.repeatEvents.push(() => {
    for (const r of robots) {
      const walking = r == active && held.l != held.r;
      const vx = r.rigidBody.getVelocity().x;
      if (!walking && Math.abs(vx) > 0.05) r.rigidBody.xVelocity = vx * 0.8;
    }
  });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W, KeyCodes.KEY_SPACE], () => findBehavior(active, JumpBehavior)?.jump(0, -10));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_TAB, () => {
    active.rigidBody.xVelocity = 0;
    active = active == red ? blue : red;
    showActive();
  });
  // ANCHOR_END: controls
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(thisLevel));

  // Win when both robots are standing in their exits at the same time.  Each
  // exit adds one to "home" when its robot arrives.
  stage.score.addWinCondition(() => stage.score.counters.get("home") >= 2);

  // The HUD
  hudText(0.3, 0.1, 26, "#ffffff", () => level.name);
  hudText(0.3, 0.55, 18, "#aab3c5", () => level.hint);
  hudText(10.3, 0.1, 20, "#aab3c5", () => `Tab: switch (${active == red ? "Red" : "Blue"})   R: restart`);

  stage.score.winSceneBuilder = (overlay: Scene) => {
    if (levelNum < levels.length) endScreen(overlay, { title: "Both robots made it!", prompt: `Click or press Enter: Next room`, next: () => nextLevel(thisLevel), ...END_STYLE });
    else endScreen(overlay, { title: "You finished Duet!", prompt: `Click or press Enter: Play again from the start`, next: () => switchToLevel(thisLevel, 1), ...END_STYLE });
  };
  // ANCHOR: lose_scene
  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: ZAPPED.get(), prompt: `Click or press Enter: Try the room again`, next: () => stage.switchTo(thisLevel), ...END_STYLE });
  // ANCHOR_END: lose_scene
}

/**
 * Make one of the two robots
 *
 * @param cx    The x coordinate of the center of the robot
 * @param cy    The y coordinate of the center of the robot
 * @param color Which robot to make
 * @returns     The robot
 */
export function robot(cx: number, cy: number, color: Robot) {
  const r = new Actor({
    appearance: [
      new FilledRoundedBox({ width: 0.6, height: 0.8, radius: 0.12, fillColor: color.fill, lineWidth: 0.05, lineColor: color.line }),
      new FilledBox({ width: 0.4, height: 0.14, fillColor: "#e8f4ff", offset: { dx: 0, dy: -0.15 } }),
      new FilledPolygon({ vertices: [{ x: -0.18, y: -0.15 }, { x: 0.18, y: -0.15 }, { x: 0, y: 0.1 }], fillColor: "#ffffff", offset: { dx: 0, dy: -0.72 } }),
    ],
    rigidBody: new BoxBody({ cx, cy, width: 0.6, height: 0.8 }, {
      dynamic: true,
      disableRotation: true,
      // ANCHOR: pass_through
      // A robot doesn't collide with anything that shares a number with it:
      // its own color's gates, and the other robot
      passThroughId: [color.id, ROBOTS],
      // ANCHOR_END: pass_through
    }),
    behaviors: [new PlayerControlBehavior(), new JumpBehavior(), new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] })],
    data: new RobotData(color),
  });
  return r;
}

/**
 * A plain solid wall.  Only its top counts as ground for jumping.
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 */
export function solid(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#3a4050", lineWidth: 0.04, lineColor: "#555d70" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}

// ANCHOR: door
/**
 * A door.  It's open whenever it's disabled.
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 * @returns The door, so that a plate can open and close it
 */
export function door(l: number, t: number, r: number, b: number) {
  // The frame is always visible, so you can see where the door is when it's open
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#00000000", lineWidth: 0.04, lineColor: "#6b7385" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }, { collisionsEnabled: false }),
  });
  return new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#9b8cff", lineWidth: 0.04, lineColor: "#5a4fb0" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}
// ANCHOR_END: door

