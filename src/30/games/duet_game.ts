import { Actor, BoxBody, DebugToggle, DIRECTION, FilledBox, FilledPolygon, FilledRoundedBox, findBehavior, GamepadButton, initializeAndLaunch, JetLagGameConfig, JumpBehavior, KeyCodes, LevelValue, PlayerControlBehavior, Scene, SolidBehavior, stage, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { currentLevel, endScreen, hudText, nextLevel, switchToLevel } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// [mfs] Is this heavily based on the old duet game?  If so, be sure to pull across changes from it

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * Duet: two robots, Red and Blue, have to reach their own exits -- at the
 * same time.  There are two players: Red walks with W, A, and D, and Blue
 * with the arrow keys or a gamepad.
 *
 * Every puzzle piece is a collision rule: colored gates only let their own
 * color through (pass-through IDs), dashed ledges can be jumped up through
 * (one-sided walls), elevators carry whoever stands on them (sticky
 * sides), and pressure plates only hold a door open while someone is
 * standing on them (begin *and* end contact).  The robots themselves share
 * a pass-through ID, so they never block each other.
 */

/** The pass-through ID that every robot shares, so that robots never block each other */
const ROBOTS = 9;

/** The two robots' colors, and the pass-through ID that lets each one through its own gates */
const RED = { fill: "#e0463c", line: "#7d1f19", gate: "#e0463c55", id: 1 };
const BLUE = { fill: "#3c7de0", line: "#1c3f7a", gate: "#3c7de055", id: 2 };
type Robot = typeof RED;

/** One room of the game: where the robots start, and a function that builds the room */
interface Level { name: string; hint: string; red: [number, number]; blue: [number, number]; build: () => void; }

/** The rooms of the game */
const LEVELS: Level[] = [
  {
    name: "1. Colors",
    hint: "Colored gates only let their own color through.  Dashed ledges can be jumped up through.",
    red: [1.5, 8.2], blue: [2.5, 8.2],
    build: () => {
      solid(4, 5.6, 16, 5.9);
      // ANCHOR: ledge_room1
      oneWay(0.9, 7.0, 2.9, 7.25);
      // ANCHOR_END: ledge_room1
      // ANCHOR: gates_room1
      gate(9, 5.9, 9.4, 8.6, RED);
      gate(9, 0, 9.4, 5.6, BLUE);
      // ANCHOR_END: gates_room1
      exit(14.8, 8.15, RED);
      exit(14.8, 5.15, BLUE);
    },
  },
  {
    name: "2. Hold the Door",
    hint: "A plate only holds its door open while someone is standing on it.",
    red: [1.2, 8.2], blue: [2.2, 8.2],
    build: () => {
      // ANCHOR: plates_room2a
      // Two plates share one door: it's open while either one is held
      const doorA = door(7.8, 0, 8.2, 8.6);
      const plates = { a: 0, b: 0 };
      const update = () => (doorA.enabled = plates.a + plates.b == 0);
      plate(4.2, (n: number) => { plates.a = n; update(); });
      // ANCHOR_END: plates_room2a
      // ANCHOR: ledge_room2
      oneWay(9.8, 7.0, 11.8, 7.25);
      // ANCHOR_END: ledge_room2
      solid(12.3, 5.8, 16, 6.1);
      // ANCHOR: plates_room2b
      plate(14.4, (n: number) => { plates.b = n; update(); }, 5.8);
      // ANCHOR_END: plates_room2b
      exit(15.0, 8.15, RED);
      exit(12.9, 5.35, BLUE);
    },
  },
  {
    name: "3. The Elevator",
    hint: "The elevator only runs while its plate is held.  Mind the laser.",
    red: [4.0, 8.2], blue: [3.0, 8.2],
    build: () => {
      // ANCHOR: elevator_room3
      // The elevator, powered by the plate on the left
      let powered = 0, goingUp = true;
      const lift = new Actor({
        appearance: new FilledBox({ width: 1.8, height: 0.3, fillColor: "#c9a227", lineWidth: 0.05, lineColor: "#7a6112" }),
        rigidBody: new BoxBody({ cx: 7.1, cy: 8.75, width: 1.8, height: 0.3 }, { kinematic: true, stickySides: [DIRECTION.N] }),
        behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
      });
      stage.world.repeatEvents.push(() => {
        const y = lift.rigidBody.getCenter().y;
        if (y <= 3.75) goingUp = false;
        if (y >= 8.75) goingUp = true;
        lift.rigidBody.setVelocity(0, powered > 0 ? (goingUp ? -1.8 : 1.8) : 0);
      });
      plate(1.8, (n: number) => (powered = n));
      // ANCHOR_END: elevator_room3
      solid(6.0, 0, 6.2, 7.2);
      // The upper ledge
      solid(8.2, 3.6, 16, 3.9);
      // ANCHOR: plates_room3
      const doorD = door(11.0, 3.9, 11.4, 8.6);
      plate(10.0, (n: number) => (doorD.enabled = n == 0), 3.6);
      // ANCHOR_END: plates_room3
      // ANCHOR: laser_room3
      // A laser that blinks on and off
      const laser = hazardBeam(12.9, 0, 13.1, 3.6, "Zapped by the laser!");
      stage.world.timer.addEvent(new TimedEvent(1.4, true, () => (laser.enabled = !laser.enabled)));
      // ANCHOR_END: laser_room3
      exit(15.0, 3.15, RED);
      exit(15.0, 8.15, BLUE);
    },
  },
];

/** What zapped the robots, to be shown on the lose screen.  It's level storage, so it's forgotten when the level changes. */
const ZAPPED = new LevelValue<string>("zapped", () => "Zapped!");

/** Colors for this game's end screens */
const END_STYLE = { background: "#000000cc", titleColor: "#ffffff" };

/** Build the current room of the game */
function builder() {
  DebugToggle.enable();
  const levelNum = currentLevel();
  const level = LEVELS[levelNum - 1];
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
  // ANCHOR: two_players
  // Two players.  Red walks with W, A, and D.  Blue walks with the arrow keys, or with a
  // gamepad, if there is one.  Each robot is given a way to be controlled, and
  // that's all that the rest of the game knows about the controls.
  drive(red, { left: [KeyCodes.KEY_A], right: [KeyCodes.KEY_D], jump: [KeyCodes.KEY_W] });
  drive(blue, { left: [KeyCodes.KEY_LEFT], right: [KeyCodes.KEY_RIGHT], jump: [KeyCodes.KEY_UP], pad: 0 });
  // ANCHOR_END: two_players
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(builder));
  stage.gamepads[0].setButtonPressHandler(GamepadButton.START, () => stage.switchTo(builder));

  // Win when both robots are standing in their exits at the same time.  Each
  // exit adds one to "home" when its robot arrives.
  stage.score.addWinCondition(() => stage.score.counters.get("home") >= 2);

  // The HUD
  hudText(0.3, 0.1, 26, "#ffffff", () => level.name);
  hudText(0.3, 0.55, 18, "#aab3c5", () => level.hint);
  hudText(10.2, 0.1, 16, "#e0463c", () => "Red: A, D, W");
  // ANCHOR: pad_status
  hudText(10.2, 0.45, 16, "#3c7de0", () => (stage.gamepads[0].connected ? "Blue: arrow keys, or the gamepad (connected)" : "Blue: arrow keys, or a gamepad (press a button on it)"));
  // ANCHOR_END: pad_status
  hudText(10.2, 0.8, 14, "#aab3c5", () => "R, or Start on the gamepad: restart");

  stage.score.winSceneBuilder = (overlay: Scene) => {
    if (levelNum < LEVELS.length) endScreen(overlay, { title: "Both robots made it!", prompt: `Click or press Enter: Next room`, next: () => nextLevel(builder), ...END_STYLE });
    else endScreen(overlay, { title: "You finished Duet!", prompt: `Click or press Enter: Play again from the start`, next: () => switchToLevel(builder, 1), ...END_STYLE });
  };
  // ANCHOR: lose_scene
  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, { title: ZAPPED.get(), prompt: `Click or press Enter: Try the room again`, next: () => stage.switchTo(builder), ...END_STYLE });
  // ANCHOR_END: lose_scene
}

