import { Actor, BoxBody, CircleBody, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, Path, PathMovement, PolygonBody, SolidBehavior, stage, TouchPlateBehavior } from "../jetlag";
import { WallKind, WALLS, BALL_RADIUS, startHole, wall, cup } from "./helpers";

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
 * MILESTONE 7 for Crazy Golf: holes 1 through 7 are built, and the rest
 * are still empty.  The comments in each empty hole say what it needs.
 */

/**
 * The first hole shows static bodies.  The goal is to bank the ball off an
 * angled bumper into the cup.
 */
function hole1() {
  startHole("Hole 1: Dogleg", 2, { x: 1.8, y: 7.7 }, hole1, hole2);

  wall(4, 0.6, 11.5, 5.2, WALLS.wood);
  polygonWall([{ x: 13.7, y: 8.7 }, { x: 15.7, y: 8.7 }, { x: 15.7, y: 6.7 }], WALLS.wood);
  post(12.6, 4.2, 0.35, WALLS.wood);
  cup(14.6, 2.0);
}

/**
 * The second hole introduces kinematic bodies.  There is a windmill and a
 * sliding gate that don't budge in response to collisions with the ball, but
 * which do cause the ball to change its behavior.
 */
function hole2() {
  startHole("Hole 2: The Windmill", 3, { x: 1.8, y: 4.6 }, hole2, hole3);

  wall(7, 0.6, 9, 3.7, WALLS.wood);
  wall(7, 5.5, 9, 8.7, WALLS.wood);
  // The windmill: two crossed blades, spinning around their center points
  const bladeAngles = [0, Math.PI / 2];
  for (const angle of bladeAngles) {
    const blade = new Actor({
      appearance: new FilledBox({ width: 5, height: 0.24, fillColor: "#f2efe6", lineWidth: 0.04, lineColor: "#8a857a", z: 1 }),
      rigidBody: new BoxBody({ cx: 5.7, cy: 3.0, width: 5, height: 0.24 }, { kinematic: true, rotationSpeed: 0.16 }),
      behaviors: new SolidBehavior(),
    });
    blade.rigidBody.rotation = angle;
  }
  // A circle at the center of the windmill blades
  new Actor({
    appearance: new FilledCircle({ radius: 0.3, fillColor: "#b5462f", lineWidth: 0.05, lineColor: "#6e2a1c", z: 1 }),
    rigidBody: new CircleBody({ cx: 5.7, cy: 3.0, radius: 0.3 }, { collisionsEnabled: false }),
  });
  // The sliding gate
  new Actor({
    appearance: new FilledBox({ width: 0.35, height: 2.4, fillColor: "#7b8b99", lineWidth: 0.04, lineColor: "#4a5560" }),
    rigidBody: new BoxBody({ cx: 11.5, cy: 2.0, width: 0.35, height: 2.4 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(11.5, 2.0).to(11.5, 7.3).to(11.5, 2.0), velocity: 3, loop: true }),
    behaviors: new SolidBehavior(),
  });
  cup(14.3, 4.6);
}

/**
 * The third hole introduces dynamic bodies.  Light crates get knocked aside,
 * heavy ones don't.
 */
function hole3() {
  startHole("Hole 3: Crate Alley", 3, { x: 1.5, y: 6.8 }, hole3, hole4);

  wall(0.3, 4.4, 12, 4.9, WALLS.wood);
  // The last argument says whether a crate is heavy: `false` for the light
  // crates, which fly when they're hit, and `true` for the heavy ones, which
  // barely budge
  crate(6.0, 5.5, 1.1, 1.1, false);
  crate(6.0, 6.7, 1.1, 1.1, false);
  crate(6.0, 7.9, 1.1, 1.1, false);
  crate(9.5, 5.6, 1.2, 1.2, true);
  crate(9.5, 8.0, 1.2, 1.2, true);
  crate(7.0, 3.1, 1.2, 1.2, true);
  crate(7.0, 1.3, 1.0, 1.0, false);
  cup(3.8, 2.5);
}

/**
 * The fourth hole shows elasticity.  "Rubber" walls are very bouncy.  The
 * "sand" walls have no bounce to them.
 */
