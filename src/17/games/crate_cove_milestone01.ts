import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, findBehavior, stage } from "jetlag2d";
import { hudText } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "pirate.json"],
  };
}

/**
 * MILESTONE 1 for Crate Cove: the walking pirate all work.
 *
 * TODO (Crates): crates that can be pushed, if there's room.
 *
 * TODO (Switches and gate): a gate that opens when every switch has a crate on it, and treasure that wins the level.
 *
 * TODO (Guards): pirates who take one step every time you do, and catch you if they step on you, and a key to wait a turn.
 *
 * TODO (Undo): a key that takes back the last turn.
 *
 * TODO (Levels): four levels, stars for beating par, and your best number of turns.
 */

/** A square of the grid.  Column 0, row 0 is the top left, and every square is 1 meter wide. */
interface Cell { col: number; row: number }

/** Everything that makes one level different from another */
interface Level {
  /** What the level is called */
  name: string;
  /** The fewest turns that it can be done in.  (A solver worked this out.) */
  par: number;
  /**
   * The level, one string per row of the grid:
   * `#` wall, `@` the hero, `C` a crate, `S` a switch, `G` the gate, `T` the
   * treasure, and a digit is a guard
   */
  map: string[];
  /** The route of each guard, by digit: a string of U, D, L, and R that it repeats forever */
  routes: { [guard: string]: string };
}

/** The level */
const LEVELS: Level[] = [
  {
    name: "First Mate", par: 19, routes: {},
    map: [
      "################",
      "#@     #       #",
      "#      #       #",
      "#  C   #       #",
      "#      G     T #",
      "#      #       #",
      "#   S  #       #",
      "#      #       #",
      "################",
    ],
  },
];

/**
 * Find a character in a level's map
 *
 * @param map The rows of the level
 * @param ch  The character to look for
 */
function findCell(map: string[], ch: string): Cell {
  for (let row = 0; row < map.length; row++) {
    const col = map[row].indexOf(ch);
    if (col >= 0) return { col, row };
  }
  throw new Error(`The map has no ${ch}`);
}

/**
 * A pirate who faces whichever way it last moved.  The art has four
 * directions, and each is a short walk cycle that ends standing still.
 *
 * @param art  Which art: "walk" is a pirate with empty hands, and "walk_s" is a pirate with a sword
 * @param size How big to draw it, in meters
 * @returns    The sprite, and a function to turn it
 */
function pirate(art: string, size: number) {
  const walk = (d: string) => AnimationSequence.makeSimple({ timePerFrame: 70, repeat: false, images: [1, 3, 5, 7, 0].map(i => `pirate_${art}_${d}_${i}.png`) });
  const sprite = new AnimatedSprite({
    width: size, height: size, z: 1,
    animations: new Map([[AnimationState.IDLE_E, walk("r")], [AnimationState.IDLE_W, walk("l")], [AnimationState.IDLE_N, walk("u")], [AnimationState.IDLE_S, walk("d")]]),
  });
  let facing = AnimationState.IDLE_S;
  // The sprite asks which animation to play, and we answer with the way that it last moved
  sprite.stateSelector = () => facing;
  /**
   * Turn to face the way of a step, and play a step of the walk
   *
   * @param dx The step in columns
   * @param dy The step in rows
   */
  const turn = (dx: number, dy: number) => {
    facing = dx < 0 ? AnimationState.IDLE_W : dx > 0 ? AnimationState.IDLE_E : dy < 0 ? AnimationState.IDLE_N : AnimationState.IDLE_S;
    sprite.restartCurrentAnimation();
  };
  return { sprite, turn };
}

/** Build one level.  Which one comes from the current level number. */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1d3b4f";
  const level = LEVELS[0];
  /** How many turns have been taken */
  let moves = 0;

  // --- Asking the world ------------------------------------------------------
  /**
   * Everything that is standing in a square.  `actorsAt` reuses its answer
   * every time that it's called, so this makes a copy.
   *
   * @param c The square
   */
  const at = (c: Cell) => [...stage.world.physics.actorsAt({ x: c.col + 0.5, y: c.row + 0.5 })];
  /** Is this actor a wall, or a gate that's shut?  (A gate that's open is turned off, so `actorsAt` doesn't find it.) */
  const isWall = (a: Actor) => findBehavior(a, SolidBehavior) !== undefined;
  /**
   * Which square an actor is in
   *
   * @param a The actor
   */
  const cellOf = (a: Actor): Cell => ({ col: Math.floor(a.rigidBody.getCenter().x), row: Math.floor(a.rigidBody.getCenter().y) });
  /**
   * Put an actor in the middle of a square.  Nothing slides: it's there at once.
   *
   * @param a The actor
   * @param c The square
   */
  const place = (a: Actor, c: Cell) => a.rigidBody.setCenter(c.col + 0.5, c.row + 0.5);

  // --- The level -------------------------------------------------------------
  new Actor({
    appearance: new FilledBox({ width: 14, height: 7, fillColor: "#e0cf9f", z: -3 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 14, height: 7 }, { collisionsEnabled: false }),
  });
  const start = findCell(level.map, "@");
  const heroLook = pirate("walk", 1.2);
  // The hero never collides by itself.  We tell everything when the hero
  // arrives.  `PlayerControlBehavior` is what tells a goal that this is the hero.
  const hero = new Actor({
    appearance: heroLook.sprite,
    rigidBody: new CircleBody({ cx: start.col + 0.5, cy: start.row + 0.5, radius: 0.3 }, { collisionsEnabled: false }),
    behaviors: new PlayerControlBehavior(),
  });
  for (let row = 0; row < level.map.length; row++) {
    for (let col = 0; col < level.map[row].length; col++) {
      const ch = level.map[row][col], cx = col + 0.5, cy = row + 0.5;
      if (ch == "#") {
        new Actor({
          appearance: new FilledBox({ width: 1, height: 1, fillColor: "#4d5c70", lineWidth: 0.04, lineColor: "#2c3646" }),
          rigidBody: new BoxBody({ cx, cy, width: 1, height: 1 }),
          behaviors: new SolidBehavior(),
        });
      }
    }
  }

  // --- A turn ------------------------------------------------------------------
  /**
   * Try to move the hero one square.  If something is in the way, nothing at
   * all happens, and the turn isn't used.
   *
   * @param dx The step in columns
   * @param dy The step in rows
   * @returns  True if the hero moved
   */
  const tryStep = (dx: number, dy: number) => {
    const here = cellOf(hero), next = { col: here.col + dx, row: here.row + dy };
    if (at(next).some(isWall)) return false;
    heroLook.turn(dx, dy);
    place(hero, next);
    return true;
  };
  /**
   * One turn: the hero acts, and then the world does.  The turn is only used
   * up if the hero did something.
   *
   * @param dx The step in columns (0 to wait)
   * @param dy The step in rows (0 to wait)
   */
  const takeTurn = (dx: number, dy: number) => {
    if (!tryStep(dx, dy)) return;
    moves += 1;
  };

  // --- Controls ------------------------------------------------------------------
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => takeTurn(0, -1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => takeTurn(0, 1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => takeTurn(-1, 0));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => takeTurn(1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(builder));

  // --- The HUD ---------------------------------------------------------------------
  hudText(0.3, 0.5, 22, "#ffffff", () => `Moves: ${moves}`, { outline: "#000000" });

  // --- Winning ---------------------------------------------------------------------

}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
