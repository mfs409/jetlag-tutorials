import { Actor, BoxBody, DebugToggle, FilledBox, FilledRoundedBox, getAppearance, JetLagGameConfig, TextSprite, TimedEvent, initializeAndLaunch, stage } from "jetlag2d";
import { currentLevel, switchToLevel } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  // Packing 80x45 meters onto the screen (instead of the usual 16x9) lets
  // each cell of the board be its own actor, without the world turning into
  // a postage stamp.  Fonts are measured in the same units as everything
  // else, so the text on the HUD has to be scaled up five times.
  aspectRatio = { width: 80, height: 45 };
  hitBoxes = false;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}
// ANCHOR_END: config

/**
 * Conway's Game of Life.  The board is a grid of cells, and each cell is
 * alive or dead.  Every generation, each cell looks at its eight neighbors,
 * and decides whether it will be alive in the next one.  Nobody plays: tap
 * cells to draw a starting board, and press Run.
 *
 * - A live cell with two or three live neighbors stays alive.
 * - A dead cell with exactly three live neighbors comes to life.
 * - Everything else is dead in the next generation.
 */

// ANCHOR: patterns
/**
 * Famous starting boards.  An `x` is a live cell, and a space is a dead one.
 * Picking a level picks a pattern, which is stamped in the middle of the board.
 */
const PATTERNS: { name: string, rows: string[] }[] = [
  { name: "blank", rows: [" "] },
  { name: "block", rows: ["xx", "xx"] },
  { name: "beehive", rows: [" xx ", "x  x", " xx "] },
  { name: "loaf", rows: [" xx ", "x  x", " x x", "  x "] },
  { name: "boat", rows: ["xx ", "x x", " x "] },
  { name: "tub", rows: [" x ", "x x", " x "] },
  { name: "blinker", rows: ["   ", "xxx", "   "] },
  { name: "toad", rows: [" xxx", "xxx "] },
  { name: "beacon", rows: ["xx  ", "xx  ", "  xx", "  xx"] },
  { name: "pulsar", rows: [
    "  xxx   xxx  ",
    "             ",
    "x    x x    x",
    "x    x x    x",
    "x    x x    x",
    "  xxx   xxx  ",
    "             ",
    "  xxx   xxx  ",
    "x    x x    x",
    "x    x x    x",
    "x    x x    x",
    "             ",
    "  xxx   xxx  ",
  ] },
  { name: "penta_decathlon", rows: [
    "   x   ",
    "  xxx  ",
    " xx xx ",
    "xxx xxx",
    "xxx xxx",
    "xxx xxx",
    "xxx xxx",
    " xx xx ",
    "  xxx  ",
    "   x   ",
  ] },
  { name: "glider", rows: [" x x", "  xx", "  x "] },
  { name: "lwss", rows: ["  xx ", "xx xx", "xxxx ", " xx  "] },
  { name: "mwss", rows: [" xxx  ", "xxxxx ", "xxx xx", "   xx "] },
  { name: "hwss", rows: [" xxxx  ", "xxxxxx ", "xxxx xx", "    xx "] },
  { name: "r_pentomino", rows: [" xx", "xx ", " x "] },
  { name: "diehard", rows: ["      x ", "xx      ", " x   xxx"] },
  { name: "acorn", rows: [" x     ", "   x   ", "xx  xxx"] },
  { name: "gosper", rows: [
    "                        x           ",
    "                      x x           ",
    "            xx      xx            xx",
    "           x   x    xx            xx",
    "xx        x     x   xx              ",
    "xx        x   x xx    x x           ",
    "          x     x       x           ",
    "           x   x                    ",
    "            xx                      ",
  ] },
  { name: "switch_1", rows: [
    "      x ",
    "    x xx",
    "    x x ",
    "    x   ",
    "  x     ",
    "x x     ",
  ] },
  { name: "switch_2", rows: ["xxx x", "x    ", "   xx", " xx x", "x x x"] },
  { name: "switch_3", rows: ["xxxxxxxx xxxxx   xxx      xxxxxxx xxxxx"] },
];
// ANCHOR_END: patterns

