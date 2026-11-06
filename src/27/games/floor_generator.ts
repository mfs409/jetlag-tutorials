import { stage } from "jetlag2d";

/**
 * A generator for the Alchemist's Tower.  It makes a floor as a map: the same
 * text format that the hand-made floors use, with the same legend.
 *
 * The goal is a floor that can always be finished, which a random floor
 * doesn't give you for free.  This file does it in two different ways:
 * build the answer first, and then check the result.
 */

// ANCHOR: size
/** How big a floor is, in cells.  This matches the hand-made floors. */
const COLS = 16, ROWS = 9;
// ANCHOR_END: size

// ANCHOR: walkable
/** The characters that a wizard can walk onto.  (`<` and `>` are stairs, `P` is a pit, and `#` is a wall.) */
const WALKABLE = ".@hmfcb";
/** The characters that are things to pick up */
const ITEMS = "hmfc";
// ANCHOR_END: walkable

// ANCHOR: check_fn
/**
 * Where the wizard stands after taking some stairs: on the first floor tile
 * next to them, and never on the stairs themselves, or they'd go right back.
 * The game uses this to place the wizard, and the generator uses it to check
 * the floor, so the two can never disagree about where a floor begins.
 *
 * @param map   The floor
 * @param stair `<` for the stairs down, or `>` for the stairs up
 * @returns     The wizard's row and column, or nothing if there are no such stairs
 */
export function arrivalCell(map: string[], stair: string): [number, number] | undefined {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (map[r][c] != stair) continue;
    const steps = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: -1, dc: 0 }];
    for (const step of steps) if (map[r + step.dr]?.[c + step.dc] == ".") return [r + step.dr, c + step.dc];
  }
  return undefined;
}

/**
 * Find every cell that the wizard can reach by walking, starting from the
 * place that they begin.  This is a flood fill: start somewhere, visit every
 * neighbor that you can walk to, and keep going.  Stairs aren't walkable,
 * because stepping on them takes you to another floor, so they can cut a
 * floor in two.  That's why the start has to be the exact cell that the game
 * will use.
 *
 * @param map The floor
 * @returns   The cells that can be reached, as "row,col" strings
 */
function reachable(map: string[]) {
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  // The way in is the `@` of the first floor, or the arrival cell of the `<` of the others
  const start = arrivalCell(map, "<");
  if (start) { queue.push(start); seen.add(`${start[0]},${start[1]}`); }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (map[r][c] == "@") { queue.push([r, c]); seen.add(`${r},${c}`); }
  }
  for (let next = queue.shift(); next; next = queue.shift()) {
    const [r, c] = next;
    const steps = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: -1, dc: 0 }];
    for (const step of steps) {
      const [rr, cc] = [r + step.dr, c + step.dc];
      if (WALKABLE.includes(map[rr]?.[cc] ?? "#") && !seen.has(`${rr},${cc}`)) { seen.add(`${rr},${cc}`); queue.push([rr, cc]); }
    }
  }
  return seen;
}

/**
 * Can this floor be finished?  Everything that can be picked up has to be
 * reachable, and so does the place where the wizard will stand when they
 * come back down the stairs from the floor above.
 *
 * @param map The floor
 */
export function isWinnable(map: string[]) {
  const seen = reachable(map);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (ITEMS.includes(map[r][c]) && !seen.has(`${r},${c}`)) return false;
  }
  // The stairs up have to be usable, and a wizard who comes back down them has to land somewhere that is part of this floor
  const up = arrivalCell(map, ">");
  return up !== undefined && seen.has(`${up[0]},${up[1]}`);
}
// ANCHOR_END: check_fn

// ANCHOR: fallback
/** A floor that is always fine, for the day that nothing else works */
const FALLBACK = [
  "################",
  "#@.....h.......#",
  "#..............#",
  "#.......f......#",
  "#..............#",
  "#.....m........#",
  "#..............#",
  "#.............>#",
  "################",
];
// ANCHOR_END: fallback

/** One room, as the cells that it covers */
interface Room { l: number; t: number; r: number; b: number }

