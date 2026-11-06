import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, GoalBehavior, ImageSprite, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, TextSprite, dispatchCollision, findBehavior, SessionValue, stage } from "jetlag2d";
import { currentLevel, endScreen, hudText, nextLevel, switchToLevel } from "../common/common";

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
 * MILESTONE 3 for Pirate's Ledger: scores that go to the account, and come back work.
 *
 * TODO (The leaderboard): the fastest pirates for the level that you just won.
 *
 * Crate Cove: a turn-based puzzle.  Push crates onto the switches to open the
 * gate, and get to the treasure.  The pirate guards take exactly one step
 * every time that you do, so the world only moves when you move.
 *
 * Arrow keys (or WASD) move.  Space waits a turn.  Z undoes your last turn,
 * and R starts the level over.
 *
 * Nothing here uses physics to move.  Every actor is put into a grid cell by
 * hand, and the game asks the world what's in a cell before it moves.
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

/** The levels, from easiest to hardest */
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
  {
    name: "The Gangway", par: 27, routes: { "1": "LLLLLRRRRR" },
    map: [
      "################",
      "#@     #########",
      "#      #########",
      "#  C   ### ## ##",
      "#      G     1T#",
      "#      #### ####",
      "#   S  #########",
      "#      #########",
      "################",
    ],
  },
  {
    name: "Cramped Quarters", par: 44, routes: {},
    map: [
      "################",
      "# #    #       #",
      "#  C#  #       #",
      "##     #       #",
      "#S #   G      T#",
      "#  @   #       #",
      "#C  S  #       #",
      "#  #   #       #",
      "################",
    ],
  },
  {
    name: "Doubloon Run", par: 37, routes: { "1": "LLLLLRRRRR", "2": "RDLU" },
    map: [
      "################",
      "#@     #########",
      "#   #  #########",
      "#  C   ### ## ##",
      "# 2    G     1T#",
      "#   #  #### ####",
      "#   S  #########",
      "#      #########",
      "################",
    ],
  },
];

/** What each letter of a route means, as a step in columns and rows */
const DIRS: { [letter: string]: [number, number] } = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

/** Everything that can change in a turn, so that a turn can be undone */
interface Snapshot {
  /** Where the hero was */
  hero: Cell;
  /** Where each crate was */
  crates: Cell[];
  /** Where each guard was, and how far along its route */
  guards: { cell: Cell, step: number }[];
  /** How many turns had been taken */
  moves: number;
}

/**
 * Are two squares the same square?
 *
 * @param a One square
 * @param b The other square
 */
function sameCell(a: Cell, b: Cell) { return a.col == b.col && a.row == b.row; }

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

// ---------------------------------------------------------------------------
// What the game remembers
// ---------------------------------------------------------------------------

/** The best number of turns for each level (by level number), as the server sends and receives them */
type Bests = { [level: number]: number };

/**
 * What this device remembers: the best number of turns for each level, in
 * order, with 0 for a level that hasn't been won.  It's only fields, so that it
 * can be saved.
 */
class LocalBests {
  turns: number[] = LEVELS.map(() => 0);
}

/**
 * The bests.  It's loaded from persistent storage the first time that it's
 * needed, and from then on the game works with the copy in session storage.
 * Nothing has been saved before the first win, so then there are no bests.
 */
const BESTS = new SessionValue<LocalBests>("crate_cove_local", () => stage.storage.loadPersistent("crate_cove_local", new LocalBests()));

/** The bests, as an object from level number to turns, which is what the server wants */
function bestsObject(): Bests {
  const result: Bests = {};
  const turns = BESTS.get().turns;
  for (let i = 0; i < turns.length; ++i) if (turns[i] > 0) result[i + 1] = turns[i];
  return result;
}

/**
 * Keep a number of turns, if it is better than the best that we have
 *
 * @param level The level number
 * @param moves How many turns it took
 *
 * @returns True if it was a new best
 */
function recordBest(level: number, moves: number) {
  const turns = BESTS.get().turns;
  if (turns[level - 1] > 0 && turns[level - 1] <= moves) return false;
  turns[level - 1] = moves;
  stage.storage.savePersistent("crate_cove_local", BESTS.get());
  return true;
}