function hole4() {
  startHole("Hole 4: Rubber Room", 2, { x: 2.5, y: 7.2 }, hole4, hole5);

  wall(7.5, 2.8, 8.5, 8.7, WALLS.wood);
  wall(3, 0.6, 13, 1.0, WALLS.rubber);
  wall(15.3, 0.6, 15.7, 8.7, WALLS.rubber);
  wall(0.3, 0.6, 2.4, 2.4, WALLS.sand);
  wall(12.3, 8.2, 14.9, 8.7, WALLS.rubber);
  post(11.0, 4.5, 0.4, WALLS.rubber);
  post(4.8, 4.2, 0.4, WALLS.sand);
  cup(13.5, 7.0);
}

/**
 * The fifth hole shows damping.  The ice doesn't have much, so the ball doesn't
 * really slow down when going over it. The carpet, on the other hand, does slow
 * you down.
 */
function hole5() {
  const ball = startHole("Hole 5: Ice Rink", 3, { x: 1.8, y: 4.6 }, hole5, hole6);

  stage.backgroundColor = "#cfeaf2";
  // How much drag the ice and the carpet give the ball
  const ICE_DAMPING = 0.12;
  const CARPET_DAMPING = 4;

  // The ball starts out on the ice.  The carpets are touch plates: touching
  // one gives the ball carpet drag, and when the ball stops touching it, the
  // ball goes back to ice drag.
  ball.rigidBody.setDamping(ICE_DAMPING);
  const carpets = [
    { l: 6.2, t: 3.0, r: 9.4, b: 6.2 },
    { l: 0.3, t: 0.6, r: 3.5, b: 2.2 },
    { l: 11.8, t: 7.2, r: 15.7, b: 8.7 },
  ];
  for (const c of carpets) {
    new Actor({
      appearance: new FilledBox({ width: c.r - c.l, height: c.b - c.t, fillColor: "#7b2d3b", lineWidth: 0.05, lineColor: "#5a1f2b", z: -1 }),
      rigidBody: new BoxBody({ cx: (c.l + c.r) / 2, cy: (c.t + c.b) / 2, width: c.r - c.l, height: c.b - c.t }),
      behaviors: new TouchPlateBehavior({
        onEnter: () => ball.rigidBody.setDamping(CARPET_DAMPING),
        onLeave: () => ball.rigidBody.setDamping(ICE_DAMPING),
      }),
    });
  }
  post(11.5, 2.5, 0.4, WALLS.wood);
  post(11.5, 6.7, 0.4, WALLS.wood);
  wall(14.6, 3.2, 15.0, 6.0, WALLS.sand);
  wall(13.4, 3.2, 14.6, 3.6, WALLS.sand);
  wall(13.4, 5.6, 14.6, 6.0, WALLS.sand);
  cup(13.9, 4.6);
}

/**
 * The sixth hole shows resizing.  We use mushrooms to shrink and expand the
 * ball.
 */
function hole6() {
  const ball = startHole("Hole 6: Mushroom Garden", 5, { x: 1.8, y: 4.6 }, hole6, hole7);

  wall(6.8, 0.6, 7.3, 4.42, WALLS.wood);
  wall(6.8, 4.78, 7.3, 8.7, WALLS.wood);
  // A funnel that guides a small-enough ball into the slit
  polygonWall([{ x: 5.4, y: 3.2 }, { x: 6.8, y: 3.2 }, { x: 6.8, y: 4.42 }], WALLS.wood);
  polygonWall([{ x: 5.4, y: 6.0 }, { x: 6.8, y: 4.78 }, { x: 6.8, y: 6.0 }], WALLS.wood);
  // The cup's alcove, with a heavy crate plugging its doorway
  wall(12.2, 0.6, 12.6, 3.6, WALLS.wood);
  wall(12.6, 3.2, 13.2, 3.6, WALLS.wood);
  wall(14.6, 3.2, 15.7, 3.6, WALLS.wood);
  crate(13.9, 3.4, 1.3, 1.0, true, 3);
  mushroom(3.9, 4.6, 0.4, "#3f7fd6", ball);
  mushroom(10.0, 6.8, 2.4, "#d63a3a", ball);
  post(10.2, 2.4, 0.35, WALLS.wood);
  cup(14.9, 1.7);
}

