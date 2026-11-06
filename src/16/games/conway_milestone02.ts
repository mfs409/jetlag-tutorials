import { Actor, BoxBody, DebugToggle, FilledBox, FilledRoundedBox, getAppearance, JetLagGameConfig, TextSprite, initializeAndLaunch, stage } from "jetlag2d";

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

/**
 * MILESTONE 2 for Conway's Game of Life: the rules all work.
 *
 * TODO (Running): a timer that runs generations by itself, and buttons to run, pause, and change the speed.
 *
 * TODO (Patterns): famous starting boards, one for each level, and a wrap-around edge.
 */

export const PATTERNS: { name: string, rows: string[] }[] = [{ name: "blank", rows: [" "] }];

/** How big the board is, in cells */
const ROWS = 40, COLS = 80;
/** The colors of a live cell and a dead one */
const LIVE = "#8be28b", DEAD = "#232a33";

/** Build the board, and the buttons that run it */
function builder() {
  DebugToggle.enable();
  // The background shows through the gaps between the cells, which makes the grid lines
  stage.backgroundColor = "#0f1318";

  /** Is the simulation running?  While it is, the board can't be edited. */
  let running = false;

  // --- The board ----------------------------------------------------------------------
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

  // --- The rules ------------------------------------------------------------------------
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
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (cells[r][c].data.live) sum += 1;
      }
    }
    return sum;
  };

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

  // --- The patterns -------------------------------------------------------------------------

  // --- The buttons ----------------------------------------------------------------------------
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
  button(6, 10, () => "Step", () => { if (!running) generation(); });

}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