// ANCHOR: generate_fn
/**
 * Make a floor.  The same floor number and seed always give the same floor.
 *
 * @param n    Which floor of the tower this is, starting at 1
 * @param seed A number that picks which tower this is
 * @returns    The floor's map, and how many tries it took
 */
export function generateFloor(n: number, seed: number): { map: string[], tries: number } {
  for (let attempt = 1; attempt <= 20; attempt++) {
    // Every attempt starts from its own seed, so that trying again gives something different
    stage.random.reseed(seed + n * 7919 + attempt * 104729);
    const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "#"));

    // ANCHOR: rooms
    // Step 1: scatter some rooms, which can't touch each other
    const rooms: Room[] = [];
    for (let tries = 0; tries < 40 && rooms.length < 5; tries++) {
      const w = 3 + stage.random.nextInt(4), h = 2 + stage.random.nextInt(3);
      const l = 1 + stage.random.nextInt(COLS - 2 - w), t = 1 + stage.random.nextInt(ROWS - 2 - h);
      const room = { l, t, r: l + w - 1, b: t + h - 1 };
      if (rooms.some(o => room.l <= o.r + 1 && room.r >= o.l - 1 && room.t <= o.b + 1 && room.b >= o.t - 1)) continue;
      rooms.push(room);
    }
    if (rooms.length < 3) continue;
    for (const o of rooms) for (let r = o.t; r <= o.b; r++) for (let c = o.l; c <= o.r; c++) grid[r][c] = ".";
    // ANCHOR_END: rooms

    // ANCHOR: corridors
    // Step 2: join each room to the next one, so that every room can be reached from the first
    for (let i = 0; i + 1 < rooms.length; i++) {
      const a = rooms[i], b = rooms[i + 1];
      let r = Math.floor((a.t + a.b) / 2), c = Math.floor((a.l + a.r) / 2);
      const tr = Math.floor((b.t + b.b) / 2), tc = Math.floor((b.l + b.r) / 2);
      const horizontalFirst = stage.random.nextBoolean(0.5);
      const walk = (horizontal: boolean) => { while (horizontal ? c != tc : r != tr) { if (horizontal) c += Math.sign(tc - c); else r += Math.sign(tr - r); grid[r][c] = "."; } };
      walk(horizontalFirst);
      walk(!horizontalFirst);
    }
    // ANCHOR_END: corridors

    // ANCHOR: stairs
    // Step 3: stairs in the first and last rooms, in a corner that isn't on a corridor's way
    const first = rooms[0], last = rooms[rooms.length - 1];
    if (n == 1) grid[first.t][first.l] = "@"; else grid[first.t][first.l] = "<";
    grid[last.b][last.r] = ">";
    // ANCHOR_END: stairs

    // ANCHOR: items
    // Step 4: some things to pick up, on floor cells
    const floorCells: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] == ".") floorCells.push([r, c]);
    for (let i = 0; i < 5 && floorCells.length > 0; i++) {
      const [r, c] = floorCells.splice(stage.random.nextInt(floorCells.length), 1)[0];
      grid[r][c] = ITEMS[stage.random.nextInt(ITEMS.length)];
    }
    // ANCHOR_END: items

    // ANCHOR: pits
    // Step 5: some pits, which are hazards.  Each is put down, and the floor is checked.
    // If the floor can't be finished any more, that pit is taken back out.
    for (let i = 0; i < 6 && floorCells.length > 0; i++) {
      const [r, c] = floorCells.splice(stage.random.nextInt(floorCells.length), 1)[0];
      grid[r][c] = "P";
      if (!isWinnable(grid.map(row => row.join("")))) grid[r][c] = ".";
    }
    // ANCHOR_END: pits

    const map = grid.map(row => row.join(""));
    // ANCHOR: final_check
    // Never trust the construction: check the finished floor, and try again if it isn't right
    if (isWinnable(map)) return { map, tries: attempt };
    // ANCHOR_END: final_check
  }
  // The fallback has no stairs down, so it's only fine for the first floor; swap in a `<` for the others
  return { map: n == 1 ? FALLBACK : FALLBACK.map((row, r) => (r == 1 ? row.replace("@", "<") : row)), tries: 21 };
}
// ANCHOR_END: generate_fn