/**
 * The seventh hole shows gravity and friction.  A key point here is that only
 * dynamic bodies fall due to gravity. Friction slows the ball.
 */
function hole7() {
  const ball = startHole("Hole 7: Downhill", 2, { x: 1.8, y: 3.75 }, hole7, hole8);

  sideView(ball);
  // The shelf the ball starts on, and a ramp down to the floor
  wall(0.3, 4.0, 3.4, 4.5, WALLS.sand);
  polygonWall([{ x: 3.4, y: 4.0 }, { x: 3.4, y: 8.4 }, { x: 9.0, y: 8.4 }], WALLS.sand);
  // A slippery floor, with a stretch of grippy carpet in the middle
  floorStrip(9.0, 10.8, FLOORS.ice);
  floorStrip(10.8, 12.8, FLOORS.carpet);
  floorStrip(12.8, 15.7, FLOORS.ice);
  // A sandbag backstop behind the cup: a ball that's too fast to drop in
  // stops dead against it
  wall(14.7, 6.6, 15.7, 8.4, WALLS.sand);
  cup(13.9, 8.2);
}

/**
 * The eighth hole shows that we can make dynamic bodies defy gravity and float.
 */
function hole8() {
  startHole("Hole 8: Rafts", 3, { x: 1.8, y: 8.2 }, hole8);

  // TODO (Hole 8): Rafts (par 3).  This hole is also a side view.
  // - `startHole` returns the ball, so keep it: `const ball = startHole(...)`.
  // - Use `sideView`, and a grass floor strip across the whole hole.
  // - Three rafts at x = 8.6, at y = 5.4, 6.6, and 7.8.  Each is a light (density 0.3)
  //   0.4 x 1.2 dynamic box, with a damping of 1.5, that floats in the air (it ignores
  //   gravity), and doesn't tip over when it's hit.
  // - The cup at (14.2, 8.2).
}

/**
 * A solid wall with any (convex) shape, given in world coordinates
 *
 * It's easiest to describe a polygon by saying where its corners are on the
 * screen.  But JetLag wants a polygon in two parts: a center point (`cx`, `cy`)
 * that says where the polygon is, and a list of vertices that say where each
 * corner is *relative to that center*.  So this function's job is to convert
 * from the first description to the second.
 *
 * @param points The corners of the polygon, in world coordinates
 * @param kind   The kind of wall (color and elasticity)
 */