// ANCHOR: control_scheme
/** One way of controlling a robot: the keys that walk and jump, and, if there is one, the gamepad that does the same */
interface ControlScheme {
  /** The keys that walk left, walk right, and jump */
  left: KeyCodes[]; right: KeyCodes[]; jump: KeyCodes[];
  /** Which gamepad slot (0 to 3) can also control this robot, if any */
  pad?: number;
}
// ANCHOR_END: control_scheme

// ANCHOR: drive_fn
/** Ignore small stick drift, so a gamepad that's just sitting there doesn't move a robot */
const DEADZONE = 0.2;

/**
 * Let a player control a robot.  Every way of controlling it, such as keys, a
 * stick, or the directional pad, is turned into one number between -1 and 1,
 * which says how fast to walk.  Everything else about walking is the same.
 *
 * @param robot  The robot
 * @param scheme How this player controls it
 */
function drive(robot: Actor, scheme: ControlScheme) {
  const held = { l: false, r: false };
  stage.keyboard.setKeyDownHandler(scheme.left, () => (held.l = true));
  stage.keyboard.setKeyUpHandler(scheme.left, () => (held.l = false));
  stage.keyboard.setKeyDownHandler(scheme.right, () => (held.r = true));
  stage.keyboard.setKeyUpHandler(scheme.right, () => (held.r = false));
  const jump = () => findBehavior(robot, JumpBehavior)?.jump(0, -10);
  stage.keyboard.setKeyDownHandler(scheme.jump, jump);
  // A gamepad is optional.  A slot is always there, and `connected` says if there's a controller in it.
  const pad = scheme.pad === undefined ? undefined : stage.gamepads[scheme.pad];
  pad?.setButtonPressHandler(GamepadButton.A, jump);

  let wasWalking = false;
  stage.world.repeatEvents.push(() => {
    // How fast the player wants to walk, from -1 (left) to 1 (right)
    let want = (held.r ? 1 : 0) - (held.l ? 1 : 0);
    if (pad?.connected) {
      if (pad.isPressed(GamepadButton.DPAD_LEFT)) want = -1;
      if (pad.isPressed(GamepadButton.DPAD_RIGHT)) want = 1;
      if (Math.abs(pad.leftStick.x) > DEADZONE) want = pad.leftStick.x;
    }
    if (want != 0) {
      robot.rigidBody.xVelocity = want * 4;
      wasWalking = true;
    } else if (wasWalking) {
      robot.rigidBody.xVelocity = 0;
      wasWalking = false;
    } else {
      // A robot that isn't walking skids to a stop if something shoves it,
      // but is otherwise left alone, so that standing on an elevator doesn't break the sticky joint
      const vx = robot.rigidBody.getVelocity().x;
      if (Math.abs(vx) > 0.05) robot.rigidBody.xVelocity = vx * 0.8;
    }
  });
}
// ANCHOR_END: drive_fn