/**
 * What we know about the server.  `offline` means that it can't be reached,
 * so the game is just a game.  `guest` means that it's there, and nobody has
 * logged in.  `in` means that someone has.
 */
class Account {
  state: "offline" | "guest" | "in" = "offline";
  name?: string;
  /** Has the server answered yet?  Until it has, we assume that it's not there. */
  asked = false;
}

/** The account, in session storage, so that every level can read it */
const ACCOUNT = new SessionValue<Account>("account", () => new Account());

/** What came back from a request: the HTTP status, and the JSON, if there was any.  A status of 0 means that there was no answer at all. */
interface Reply<T> { status: number; data?: T }

/**
 * Ask the server for something, or give it something.  This never fails, and
 * never waits for anyone: if the server is down, or slow, or confused, the
 * answer is a status that says so.  That's what lets the game carry on.
 *
 * @param path The address, such as "/api/me"
 * @param body If there is one, it is sent (as JSON) with a POST
 */
async function api<T>(path: string, body?: unknown): Promise<Reply<T>> {
  try {
    const res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let data: T | undefined;
    try { data = await res.json(); } catch { /* not every answer has a body */ }
    return { status: res.status, data };
  } catch {
    return { status: 0 };
  }
}

/**
 * Find out who we are.  This asks the server once per visit, and the answer
 * is kept in session storage.  The browser sends its login cookie by itself,
 * and the game never sees it.
 */
async function checkLogin() {
  const account = ACCOUNT.get();
  if (account.asked) return;
  const me = await api<{ name: string }>("/api/me");
  account.asked = true;
  if (me.data?.name) {
    account.state = "in";
    account.name = me.data.name;
    await syncBests();
  } else {
    // A 401 means that the server is there, and doesn't know us.  Anything else means it isn't.
    account.state = me.status == 401 ? "guest" : "offline";
  }
}

/** Log out, here and on the server */
async function logOut() {
  await api("/api/logout", {});
  const account = ACCOUNT.get();
  account.state = "guest";
  account.name = undefined;
}

/** Take whatever is better, level by level, from some bests that the server sent */
function mergeBests(theirs: Bests) {
  for (const level of Object.keys(theirs)) recordBest(Number(level), theirs[Number(level)]);
}

/**
 * Give the server everything that this device knows, and take back everything that
 * it knows.  This runs once, when a player has just logged in, because scores
 * from before then are only on this device.
 */
async function syncBests() {
  const reply = await api<Bests>("/api/sync", { bests: bestsObject() });
  if (reply.data) mergeBests(reply.data);
}

/**
 * Tell the server about a finished level, if somebody is logged in.  The
 * server's answer is all of that player's bests, so we merge it in.
 *
 * @param level The level number
 * @param moves How many turns it took
 */
async function submitScore(level: number, moves: number) {
  if (ACCOUNT.get().state != "in") return;
  const reply = await api<Bests>("/api/score", { level, moves });
  if (reply.data) mergeBests(reply.data);
}