function polygonWall(points: { x: number, y: number }[], kind: WallKind) {
  // For the center, we use the average of the corners: add up all of the x
  // values and divide by how many corners there are, and then do the same for
  // y.  The average is always inside a convex polygon, so it's a fine place for
  // the body's center.
  const cx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const cy = points.reduce((a, p) => a + p.y, 0) / points.length;
  // Each vertex is its corner's position, minus the center's position.  The
  // body is placed at (cx, cy), and JetLag adds the center back in, so each
  // corner ends up exactly where we asked for it on the screen.
  const vertices = points.map(p => ({ x: p.x - cx, y: p.y - cy }));
  new Actor({
    appearance: new FilledPolygon({ vertices, fillColor: kind.fill, lineWidth: 0.04, lineColor: kind.line }),
    rigidBody: new PolygonBody({ cx, cy, vertices }, { elasticity: kind.elasticity }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * A round post
 *
 * @param cx     The x coordinate of the center of the post
 * @param cy     The y coordinate of the center of the post
 * @param radius The radius of the post
 * @param kind   The kind of wall (color and elasticity)
 */
function post(cx: number, cy: number, radius: number, kind: WallKind) {
  new Actor({
    appearance: new FilledCircle({ radius, fillColor: kind.fill, lineWidth: 0.04, lineColor: kind.line }),
    rigidBody: new CircleBody({ cx, cy, radius }, { elasticity: kind.elasticity }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * A dynamic crate.  Light crates fly; heavy ones barely budge.
 *
 * @param cx      The x coordinate of the center of the crate
 * @param cy      The y coordinate of the center of the crate
 * @param width   The width of the crate
 * @param height  The height of the crate
 * @param heavy   True for a heavy crate, and false for a light one
 * @param density How dense the crate is.  By default, heavy crates are much
 *                denser than light ones.
 */
function crate(cx: number, cy: number, width: number, height: number, heavy: boolean, density = heavy ? 1.5 : 0.15) {
  const crate = new Actor({
    appearance: [
      new FilledBox({ width, height, fillColor: heavy ? "#5b6470" : "#d9a45b", lineWidth: 0.06, lineColor: heavy ? "#2e333a" : "#8a6130" }),
      new FilledBox({ width: width * 0.9, height: 0.06, fillColor: heavy ? "#2e333a" : "#8a6130" }),
    ],
    rigidBody: new BoxBody({ cx, cy, width, height }, { dynamic: true, density, elasticity: 0.2 }),
    behaviors: new SolidBehavior(),
  });
  crate.rigidBody.setDamping(heavy ? 6 : 2);
  crate.rigidBody.setAngularDamping(heavy ? 6 : 2);
}

/**
 * A mushroom pad that sets the ball's size to `scale` times its normal size
 *
 * @param cx    The x coordinate of the center of the mushroom
 * @param cy    The y coordinate of the center of the mushroom
 * @param scale The ball's size after touching the mushroom, as a multiple of
 *              its normal size
 * @param color The HTML hex color of the mushroom's cap
 * @param ball  The ball, which is the thing that gets resized
 */
function mushroom(cx: number, cy: number, scale: number, color: string, ball: Actor) {
  new Actor({
    appearance: [
      new FilledCircle({ radius: 0.55, fillColor: color, lineWidth: 0.05, lineColor: "#ffffff" }),
      new FilledCircle({ radius: 0.12, fillColor: "#ffffff", offset: { dx: -0.2, dy: -0.15 } }),
      new FilledCircle({ radius: 0.09, fillColor: "#ffffff", offset: { dx: 0.22, dy: 0.1 } }),
    ],
    rigidBody: new CircleBody({ cx, cy, radius: 0.55 }),
    // `resize` multiplies the ball's current size, so ask how big the ball is
    // right now, and resize by whatever factor gets it to the size we want
    behaviors: new TouchPlateBehavior({
      onEnter: () => ball.resize(scale * BALL_RADIUS / ball.rigidBody.radius),
    }),
  });
}

/**
 * Turn a hole into a side view: gravity pulls down, and the air is blue
 *
 * @param ball The ball, which gets less damping so it doesn't feel like it's
 *             moving through syrup
 */
function sideView(ball: Actor) {
  stage.world.gravity = { x: 0, y: 10 };
  stage.backgroundColor = "#9fd3ea";
  ball.rigidBody.setDamping(0.05);
}

/** FloorKind captures the details of the different surfaces a floor can have */
interface FloorKind {
  /** The HTML hex color for the floor */
  fill: string;
  /** The HTML hex color for the floor outline */
  line: string;
  /** How much the floor grips the ball */
  friction: number;
}
/** The three kinds of floor */
const FLOORS = {
  ice: { fill: "#bfe6f2", line: "#8fc4d6", friction: 0 },
  carpet: { fill: "#7b2d3b", line: "#5a1f2b", friction: 1 },
  grass: { fill: "#3f9a4a", line: "#2f7a3a", friction: 0.3 },
};

/**
 * A strip of floor, from x = `l` to x = `r`.  Grippy surfaces have friction.
 *
 * @param l    The x coordinate of the left end of the strip
 * @param r    The x coordinate of the right end of the strip
 * @param kind The kind of floor (color and friction)
 */
function floorStrip(l: number, r: number, kind: FloorKind) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: 0.3, fillColor: kind.fill, lineWidth: 0.04, lineColor: kind.line }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: 8.55, width: r - l, height: 0.3 }, { elasticity: 0, friction: kind.friction }),
    behaviors: new SolidBehavior(),
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), hole1);
