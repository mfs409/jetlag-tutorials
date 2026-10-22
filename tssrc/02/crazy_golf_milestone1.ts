import { Actor, CircleBody, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, PolygonBody, SolidBehavior } from "../jetlag";
import { WallKind, WALLS, startHole, wall, cup } from "./helpers";

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
 * MILESTONE 1 for Crazy Golf: holes 1 through 1 are built, and the rest
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

  // TODO (Hole 2): The Windmill (par 3).
  // - Walls from (7, 0.6) to (9, 3.7), and from (7, 5.5) to (9, 8.7).
  // - A windmill: two crossed kinematic blades, each 5 x 0.24, both centered at
  //   (5.7, 3.0).  Rotate one by PI / 2, and make both spin at 0.16 rotations per
  //   second.  Put a round hub (radius 0.3) on top that doesn't collide.
  // - A gate: a kinematic 0.35 x 2.4 box that slides between (11.5, 2.0) and
  //   (11.5, 7.3) at speed 3, forever.
  // - The cup at (14.3, 4.6).
}

/**
 * The third hole introduces dynamic bodies.  Light crates get knocked aside,
 * heavy ones don't.
 */
function hole3() {
  startHole("Hole 3: Crate Alley", 3, { x: 1.5, y: 6.8 }, hole3, hole4);

  // TODO (Hole 3): Crate Alley (par 3).
  // - A wall from (0.3, 4.4) to (12, 4.9).
  // - Write a `crate` helper: a dynamic box.  It takes a true/false `heavy` argument.
  //   Light crates have a density of 0.15, and heavy crates have a density of 1.5.
  // - Light 1.1 x 1.1 crates at (6.0, 5.5), (6.0, 6.7), and (6.0, 7.9), and a light
  //   1 x 1 crate at (7.0, 1.3).
  // - Heavy 1.2 x 1.2 crates at (9.5, 5.6), (9.5, 8.0), and (7.0, 3.1).
  // - The cup at (3.8, 2.5).
}

/**
 * The fourth hole shows elasticity.  "Rubber" walls are very bouncy.  The
 * "sand" walls have no bounce to them.
 */
function hole4() {
  startHole("Hole 4: Rubber Room", 2, { x: 2.5, y: 7.2 }, hole4, hole5);

  // TODO (Hole 4): Rubber Room (par 2).  `wall` and `post` take a kind: `WALLS.wood`, `WALLS.rubber`, or
  // `WALLS.sand`.
  // - A wood wall from (7.5, 2.8) to (8.5, 8.7).
  // - Rubber walls from (3, 0.6) to (13, 1.0), from (15.3, 0.6) to (15.7, 8.7), and from
  //   (12.3, 8.2) to (14.9, 8.7).
  // - A sandbag wall from (0.3, 0.6) to (2.4, 2.4).
  // - A rubber post at (11.0, 4.5) and a sandbag post at (4.8, 4.2), both with a
  //   radius of 0.4.
  // - The cup at (13.5, 7.0).
}

/**
 * The fifth hole shows damping.  The ice doesn't have much, so the ball doesn't
 * really slow down when going over it. The carpet, on the other hand, does slow
 * you down.
 */
function hole5() {
  startHole("Hole 5: Ice Rink", 3, { x: 1.8, y: 4.6 }, hole5, hole6);

  // TODO (Hole 5): Ice Rink (par 3).
  // - `startHole` returns the ball, so keep it: `const ball = startHole(...)`.
  // - A pale blue background (#cfeaf2).
  // - Two constants for the drag: `ICE_DAMPING` (0.12) and `CARPET_DAMPING` (4).  The ball
  //   starts out on ice.
  // - Three carpet rectangles, with left, top, right, and bottom edges of:
  //   { l: 6.2, t: 3.0, r: 9.4, b: 6.2 }, { l: 0.3, t: 0.6, r: 3.5, b: 2.2 }, and
  //   { l: 11.8, t: 7.2, r: 15.7, b: 8.7 }.  Make each one a touch plate: use `onEnter`
  //   to set the ball's damping to `CARPET_DAMPING` when the ball enters it, and `onLeave`
  //   to set it back to `ICE_DAMPING` when the ball leaves it.
  // - Wood posts at (11.5, 2.5) and (11.5, 6.7), both with a radius of 0.4.
  // - Sandbag walls from (14.6, 3.2) to (15.0, 6.0), from (13.4, 3.2) to (14.6, 3.6),
  //   and from (13.4, 5.6) to (14.6, 6.0).
  // - The cup at (13.9, 4.6).
}

/**
 * The sixth hole shows resizing.  We use mushrooms to shrink and expand the
 * ball.
 */
function hole6() {
  startHole("Hole 6: Mushroom Garden", 5, { x: 1.8, y: 4.6 }, hole6, hole7);

  // TODO (Hole 6): Mushroom Garden (par 5).
  // - `startHole` returns the ball, so keep it: `const ball = startHole(...)`.
  // - Wood walls from (6.8, 0.6) to (7.3, 4.42), and from (6.8, 4.78) to (7.3, 8.7),
  //   which leave a narrow slit.
  // - Two funnel triangles that guide the ball to the slit: (5.4, 3.2), (6.8, 3.2),
  //   (6.8, 4.42), and (5.4, 6.0), (6.8, 4.78), (6.8, 6.0).
  // - The cup's alcove: wood walls from (12.2, 0.6) to (12.6, 3.6), from (12.6, 3.2) to
  //   (13.2, 3.6), and from (14.6, 3.2) to (15.7, 3.6).
  // - A heavy 1.3 x 1.0 crate at (13.9, 3.4), with a density of 3, plugging the alcove.
  // - Write a `mushroom` helper: a pad that resizes the ball.  A blue one at (3.9, 4.6)
  //   shrinks the ball to 0.4 times its size, and a red one at (10.0, 6.8) grows it to
  //   2.4 times its size.
  // - A wood post at (10.2, 2.4), with a radius of 0.35.
  // - The cup at (14.9, 1.7).
}

/**
 * The seventh hole shows gravity and friction.  A key point here is that only
 * dynamic bodies fall due to gravity. Friction slows the ball.
 */
function hole7() {
  startHole("Hole 7: Downhill", 2, { x: 1.8, y: 3.75 }, hole7, hole8);

  // TODO (Hole 7): Downhill (par 2).  This hole is a side view.
  // - `startHole` returns the ball, so keep it: `const ball = startHole(...)`.
  // - Write a `sideView` helper: gravity of (0, 10), a sky-blue background (#9fd3ea),
  //   and very little damping on the ball (0.05).
  // - A sandbag shelf from (0.3, 4.0) to (3.4, 4.5), and a sandbag ramp with corners
  //   at (3.4, 4.0), (3.4, 8.4), and (9.0, 8.4).
  // - Write a `floorStrip` helper for the floor, with a `FloorKind` and a `FLOORS` table
  //   (ice, carpet, grass) like `WALLS`.  From x = 9.0 to 10.8, and from
  //   12.8 to 15.7, the floor is ice (friction 0).  From 10.8 to 12.8, it's grippy
  //   carpet (friction 1).
  // - A sandbag backstop from (14.7, 6.6) to (15.7, 8.4), behind the cup.
  // - The cup at (13.9, 8.2).
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

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), hole1);
