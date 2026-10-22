/**
 * Helpers for Crazy Golf.
 *
 * Everything in this file is provided for you.  It puts together the parts of
 * the game that every hole shares: the rails around the edge of the course, the
 * ball, aiming and putting, the HUD, the end-of-hole screens, and the cup.
 * You don't need to write any of it, and you don't need to understand it to
 * finish this chapter.  The hole pages will point at the parts that matter.
 * Feel free to read it when you're curious, but leave it alone.
 */

import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, GoalBehavior, KeyCodes, PlayerControlBehavior, Scene, SolidBehavior, stage, StateEvent, TextSprite, TimedEvent } from "../jetlag";
import { endScreen } from "../common/common";

// ANCHOR: walls
/**
 * WallKind simplifies some code later on, by capturing the details of different
 * materials we might simulate when building a wall
 */
interface WallKind {
  /** The HTML hex color for the wall */
  fill: string;
  /** The HTML hex color for the wall outline */
  line: string;
  /** The elasticity of the wall */
  elasticity: number;
}
/** The three kinds of wall */
const WALLS = {
  wood: { fill: "#6d4c2f", line: "#4a321e", elasticity: 0.6 },
  rubber: { fill: "#d63a3a", line: "#8e1f1f", elasticity: 1.15 },
  sand: { fill: "#d8c28a", line: "#a8925a", elasticity: 0 },
};
// ANCHOR_END: walls

/** If a ball is faster than this, the cup won't accept it */
const CUP_MAX_SPEED = 5;

/** The fastest shot the player can hit */
const MAX_POWER = 16;

/** The ball's default radius */
const BALL_RADIUS = 0.2;

/** The fraction of its speed that a slow-moving ball keeps after one second */
const SLOW_BALL_KEEP = 0.05;

/** The amount of drag that grass gives the ball */
const GRASS_DAMPING = 0.9;

/** Colors for this game's end screens */
const END_STYLE = { background: "#000000cc", titleColor: "#ffe066", detailColor: "#ffffff" };

/**
 * The builder for the first hole.  The game starts over from it after the
 * last hole, and `startHole` records it the first time that it is called.
 */
let firstHole: (() => void) | undefined;

/**
 * Set up the common parts of a hole/level of the game
 *
 * @param name     The hole's name
 * @param par      How many strokes a good player needs
 * @param tee      Where the ball starts
 * @param thisHole The builder for this hole, so that R can start it over
 * @param nextHole The builder for the next hole, or nothing for the last hole
 * @returns        The ball
 */
function startHole(name: string, par: number, tee: { x: number, y: number }, thisHole: () => void, nextHole?: () => void) {
  DebugToggle.enable();
  // A default color... individual holes can overwrite it if they want a
  // different color
  stage.backgroundColor = "#2f7a3a";

  // The rails around the edge of the course
  wall(0, 0, 16, 0.6, WALLS.wood);
  wall(0, 8.7, 16, 9, WALLS.wood);
  wall(0, 0.6, 0.3, 8.7, WALLS.wood);
  wall(15.7, 0.6, 16, 8.7, WALLS.wood);

  // Remember the hole's par, and how many strokes the player gets before they
  // have to pick up.  Other parts of the game read these two counters.
  stage.score.counters.set("par", par);
  stage.score.counters.set("maxStrokes", par + 3);

  // The ball and shooting
  const ball = makeBall(tee);
  setUpShooting(ball, tee);

  // Enable resetting the level, skipping to the next one, and turn on scoring
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(thisHole));
  firstHole ??= thisHole;
  const first = firstHole;
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_N, () => stage.switchTo(nextHole ?? first));
  setUpScoring(ball, name, nextHole, first);
  return ball;
}

// ANCHOR: ball
/**
 * Make the tee and the ball, at (tee.x, tee.y)
 *
 * @param tee The x/y coordinates of the center of the tee and center of the
 *            ball
 * @returns   The ball
 */