/** What a robot remembers, in its `data`: which robot it is */
class RobotData {
  /** Which robot this is */
  color: Robot;

  /**
   * Make the data for a robot
   *
   * @param color Which robot
   */
  constructor(color: Robot) {
    this.color = color;
  }
}

/**
 * Which robot is this actor?  Actors with no data (like a wall) aren't robots.
 *
 * @param a The actor
 * @returns The robot's color, or undefined if the actor is not a robot
 */
const robotColor = (a: Actor): Robot | undefined => (a.data instanceof RobotData ? a.data.color : undefined);

/**
 * Make one of the two robots
 *
 * @param cx    The x coordinate of the center of the robot
 * @param cy    The y coordinate of the center of the robot
 * @param color Which robot to make
 * @returns     The robot
 */
function robot(cx: number, cy: number, color: Robot) {
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
function solid(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#3a4050", lineWidth: 0.04, lineColor: "#555d70" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}

// ANCHOR: gate
/**
 * A gate that only the robot of the same color can pass through
 *
 * @param l     The x coordinate of the left side
 * @param t     The y coordinate of the top
 * @param r     The x coordinate of the right side
 * @param b     The y coordinate of the bottom
 * @param color The color of the robot that can pass
 */
function gate(l: number, t: number, r: number, b: number, color: Robot) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: color.gate, lineWidth: 0.05, lineColor: color.fill }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }, { passThroughId: [color.id] }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}
// ANCHOR_END: gate