/** How big the board is, in cells */
const ROWS = 40, COLS = 80;
/** The colors of a live cell and a dead one */
const LIVE = "#8be28b", DEAD = "#232a33";

/** Build the board, and the buttons that run it */
function builder() {
  DebugToggle.enable();
  // The background shows through the gaps between the cells, which makes the grid lines
  stage.backgroundColor = "#0f1318";
  // ANCHOR: level_const
  const level = currentLevel();
  // ANCHOR_END: level_const

  // ANCHOR: state
  /** Is the simulation running?  While it is, the board can't be edited. */
  let running = false;
  // ANCHOR: speed_state
  /** The timer fires ten times a second.  A cell updates every `slowdown` + 1 ticks, and 0 is the fastest. */
  const SLOWEST = 5;
  let slowdown = SLOWEST - 1;
  let tick = 0;
  // ANCHOR_END: speed_state
  // ANCHOR: wrap_state
  /** Do the edges of the board wrap around to the other side? */
  let wrap = true;
  // ANCHOR_END: wrap_state
  // ANCHOR_END: state

  // --- The board ----------------------------------------------------------------------
  // ANCHOR: cells
  /** What a cell remembers, in its `data`: `live` is what it is now, and `next` is what it will be. */
  class CellData {
    /** Is the cell alive now? */
    live: boolean;
    /** Will the cell be alive in the next generation? */
    next: boolean;

    /**
     * Make the data for a new cell
     *
     * @param live Is the cell alive?
     */
    constructor(live: boolean) {
      this.live = live;
      this.next = live;
    }
  }

  /**
   * Make a cell alive or dead, and repaint it.  A cell's state is two
   * flags in its data, and not physics.
   *
   * @param cell The cell
   * @param live Alive?
   */
  const setLive = (cell: Actor<CellData>, live: boolean) => {
    cell.data.live = live;
    getAppearance(cell, FilledBox).fillColor = live ? LIVE : DEAD;
  };

  /** The cells, by row and column.  Each is one actor, which can be tapped to flip it. */
  const cells: Actor<CellData>[][] = [];
  for (let row = 0; row < ROWS; ++row) {
    const line: Actor<CellData>[] = [];
    for (let col = 0; col < COLS; ++col) {
      const cell: Actor<CellData> = new Actor({
        rigidBody: new BoxBody({ cx: col + 0.5, cy: row + 0.5, width: 1, height: 1 }),
        // A cell is a little smaller than its square, so a gap is left between cells
        appearance: new FilledBox({ width: 0.9, height: 0.9, fillColor: DEAD }),
        // Nothing checks the rules while you draw, so any board at all can be made
        gestures: { onTap: () => { if (!running) setLive(cell, !cell.data.live); return true; } },
        data: new CellData(false),
      });
      line.push(cell);
    }
    cells.push(line);
  }
  // ANCHOR_END: cells

  // --- The rules ------------------------------------------------------------------------
  // ANCHOR: neighbors
  // ANCHOR: neighbors_fn
  /**
   * How many of a cell's eight neighbors are alive?  With `wrap` on, the
   * edges are joined, so a glider that flies off the right comes back on the
   * left.  With it off, the edges are walls: cells outside the board don't count.
   *
   * @param row The cell's row
   * @param col The cell's column
   */
  const liveNeighbors = (row: number, col: number) => {
    let sum = 0;
    // How far to look from a cell, in each direction
    const offsets = [-1, 0, 1];
    for (const dr of offsets) {
      for (const dc of offsets) {
        if (dr == 0 && dc == 0) continue;
        let r = row + dr, c = col + dc;
        // ANCHOR: wrap_rule
        if (wrap) { r = (r + ROWS) % ROWS; c = (c + COLS) % COLS; }
        // ANCHOR_END: wrap_rule
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (cells[r][c].data.live) sum += 1;
      }
    }
    return sum;
  };
  // ANCHOR_END: neighbors_fn
  // ANCHOR_END: neighbors

  // ANCHOR: generation
  /**
   * Work out the next generation, and show it.  This takes two passes, and
   * it has to.  First every cell works out its `next` state from the board
   * as it is now, and nothing is changed.  Only then is `next` copied into
   * `live`.  If a cell were changed as soon as it was worked out, the cells
   * after it would count its *new* state, and the answer would depend on
   * the order that the cells were visited in.
   */
  const generation = () => {
    for (let row = 0; row < ROWS; ++row) {
      for (let col = 0; col < COLS; ++col) {
        const count = liveNeighbors(row, col);
        const cell = cells[row][col];
        cell.data.next = cell.data.live ? count == 2 || count == 3 : count == 3;
      }
    }
    for (const line of cells) for (const cell of line) setLive(cell, cell.data.next);
  };
  // ANCHOR_END: generation

  // --- The patterns -------------------------------------------------------------------------
  // ANCHOR: stamp
  // The level picks a pattern, which goes in the middle of the board
  const pattern = PATTERNS[level - 1];
  if (pattern) {
    const w = pattern.rows[0].length, h = pattern.rows.length;
    const left = Math.floor((COLS - w) / 2), top = Math.floor((ROWS - h) / 2);
    for (let y = 0; y < h; ++y) for (let x = 0; x < w; ++x) if (pattern.rows[y].charAt(x) === "x") setLive(cells[top + y][left + x], true);
  }
  // ANCHOR_END: stamp

  // --- The buttons ----------------------------------------------------------------------------
  // ANCHOR: button_fn
  /**
   * A button on the HUD.  There's nothing special about a button in JetLag:
   * it's an actor with some text, and a tap gesture.  The text is a function, so it is always right.
   *
   * @param cx     The x coordinate of the middle of the button
   * @param width  The width of the button
   * @param label  A function that says what the button says
   * @param action What it does when tapped
   */
  const button = (cx: number, width: number, label: () => string, action: () => void) => new Actor({
    rigidBody: new BoxBody({ cx, cy: 42.5, width, height: 3.4 }, { scene: stage.hud }),
    appearance: [
      new FilledRoundedBox({ width: width - 0.6, height: 3.4, radius: 0.8, fillColor: "#334155", lineWidth: 0.12, lineColor: "#64748b" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 26 * 5, color: "#f1f5f9" }, label),
    ],
    gestures: { onTap: () => { action(); return true; } },
  });
  // ANCHOR_END: button_fn
  // ANCHOR: step_button
  button(6, 10, () => "Step", () => { if (!running) generation(); });
  // ANCHOR_END: step_button
  // ANCHOR: run_button
  button(18, 10, () => (running ? "Running" : "Paused"), () => { running = !running; });
  // ANCHOR_END: run_button
  // ANCHOR: speed_button
  button(30, 10, () => "Speed: " + (SLOWEST - slowdown), () => { slowdown = (slowdown + SLOWEST - 1) % SLOWEST; });
  // ANCHOR_END: speed_button
  // ANCHOR: wrap_button
  button(42, 10, () => (wrap ? "wrap: ON" : "wrap: OFF"), () => { if (!running) wrap = !wrap; });
  // ANCHOR_END: wrap_button
  // ANCHOR: level_button
  /** The next level, which is the next pattern, and then back to the first */
  const nextLevel = level + 1 > PATTERNS.length ? 1 : level + 1;
  button(54, 10, () => "Level: " + level, () => switchToLevel(builder, nextLevel));
  new Actor({
    rigidBody: new BoxBody({ cx: 61, cy: 41.2, width: 0.1, height: 0.1 }, { scene: stage.hud }),
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 26 * 5, color: "#f1f5f9" }, () => PATTERNS[level - 1].name),
  });
  // ANCHOR_END: level_button

  // ANCHOR: timer
  // The whole simulation is one repeating timer
  stage.world.timer.addEvent(new TimedEvent(0.1, true, () => {
    if (!running) return;
    tick = (tick + 1) % (slowdown + 1);
    if (tick == 0) generation();
  }));
  // ANCHOR_END: timer
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