function makeBall(tee: { x: number, y: number }) {
  // Make the "tee" spot
  new Actor({
    appearance: new FilledBox({ width: 0.7, height: 0.7, fillColor: "#ffffff22", z: -1 }),
    rigidBody: new BoxBody({ cx: tee.x, cy: tee.y, width: 0.7, height: 0.7 }, { collisionsEnabled: false }),
  });
  // The ball has no bounce of its own, so the walls alone decide how bouncy a
  // collision is.  It's a dynamic body, because it moves and gets pushed around
  // and can slow down.  It also has some friction of its own, which will matter
  // on the side-view holes.
  const ball = new Actor({
    appearance: new FilledCircle({ radius: BALL_RADIUS, fillColor: "#ffffff", lineWidth: 0.03, lineColor: "#999999", z: 1 }),
    rigidBody: new CircleBody({ cx: tee.x, cy: tee.y, radius: BALL_RADIUS }, { dynamic: true, density: 3, elasticity: 0, friction: 0.8 }),
    behaviors: new PlayerControlBehavior(),
  });
  ball.rigidBody.setDamping(GRASS_DAMPING);
  ball.rigidBody.setAngularDamping(2);
  ball.rigidBody.body.SetBullet(true);
  return ball;
}
// ANCHOR_END: ball

/**
 * Let the player aim and putt the ball, and count the strokes in the "strokes"
 * counter.  Left and right turn the aim quickly, and up and down turn it
 * slowly, for fine aiming.  Holding Space charges the shot, and letting go
 * putts.
 *
 * @param ball The ball
 * @param tee  Where the ball starts, which also decides the starting aim
 */
function setUpShooting(ball: Actor, tee: { x: number, y: number }) {
  // `angle` is the direction the ball will go, in radians.  An angle of 0
  // points to the right.  Y grows downward on the screen, so positive angles
  // are clockwise.
  //
  // Since every hole is 16x9 in this game, we will hard-code the world center
  // at (8, 4.5) and initialize the shooter as pointing toward the world center.
  let angle = Math.atan2(4.5 - tee.y, 8 - tee.x);

  // `turn` tracks how fast the aim is rotating, in radians per second
  let turn = 0;

  // While the player holds Space, `charging` is true, `chargeStart` is the time
  // when they pressed it, and `power` is how hard the shot would be right now,
  // from 0 to 1.
  let charging = false, chargeStart = 0, power = 0;

  // The aim line is a thin white box.  The code at the bottom of this function
  // moves and turns it on every frame.  It doesn't collide with anything, and
  // it starts off the screen.
  const aim = new FilledBox({ width: 1, height: 0.07, fillColor: "#ffffff", z: 2 });
  const aimLine = new Actor({
    appearance: aim,
    rigidBody: new BoxBody({ cx: -5, cy: -5, width: 0.05, height: 0.05 }, { collisionsEnabled: false }),
  });

  // Left and right turn the aim quickly: 2.2 radians per second is about 126
  // degrees per second.  Up and down turn it slowly, which is good for fine
  // aiming: 0.35 radians per second is about 20 degrees.  A negative number
  // turns counter-clockwise, and letting go of the key stops the turning.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (turn = -2.2));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (turn = 2.2));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (turn = -0.35));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (turn = 0.35));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (turn = 0));

  // Pressing Space starts charging a shot.  That only works if the player isn't
  // already charging, the ball has stopped, and there are strokes left.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    if (charging || ball.state.current.moving || outOfStrokes()) return;
    charging = true;
    chargeStart = stage.renderer.now;
  });

  // ANCHOR: putt
  // Letting go of Space putts the ball.  A velocity is two numbers: how fast to
  // go to the right, and how fast to go down.  We know the direction (`angle`)
  // and the speed (`power`, from 0 to 1, times `MAX_POWER`), so it's just a
  // little trig to get the x and y velocities.
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_SPACE, () => {
    if (!charging) return;
    charging = false;
    stage.score.counters.add("strokes", 1);
    ball.rigidBody.setVelocity(Math.cos(angle) * power * MAX_POWER, Math.sin(angle) * power * MAX_POWER);
  });
  // ANCHOR_END: putt

  // JetLag runs this code on every frame.  It gives us `dt`, which is how many
  // seconds have passed since the last frame.  Using it makes the aim turn at
  // the same speed on a fast computer and a slow one.
  stage.world.repeatEvents.push((dt: number) => {
    // Change angle based on speed and elapsed time
    angle += turn * dt;

    if (charging) {
      // The power bar swings up and down while Space is held.  `t` counts up by
      // 1 every 0.9 seconds. Taking the remainder means it starts over after 2
      // seconds. Once `t` exceeds `, we don't treat it as a "growth from 0" but
      // as a "shrink from 2", which gives the nice grow-and-shrink behavior.
      const t = ((stage.renderer.now - chargeStart) / 900) % 2;
      // Add in .08 so there's never a zero-speed hit
      power = 0.08 + 0.92 * (t < 1 ? t : 2 - t);
    } else {
      power = 0;
    }

    // `Length()` is the absolute value of the magnitude of the ball's speed. If
    // the ball is moving very slowly, we'll slow it down *even more*, so that
    // it comes to a stop without limping along for a long time.
    const v = ball.rigidBody.getVelocity();
    if (v.Length() < 0.8) {
      const keep = Math.pow(SLOW_BALL_KEEP, dt);
      ball.rigidBody.setVelocity(v.x * keep, v.y * keep);
    }

    // Compute the length of the aim line
    const len = 0.6 + 2.8 * power;
    aim.width = len;

    // Hide the line if the ball is moving.  Otherwise color it based on its
    // magnitude.
    aim.fillColor = ball.state.current.moving || outOfStrokes() ? "#00000000" : charging ? mixColor("#ffffff", "#ff3b3b", power) : "#ffffffaa";

    // Putting the aim line in place is tricky, because we need to position its
    // center somewhere slightly distant from the ball, then rotate it so it
    // looks like it's connected to the ball.
    const c = ball.rigidBody.getCenter();
    const r = ball.rigidBody.radius;
    aimLine.rigidBody.setCenter(c.x + Math.cos(angle) * (r + len / 2), c.y + Math.sin(angle) * (r + len / 2));
    aimLine.rigidBody.rotation = angle;
  });
}

