import { Actor, BoxBody, DebugToggle, FilledBox, getAppearance, JetLagGameConfig, initializeAndLaunch, stage } from "jetlag2d";

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
 * STARTER CODE for Conway's Game of Life.
 *
 * A board of dark cells.  Tap one, and it lights up green, and nothing else
 * happens.  The comments below say what each stage adds.
 *
 * TODO (The board): a board of cells that you can tap, to make alive or dead.
 *
 * TODO (The rules): the rules, a count of each cell's living neighbors, and a button that works out one generation.
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

  // --- The patterns -------------------------------------------------------------------------

  // --- The buttons ----------------------------------------------------------------------------

}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
