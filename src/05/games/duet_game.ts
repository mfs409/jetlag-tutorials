import { Actor, BoxBody, DIRECTION, FilledBox, FilledRoundedBox, initializeAndLaunch, JetLagGameConfig, SolidBehavior, stage, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { RED, BLUE, Robot, Level, ZAPPED, isRobot, solid, door, startRoom } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/** The rooms of the game */
const LEVELS: Level[] = [
  // ANCHOR: room1
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
  // ANCHOR_END: room1
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

/**
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
function builder() {
  startRoom(builder, LEVELS);
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
      eligible: isRobot,
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
      eligible: (other: Actor) => isRobot(other) && other.data.color == color,
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
      eligible: isRobot,
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