/**
 * Set up the HUD, the win and lose conditions, and the end-of-hole screens
 *
 * @param ball     The ball, so that we can tell when it stops moving
 * @param name     The name of the hole, to show in the HUD
 * @param nextHole The builder for the next hole, or nothing for the last hole
 * @param firstHole The builder for the first hole, where the game starts over
 *                 after the last hole
 */
function setUpScoring(ball: Actor, name: string, nextHole: (() => void) | undefined, firstHole: () => void) {
  const par = stage.score.counters.get("par");

  // Set up a lose condition when the ball stops and we're out of strokes
  ball.state.registerObserver({
    onStateChange: (_actor, event) => {
      if (event == StateEvent.STOP && outOfStrokes()) stage.score.loseLevel();
    },
  });
  // Put some text on the HUD
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 22, color: "#ffffff" },
      () => `${name}     Par ${par}     Stroke ${stage.score.counters.get("strokes") + (ball.state.current.moving ? 0 : 1)}`),
    rigidBody: new BoxBody({ cx: 0.3, cy: 0.12, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  // Set up ending screens (overlays) for when the hole is completed
  // successfully or unsuccessfully
  stage.score.winSceneBuilder = (overlay: Scene) => {
    const strokes = stage.score.counters.get("strokes");
    endScreen(overlay, {
      title: scoreName(strokes, par),
      detail: `${strokes} stroke${strokes == 1 ? "" : "s"} on a par ${par}`,
      prompt: `Click or press Enter: ${nextHole ? "Next hole" : "Play again"}`,
      next: () => stage.switchTo(nextHole ?? firstHole),
      ...END_STYLE,
    });
  };
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    endScreen(overlay, {
      title: "Picked up!",
      detail: `Out of strokes on a par ${par}`,
      prompt: `Click or press Enter: ${nextHole ? "Next hole" : "Play again"}`,
      next: () => stage.switchTo(nextHole ?? firstHole),
      ...END_STYLE,
    });
  };
}