// ANCHOR: one_way
/**
 * A ledge that's only solid from above, so you can jump up through it
 *
 * @param l The x coordinate of the left side
 * @param t The y coordinate of the top
 * @param r The x coordinate of the right side
 * @param b The y coordinate of the bottom
 */
function oneWay(l: number, t: number, r: number, b: number) {
  // Dashes along the ledge, so that it looks different from a wall
  const dashes = [];
  for (let x = l + 0.15; x < r; x += 0.4) dashes.push(new FilledBox({ width: 0.25, height: b - t, fillColor: "#8a93a6", offset: { dx: x + 0.125 - (l + r) / 2, dy: 0 } }));
  new Actor({
    appearance: dashes,
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }, { singleRigidSide: DIRECTION.N }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}
// ANCHOR_END: one_way

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
function door(l: number, t: number, r: number, b: number) {
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

// ANCHOR: plate
/**
 * A pressure plate on the surface whose top is at `surface`.  It counts the
 * robots standing on it, and reports the count to `onChange` whenever a
 * robot steps on or off.
 *
 * @param cx       The x coordinate of the center of the plate
 * @param onChange Code to run with the number of robots on the plate
 * @param surface  The y coordinate of the top of whatever the plate sits on
 */
function plate(cx: number, onChange: (count: number) => void, surface = 8.6) {
  let count = 0;
  const look = new FilledBox({ width: 1.1, height: 0.12, fillColor: "#9b8cff", lineWidth: 0.03, lineColor: "#5a4fb0" });
  new Actor({
    appearance: look,
    rigidBody: new BoxBody({ cx, cy: surface - 0.08, width: 1.1, height: 0.16 }),
    behaviors: new TouchPlateBehavior({
      eligible: (other: Actor) => robotColor(other) != undefined,
      onEnter: () => {
        count += 1;
        look.fillColor = "#f5e663";
        onChange(count);
      },
      onLeave: () => {
        count -= 1;
        if (count == 0) look.fillColor = "#9b8cff";
        onChange(count);
      },
    }),
  });
}
// ANCHOR_END: plate

/**
 * An exit, which only notices the robot of its own color.  When its robot is
 * standing in it, it counts as one of the two that the room needs.
 *
 * @param cx    The x coordinate of the center of the exit
 * @param cy    The y coordinate of the center of the exit
 * @param color The color of the robot that can use the exit
 */
function exit(cx: number, cy: number, color: Robot) {
  const glow = new FilledRoundedBox({ width: 0.9, height: 1.1, radius: 0.2, fillColor: color.gate, lineWidth: 0.06, lineColor: color.fill, z: -1 });
  new Actor({
    appearance: glow,
    rigidBody: new BoxBody({ cx, cy, width: 0.9, height: 1.1 }),
    behaviors: new TouchPlateBehavior({
      eligible: (other: Actor) => robotColor(other) == color,
      onEnter: () => {
        stage.score.counters.add("home", 1);
        glow.fillColor = color.fill;
      },
      // ANCHOR: exit_leave
      // Stepping back out of the exit takes the robot away from the count again
      onLeave: () => {
        stage.score.counters.add("home", -1);
        glow.fillColor = color.gate;
      },
      // ANCHOR_END: exit_leave
    }),
  });
}

// ANCHOR: beam
/**
 * A laser beam: a sensor that ends the attempt if a robot touches it
 *
 * @param l       The x coordinate of the left side
 * @param t       The y coordinate of the top
 * @param r       The x coordinate of the right side
 * @param b       The y coordinate of the bottom
 * @param message What to tell the player, on the screen that follows
 * @returns       The beam, so that it can be switched on and off
 */
function hazardBeam(l: number, t: number, r: number, b: number, message: string) {
  return new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#ff2d55", lineWidth: 0.08, lineColor: "#ff2d5566" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new TouchPlateBehavior({
      eligible: (other: Actor) => robotColor(other) != undefined,
      onEnter: () => {
        ZAPPED.set(message);
        stage.score.loseLevel();
      },
    }),
  });
}
// ANCHOR_END: beam


// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