/** Build one level.  Which one comes from the current level number. */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1d3b4f";
  const levelNum = currentLevel();
  const level = LEVELS[levelNum - 1];
  checkLogin();
  /** How many turns have been taken */
  let moves = 0;
  /** Did a guard catch the hero?  Then nothing but undo or restart works. */
  let caught = false;
  const crates: Actor[] = [];
  const switches: { cell: Cell, light: FilledBox }[] = [];
  let gate: Actor | undefined;
  const guards: { actor: Actor, cell: Cell, route: string, step: number, turn: (dx: number, dy: number) => void }[] = [];

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
  /**
   * Is something in a square that nothing else can share?  A wall, a shut
   * gate, a crate, or a guard.
   *
   * @param c The square
   */
  const blocked = (c: Cell) => at(c).some(a => isWall(a) || crates.includes(a) || guards.some(g => g.actor == a));

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
      else if (ch == "C") {
        crates.push(new Actor({
          appearance: [
            new FilledBox({ width: 0.88, height: 0.88, fillColor: "#9b6a3c", lineWidth: 0.05, lineColor: "#5e3d1c", z: 1 }),
            new FilledBox({ width: 0.5, height: 0.5, fillColor: "#b98550", lineWidth: 0.03, lineColor: "#5e3d1c", z: 1 }),
          ],
          rigidBody: new BoxBody({ cx, cy, width: 0.88, height: 0.88 }),
        }));
      }
      else if (ch == "S") {
        const light = new FilledBox({ width: 0.7, height: 0.7, fillColor: "#b8432f", lineWidth: 0.06, lineColor: "#6e2417", z: -1 });
        new Actor({ appearance: light, rigidBody: new BoxBody({ cx, cy, width: 0.7, height: 0.7 }, { collisionsEnabled: false }) });
        switches.push({ cell: { col, row }, light });
      }
      else if (ch == "G") {
        gate = new Actor({
          appearance: new FilledBox({ width: 1, height: 1, fillColor: "#7a4b24", lineWidth: 0.08, lineColor: "#d8b04a" }),
          rigidBody: new BoxBody({ cx, cy, width: 1, height: 1 }),
          behaviors: new SolidBehavior(),
        });
      }
      else if (ch == "T") {
        new Actor({
          appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
          rigidBody: new CircleBody({ cx, cy, radius: 0.35 }, { collisionsEnabled: false }),
          behaviors: new GoalBehavior({ onArrival: () => { stage.score.counters.add("treasure", 1); return true; } }),
        });
      }
      else if (ch >= "0" && ch <= "9") {
        const look = pirate("walk_s", 2.4);
        const actor = new Actor({
          appearance: look.sprite,
          rigidBody: new CircleBody({ cx, cy, radius: 0.3 }, { collisionsEnabled: false }),
        });
        guards.push({ actor, cell: { col, row }, route: level.routes[ch], step: 0, turn: look.turn });
      }
    }
  }

  // --- A turn ------------------------------------------------------------------
  /** The gate is open exactly when every switch has a crate on it.  Ask, and then open or shut it. */
  const updateGate = () => {
    const open = switches.every(s => at(s.cell).some(a => crates.includes(a)));
    switches.forEach(s => (s.light.fillColor = at(s.cell).some(a => crates.includes(a)) ? "#3fbf6b" : "#b8432f"));
    if (gate) gate.enabled = !open;
  };
  /** Has the level ended, one way or another?  Then the keys stop working. */
  const over = () => stage.score.counters.get("treasure") > 0 || caught;
  /**
   * Try to push a crate one square.  A crate can't be pushed into anything
   * that's in the way, and that includes another crate.
   *
   * @param crate The crate
   * @param dx    The step in columns
   * @param dy    The step in rows
   * @returns     True if the crate moved
   */
  const pushCrate = (crate: Actor, dx: number, dy: number) => {
    const c = cellOf(crate), next = { col: c.col + dx, row: c.row + dy };
    if (blocked(next)) return false;
    place(crate, next);
    return true;
  };
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
    const crate = at(next).find(a => crates.includes(a));
    if (crate && !pushCrate(crate, dx, dy)) return false;
    heroLook.turn(dx, dy);
    place(hero, next);
    // Box2D doesn't know that the hero just arrived, so we tell everything
    // that's here, the same way that a real collision would
    at(next).forEach(a => { if (a != hero) dispatchCollision(a, hero); });
    if (guards.some(g => sameCell(cellOf(g.actor), next))) caught = true;
    return true;
  };
  /**
   * Every guard takes one step along its route.  A guard whose way is
   * blocked waits where it is, and tries the same step next turn.  A guard
   * that steps onto the hero catches it.
   */
  const moveGuards = () => {
    for (const g of guards) {
      const [dx, dy] = DIRS[g.route[g.step % g.route.length]];
      const here = cellOf(g.actor), next = { col: here.col + dx, row: here.row + dy };
      if (blocked(next)) continue;
      g.step += 1;
      g.turn(dx, dy);
      place(g.actor, next);
      if (sameCell(cellOf(hero), next)) caught = true;
    }
  };
  /** Write down where everything is */
  const snapshot = (): Snapshot => ({
    hero: cellOf(hero),
    crates: crates.map(cellOf),
    guards: guards.map(g => ({ cell: cellOf(g.actor), step: g.step })),
    moves,
  });
  /** The snapshots of the turns so far, most recent last */
  const history: Snapshot[] = [];
  /** Take back the last turn: put everything where it was */
  const undo = () => {
    const before = history.pop();
    if (!before || stage.score.counters.get("treasure") > 0) return;
    place(hero, before.hero);
    crates.forEach((c, i) => place(c, before.crates[i]));
    guards.forEach((g, i) => { place(g.actor, before.guards[i].cell); g.step = before.guards[i].step; });
    moves = before.moves;
    caught = false;
    updateGate();
  };
  /**
   * One turn: the hero acts, and then the world does.  The turn is only used
   * up if the hero did something.
   *
   * @param dx The step in columns (0 to wait)
   * @param dy The step in rows (0 to wait)
   */
  const takeTurn = (dx: number, dy: number) => {
    if (over()) return;
    const before = snapshot();
    // Waiting (no step at all) is a turn, too
    if ((dx != 0 || dy != 0) && !tryStep(dx, dy)) return;
    history.push(before);
    moves += 1;
    updateGate();
    // The treasure ends the level before the guards get a turn
    if (stage.score.counters.get("treasure") == 0) moveGuards();
  };

  // --- Controls ------------------------------------------------------------------
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => takeTurn(0, -1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => takeTurn(0, 1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => takeTurn(-1, 0));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => takeTurn(1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(builder));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => takeTurn(0, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_Z, undo);

  // --- The HUD ---------------------------------------------------------------------
  hudText(0.3, 0.5, 22, "#ffffff", () => `Moves: ${moves}`, { outline: "#000000" });
  hudText(10.2, 0.5, 22, "#ffffff", () => `${levelNum}. ${level.name}   Par ${level.par}`, { outline: "#000000" });
  hudText(6.2, 0.5, 22, "#ffffff", () => (gate ? (gate.enabled ? "The gate is shut" : "The gate is open!") : ""), { outline: "#000000" });
  // A button at the bottom, which says who is playing, and logs in, or out
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 20, color: "#ffffff", strokeColor: "#000000", strokeWidth: 3 }, () => {
      const a = ACCOUNT.get();
      return a.state == "in" ? `${a.name}  (click to log out)` : a.state == "guest" ? "Click to log in, and save your scores" : "Offline: scores stay on this device";
    }),
    rigidBody: new BoxBody({ cx: 13.1, cy: 8.55, width: 5.6, height: 0.7 }, { scene: stage.hud, collisionsEnabled: false }),
    gestures: {
      onTap: () => {
        const a = ACCOUNT.get();
        // Logging in leaves the game for the server's login page, and the server sends us back
        if (a.state == "guest") window.location.href = "/auth/google";
        if (a.state == "in") logOut();
        return true;
      },
    },
  });
  hudText(8, 8.5, 22, "#ffffff", () => (caught ? "Caught!  Z to undo, or R to restart" : ""), { center: true, outline: "#000000" });

  // --- Winning ---------------------------------------------------------------------
  stage.score.addWinCondition(() => stage.score.counters.get("treasure") > 0);
  stage.score.winSceneBuilder = (overlay) => {
    const stars = moves <= level.par ? 3 : moves <= level.par * 1.5 ? 2 : 1;
    // The best turns for each level are kept on this device
    const newBest = recordBest(levelNum, moves);
    const best = BESTS.get();
    // If somebody is logged in, their account hears about it too
    submitScore(levelNum, moves);
    const last = levelNum == LEVELS.length;
    endScreen(overlay, {
      title: last ? "All the treasure is yours!" : "Treasure!",
      detail: `${"★".repeat(stars)}${"☆".repeat(3 - stars)}\n${moves} turns (par ${level.par})${newBest ? "   A new best!" : `   Best: ${best.turns[levelNum - 1]}`}`,
      prompt: last ? "Click or press Enter to start over" : "Click or press Enter for the next level",
      next: () => (last ? switchToLevel(builder, 1) : nextLevel(builder)),
      background: "#0b1a24ee", titleColor: "#ffd35a",
    });
  };

  // A crate can start on a switch, so the gate has to be checked once at the start
  updateGate();
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