/**
 * Has the player used up all of the strokes that this hole allows?
 *
 * @returns True if the "strokes" counter has reached the "maxStrokes" counter
 */
function outOfStrokes() {
  return stage.score.counters.get("strokes") >= stage.score.counters.get("maxStrokes");
}

// ANCHOR: wall
/**
 * A solid wall, as a [left, top, right, bottom] rectangle
 *
 * @param l    The x coordinate of the left side
 * @param t    The y coordinate of the top
 * @param r    The x coordinate of the right side
 * @param b    The y coordinate of the bottom
 * @param kind The kind of wall (color and elasticity)
 */
function wall(l: number, t: number, r: number, b: number, kind: WallKind) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: kind.fill, lineWidth: 0.04, lineColor: kind.line }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }, { elasticity: kind.elasticity }),
    behaviors: new SolidBehavior(),
  });
}
// ANCHOR_END: wall

// ANCHOR: cup
/**
 * The cup, which rejects any ball that's moving too fast
 *
 * @param cx The x coordinate of the center of the cup
 * @param cy The y coordinate of the center of the cup
 */
function cup(cx: number, cy: number) {
  new Actor({
    appearance: [
      new FilledCircle({ radius: 0.28, fillColor: "#111111", lineWidth: 0.04, lineColor: "#dddddd" }),
      new FilledBox({ width: 0.05, height: 1.0, fillColor: "#eeeeee", offset: { dx: 0.02, dy: -0.5 }, z: 2 }),
      new FilledPolygon({ vertices: [{ x: 0, y: -0.22 }, { x: 0.45, y: -0.08 }, { x: 0, y: 0.06 }], fillColor: "#e53935", offset: { dx: 0.04, dy: -0.82 }, z: 2 }),
    ],
    rigidBody: new CircleBody({ cx, cy, radius: 0.28 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({
      onArrival: (ball: Actor) => {
        if (ball.rigidBody.getVelocity().Length() > CUP_MAX_SPEED) {
          floatingText(cx, cy - 0.6, "Too fast!");
          return false;
        }
        stage.score.winLevel();
        return true;
      },
    }),
  });
}
// ANCHOR_END: cup

/**
 * Show a short message in the world that disappears after about a second
 *
 * @param cx      The x coordinate of the center of the message
 * @param cy      The y coordinate of the center of the message
 * @param message The message to show
 */
function floatingText(cx: number, cy: number, message: string) {
  const t = new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 20, color: "#ffffff", strokeColor: "#000000", strokeWidth: 3, z: 2 }, message),
    rigidBody: new BoxBody({ cx, cy, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(0.9, false, () => t.remove()));
}

/**
 * The golf name for a score on a hole
 *
 * @param strokes How many strokes the player took
 * @param par     The par for the hole
 * @returns       A name like "Birdie!", or "Par", or "5 over par"
 */
function scoreName(strokes: number, par: number) {
  if (strokes == 1) return "Hole in one!";
  const names: { [k: number]: string } = { [-3]: "Albatross!", [-2]: "Eagle!", [-1]: "Birdie!", 0: "Par", 1: "Bogey", 2: "Double bogey", 3: "Triple bogey" };
  return names[strokes - par] ?? `${strokes - par} over par`;
}

/**
 * Blend two hex color codes
 *
 * @param a   The first color to blend
 * @param b   The second color to blend
 * @param pct The percentage of the second (from 0 to 1)
 * @returns   A blended hex color code
 */
function mixColor(a: string, b: string, pct: number) {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - pct) + parseInt(b.slice(i, i + 2), 16) * pct);
    out += v.toString(16).padStart(2, "0");
  }
  return out;
}

// Everything that the games in this chapter get to use
export { WallKind, WALLS, CUP_MAX_SPEED, MAX_POWER, BALL_RADIUS, SLOW_BALL_KEEP, GRASS_DAMPING, END_STYLE, startHole, makeBall, setUpShooting, setUpScoring, outOfStrokes, wall, cup, floatingText, scoreName, mixColor };
