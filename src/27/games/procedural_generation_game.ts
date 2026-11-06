import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, GoalBehavior, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, TextSprite, initializeAndLaunch, stage } from "jetlag2d";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

// The cave is a grid of cells, each CELL meters wide/tall, sized so the grid
// exactly fills the 16x9 world.
const COLS = 32;
const ROWS = 18;
const CELL = 0.5;

const FILL_PROB = 0.45; // fraction of cells that start as a wall
const SMOOTH_ITERATIONS = 4; // how many cellular-automata passes to run
const MIN_FLOOR_CELLS = 20; // regenerate if the reachable area is too small

/**
 * Count how many of a cell's 8 neighbors are walls. Off-grid neighbors count
 * as walls too, so caves never leak past the edge of the world.
 */
function wallNeighbors(grid: boolean[][], x: number, y: number): number {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      let nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || grid[nx][ny]) count++;
    }
  }
  return count;
}

/**
 * One step of cellular-automata smoothing: a cell becomes a wall if 5 or
 * more of its neighbors are walls, and floor otherwise. Run repeatedly, this
 * turns uniform random noise into organic-looking cave blobs.
 */
function smooth(grid: boolean[][]): boolean[][] {
  let next: boolean[][] = [];
  for (let x = 0; x < COLS; x++) {
    next[x] = [];
    for (let y = 0; y < ROWS; y++) next[x][y] = wallNeighbors(grid, x, y) >= 5;
  }
  return next;
}

/** Flood-fill every floor cell reachable from (startX, startY). */
function floodFill(
  grid: boolean[][],
  startX: number,
  startY: number,
): { x: number; y: number }[] {
  let seen = new Set<string>();
  let region: { x: number; y: number }[] = [];
  let stack = [{ x: startX, y: startY }];
  for (let top = stack.pop(); top; top = stack.pop()) {
    let { x, y } = top;
    let key = x + "," + y;
    if (seen.has(key)) continue;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[x][y]) continue;
    seen.add(key);
    region.push({ x, y });
    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }
  return region;
}

/**
 * Generate a cave: fill the grid with random noise, smooth it into blobs,
 * then throw away every region except the largest one. That last step is
 * what guarantees the hero can always reach the destination -- without it,
 * a cave could easily generate two unconnected pockets of open floor.
 */
function generateCave(): {
  grid: boolean[][];
  floor: { x: number; y: number }[];
} {
  let grid: boolean[][] = [];
  for (let x = 0; x < COLS; x++) {
    grid[x] = [];
    for (let y = 0; y < ROWS; y++) grid[x][y] = stage.random.next() < FILL_PROB;
  }
  for (let i = 0; i < SMOOTH_ITERATIONS; i++) grid = smooth(grid);

  let visited = new Set<string>();
  let regions: { x: number; y: number }[][] = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (grid[x][y] || visited.has(x + "," + y)) continue;
      let region = floodFill(grid, x, y);
      for (let c of region) visited.add(c.x + "," + c.y);
      regions.push(region);
    }
  }
  regions.sort((a, b) => b.length - a.length);
  let largest = regions[0] ?? [];
  let keep = new Set(largest.map((c) => c.x + "," + c.y));
  for (let x = 0; x < COLS; x++)
    for (let y = 0; y < ROWS; y++)
      if (!grid[x][y] && !keep.has(x + "," + y)) grid[x][y] = true;

  return { grid, floor: largest };
}

function builder() {
  DebugToggle.enable();
  stage.score.onWin = builder;

  // Small caves feel cramped and can put the hero right next to the
  // destination, so keep re-rolling until the reachable area is big enough.
  let cave = generateCave();
  while (cave.floor.length < MIN_FLOOR_CELLS) cave = generateCave();
  let { grid, floor } = cave;

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!grid[x][y]) continue;
      new Actor({
        appearance: new FilledBox({
          width: CELL,
          height: CELL,
          fillColor: "#663311",
        }),
        rigidBody: new BoxBody({
          cx: (x + 0.5) * CELL,
          cy: (y + 0.5) * CELL,
          width: CELL,
          height: CELL,
        }),
        behaviors: new SolidBehavior(),
      });
    }
  }

  // Approximate farthest-pair search: pick a random floor cell, then sample
  // a handful more and keep whichever is farthest away. Not exhaustive, but
  // enough to stop the destination from spawning right next to the hero.
  let start = floor[Math.floor(stage.random.next() * floor.length)];
  let goal = start,
    bestDist = -1;
  for (let i = 0; i < 20; i++) {
    let candidate = floor[Math.floor(stage.random.next() * floor.length)];
    let dist =
      Math.abs(candidate.x - start.x) + Math.abs(candidate.y - start.y);
    if (dist > bestDist) {
      bestDist = dist;
      goal = candidate;
    }
  }

  let hero = new Actor({
    appearance: new FilledCircle({ radius: CELL * 0.4, fillColor: "#3399ff" }),
    rigidBody: new CircleBody({
      cx: (start.x + 0.5) * CELL,
      cy: (start.y + 0.5) * CELL,
      radius: CELL * 0.4,
    }),
    behaviors: new PlayerControlBehavior(),
  });
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_RIGHT,
    () => (hero.rigidBody.xVelocity = 5),
  );
  stage.keyboard.setKeyUpHandler(
    KeyCodes.KEY_RIGHT,
    () => (hero.rigidBody.xVelocity = 0),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_LEFT,
    () => (hero.rigidBody.xVelocity = -5),
  );
  stage.keyboard.setKeyUpHandler(
    KeyCodes.KEY_LEFT,
    () => (hero.rigidBody.xVelocity = 0),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_UP,
    () => (hero.rigidBody.yVelocity = -5),
  );
  stage.keyboard.setKeyUpHandler(
    KeyCodes.KEY_UP,
    () => (hero.rigidBody.yVelocity = 0),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_DOWN,
    () => (hero.rigidBody.yVelocity = 5),
  );
  stage.keyboard.setKeyUpHandler(
    KeyCodes.KEY_DOWN,
    () => (hero.rigidBody.yVelocity = 0),
  );

  new Actor({
    appearance: new FilledCircle({ radius: CELL * 0.4, fillColor: "#33cc33" }),
    rigidBody: new CircleBody({
      cx: (goal.x + 0.5) * CELL,
      cy: (goal.y + 0.5) * CELL,
      radius: CELL * 0.4,
    }),
    behaviors: new GoalBehavior({ onArrival: "arrivals" }),
  });
  stage.score.addWinCondition(() => stage.score.counters.get("arrivals") >= 1);

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 18, color: "#000000" },
      "Arrows to move. Reach the green goal.",
    ),
    rigidBody: new BoxBody(
      { cx: 0.2, cy: 0.2, width: 8, height: 0.5 },
      { scene: stage.hud },
    ),
  });

  // A new cave, generated from scratch, any time the player wants one.
  new Actor({
    appearance: [
      new FilledBox({
        width: 2,
        height: 0.5,
        fillColor: "#000000",
        lineWidth: 0.02,
        lineColor: "#ffffff",
      }),
      new TextSprite(
        { center: true, face: "Arimo Regular", size: 14, color: "#ffffff" },
        "New Cave",
      ),
    ],
    rigidBody: new BoxBody(
      { cx: 1.1, cy: 8.6, width: 2, height: 0.5 },
      { scene: stage.hud },
    ),
    gestures: {
      onTap: () => {
        stage.switchTo(builder);
        return true;
      },
    },
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
