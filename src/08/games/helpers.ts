import { Actor, AppearanceComponent, Behavior, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, KeyCodes, LevelValue, PlayerControlBehavior, ProximityBehavior, Scene, SessionValue, SolidBehavior, stage, TextSprite, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { currentLevel, endScreen, hudText, switchToLevel } from "../common/common";

/**
 * HELPERS for The Alchemist's Tower.
 *
 * Everything in this file is provided, and you don't have to edit it.  It has the data (the floors, the recipes, the cat's
 * conversation), the state that lasts for the whole climb, the wizard, the keys, the HUD, the potions, and the pictures that
 * the map is made of.  What the map means, and how the panels work, are what you write.
 */

/** One floor of the tower: its name, the recipe that its bookshelf teaches (or none), and its map */
export interface Floor { name: string; book: Potion | ""; map: string[]; }

/**
 * The floors.  # wall, . floor, < and > stairs, h herb, m mushroom, f feather,
 * c crystal, b the cat's bell, P pit, o mouse hole, S secret wall, K cauldron,
 * B bookshelf, C cat, E the roof hatch.
 */
export const FLOORS: Floor[] = [
  // ANCHOR: first_floor
  {
    name: "1. Entrance Hall", book: "levitation",
    map: [
      "################",
      "#...h......f...#",
      "#..........###.#",
      "#..K...C...#>#.#",
      "#..........#P#.#",
      "####.#######P#.#",
      "#h.............#",
      "#...f...B......#",
      "################",
    ],
  },
  // ANCHOR_END: first_floor
  {
    name: "2. The Library", book: "shrink",
    map: [
      "################",
      "#<....B#.....b.#",
      "#......#...m...#",
      "#..m...#.......#",
      "#......o...h...#",
      "#......#..###..#",
      "#.K....#..#>#..#",
      "#...m..#.......#",
      "################",
    ],
  },
  {
    name: "3. The Observatory", book: "",
    map: [
      "################",
      "#<....c..#.....#",
      "#........#..>..#",
      "#..K.....#.....#",
      "#........S.....#",
      "#..C.....#..c..#",
      "#.c......#.....#",
      "#....B...#..m..#",
      "################",
    ],
  },
  {
    name: "4. The Roof", book: "",
    map: [
      "################",
      "#<...#..P..#...#",
      "#....#..P..#.E.#",
      "#....o..P..S...#",
      "#....#..P..#...#",
      "#.K..#..P..#...#",
      "#..h.#..P..#...#",
      "#.fm.#..P..#...#",
      "################",
    ],
  },
];

/** The four kinds of ingredient */
export type Ingredient = "herb" | "mushroom" | "feather" | "crystal";

/** The three potions */
export type Potion = "levitation" | "shrink" | "nightsight";

/** A recipe: what it is called, which key drinks it, what goes into it, and how many seconds it lasts */
export interface Recipe { label: string; key: string; inputs: Ingredient[]; seconds: number; }

// ANCHOR: recipes
/** The recipes: pure data, read by generic crafting code */
export const RECIPES: { levitation: Recipe, shrink: Recipe, nightsight: Recipe } = {
  levitation: { label: "Levitation", key: "1", inputs: ["herb", "feather"], seconds: 8 },
  shrink: { label: "Shrink", key: "2", inputs: ["mushroom", "herb"], seconds: 10 },
  nightsight: { label: "Night-sight", key: "3", inputs: ["crystal", "mushroom"], seconds: 0 },
};
// ANCHOR_END: recipes

// ANCHOR: cat_data
/** The cat's conversation: each node has some text (a `\n` starts a new line) and numbered replies */
export interface Node { text: string; replies: { say: string, next: string, effect?: () => void }[]; }
export const CAT: { [id: string]: Node } = {
  start: {
    text: "Mrrrow.  A visitor!  You have the look of someone who\nwants to reach the roof.",
    replies: [{ say: "How do I get up there?", next: "how" }, { say: "Nice kitty.", next: "pet" }, { say: "Bye.", next: "" }],
  },
  how: {
    text: "Stairs, obviously.  But the tower tests you.  Bookshelves\nteach recipes, and cauldrons brew them.",
    replies: [{ say: "Anything else?", next: "quest" }, { say: "Thanks.", next: "" }],
  },
  pet: { text: "Purrrr.  Fine.  You may stay.", replies: [{ say: "(back)", next: "start" }] },
  quest: {
    text: "I lost my silver bell in the library.  Bring it to me, and\nI'll teach you to see what's hidden.",
    replies: [{ say: "I'll find it.", next: "", effect: () => (TOWER.get().quest = true) }, { say: "Not my problem.", next: "sulk" }],
  },
  sulk: { text: "Hmph.  Enjoy the walls that aren't walls, then.", replies: [{ say: "Wait, what?", next: "quest" }, { say: "(leave)", next: "" }] },
  bell: {
    text: "My bell!  A crystal and a mushroom, stirred backwards,\nmake Night-sight.  Drink it and hidden doors show\nthemselves.",
    replies: [{ say: "Thank you, cat.", next: "", effect: () => { TOWER.get().gaveBell = true; TOWER.get().bag.bell = 0; TOWER.get().known.push("nightsight"); } }],
  },
  after: { text: "Go on.  The roof won't climb itself.", replies: [{ say: "Bye.", next: "" }] },
};
// ANCHOR_END: cat_data

// ANCHOR: tower_state
/** Everything that the wizard has and knows.  It lasts for the whole climb. */
export class TowerState {
  /** How many of each ingredient (and the cat's bell) are in the bag */
  bag = { herb: 0, mushroom: 0, feather: 0, crystal: 0, bell: 0 };
  /** How many of each potion have been brewed */
  potions = { levitation: 0, shrink: 0, nightsight: 0 };
  /** The recipes that the wizard has learned, in the order that they were learned */
  known: Potion[] = [];
  /** The keys of the items that have been picked up, so that they don't come back */
  taken: string[] = [];
  /** Has the cat asked the wizard to find its bell? */
  quest = false;
  /** Has the wizard given the cat its bell? */
  gaveBell = false;
  /** Has the wizard drunk Night-sight? */
  nightsight = false;
  /** How the wizard came to this floor, which decides where they appear */
  arrive: "start" | "up" | "down" = "start";
}

/**
 * What the wizard has and knows.  It's kept in session storage, so it survives
 * moving between floors, and the first read makes a fresh `TowerState`.
 */
export const TOWER = new SessionValue<TowerState>("tower", () => new TowerState());
// ANCHOR_END: tower_state

/** How close the wizard has to be to something, to press E on it */
export const NEAR = 1.3;

// ANCHOR: panel_keys
/** The keys of the panel that is open, if one is.  While it is open, 1, 2 and 3 choose from it */
export const PANEL: { keys: Map<KeyCodes, () => void> | undefined } = { keys: undefined };
// ANCHOR_END: panel_keys

/** Close the panel that is open */
export function closePanel() {
  stage.clearOverlay();
  PANEL.keys = undefined;
}

/** The keys that choose from a panel */
export const NUMBER_KEYS = [KeyCodes.KEY_DIGIT1, KeyCodes.KEY_DIGIT2, KeyCodes.KEY_DIGIT3];

// ANCHOR: restart
/** Start the tower over from scratch (`thisLevel` is the builder for a floor).  It works at any time, which matters, because a wizard can get stuck. */
export function restart(thisLevel: () => void) {
  stage.clearOverlay();
  TOWER.clear();
  switchToLevel(thisLevel, 1);
}
// ANCHOR_END: restart

// ANCHOR: show_prompt
/** The message in the corner of the HUD.  Level storage is forgotten when a floor is built. */
const PROMPT = new LevelValue<string>("prompt", () => "");

/**
 * Show a short message in the corner of the HUD, until the next one
 *
 * @param text The message
 */
export function showPrompt(text: string) {
  PROMPT.set(text);
}
// ANCHOR_END: show_prompt

// ANCHOR: brew
/**
 * Take what a recipe needs out of the bag.  Call `canBrew` first.
 *
 * @param recipe The recipe
 */
export function brew(recipe: Recipe) {
  const bag = TOWER.get().bag;
  for (const ingredient of recipe.inputs) bag[ingredient] -= 1;
}
// ANCHOR_END: brew

// ANCHOR: use_up
/**
 * Use up one potion, if the wizard has one
 *
 * @param potion Which potion
 * @returns      True if there was one, and it has been used
 */
function useUp(potion: Potion) {
  const potions = TOWER.get().potions;
  if (potions[potion] == 0) return false;
  potions[potion] -= 1;
  return true;
}
// ANCHOR_END: use_up

// ANCHOR: drink_levitation
/**
 * Drink Levitation: for a while, the wizard can pass over pits.  When it wears
 * off over a pit, the wizard falls, and starts the floor again.
 *
 * @param wizard The wizard
 * @param glow   The glow around the wizard
 * @param floor  The floor that the wizard is on
 * @param start  Where the wizard begins the floor
 * @param updatePassThrough What to do when a potion starts or stops working
 */
export function drinkLevitation(wizard: Actor, glow: FilledCircle, floor: Floor, start: { x: number, y: number }, updatePassThrough: (wizard: Actor, glow: FilledCircle) => void) {
  if (!useUp("levitation")) return;
  stage.score.counters.add("levitating", 1);
  updatePassThrough(wizard, glow);
  stage.world.timer.addEvent(new TimedEvent(RECIPES.levitation.seconds, false, () => {
    stage.score.counters.add("levitating", -1);
    updatePassThrough(wizard, glow);
    const c = wizard.rigidBody.getCenter();
    if (stage.score.counters.get("levitating") == 0 && floor.map[Math.floor(c.y)]?.[Math.floor(c.x)] == "P") {
      showPrompt("You fell!");
      wizard.rigidBody.setCenter(start.x, start.y);
    }
  }));
}
// ANCHOR_END: drink_levitation

// ANCHOR: drink_shrink
/**
 * Drink Shrink: for a while, the wizard is half the size, and can pass through
 * mouse holes.
 *
 * @param wizard The wizard
 * @param glow   The glow around the wizard
 * @param updatePassThrough What to do when a potion starts or stops working
 */
export function drinkShrink(wizard: Actor, glow: FilledCircle, updatePassThrough: (wizard: Actor, glow: FilledCircle) => void) {
  if (!useUp("shrink")) return;
  if (stage.score.counters.get("shrunk") == 0) wizard.resize(0.5);
  stage.score.counters.add("shrunk", 1);
  updatePassThrough(wizard, glow);
  stage.world.timer.addEvent(new TimedEvent(RECIPES.shrink.seconds, false, () => {
    stage.score.counters.add("shrunk", -1);
    if (stage.score.counters.get("shrunk") == 0) wizard.resize(2);
    updatePassThrough(wizard, glow);
  }));
}
// ANCHOR_END: drink_shrink

// ANCHOR: drink_nightsight
/**
 * Drink Night-sight: from now on, the secret walls on this floor, and every
 * floor after it, are doors that can be walked through.
 *
 * @param secrets The secret walls on this floor
 */
export function drinkNightsight(secrets: Actor[]) {
  if (!useUp("nightsight")) return;
  TOWER.get().nightsight = true;
  for (const secret of secrets) {
    secret.enabled = false;
    const c = secret.rigidBody.getCenter();
    deco(c.x, c.y, 1, 1, "#2a2640", "#6bd6ff");
  }
}
// ANCHOR_END: drink_nightsight

/**
 * Build one floor of the tower, except for its map: the state that lasts for the whole climb, the wizard (who
 * starts next to the stairs that they came through), the keys, the HUD, and the end screen.
 *
 * @param thisLevel          The builder function for a floor, so that stairs and R can start another
 * @param updatePassThrough  Decides which tiles the wizard can pass through, from the potions that are working
 *
 * @returns The wizard's state (`s`), the floor, the number of the floor, `near` (makes something that you can walk up to and
 *          press E), and the secret walls on this floor
 */
export function startTower(thisLevel: () => void, updatePassThrough: (wizard: Actor, glow: FilledCircle) => void) {
  DebugToggle.enable();
  const floorNum = currentLevel();
  const floor = FLOORS[floorNum - 1];
  const s = TOWER.get();
  // Night-sight tints the whole tower blue, for the rest of the climb
  stage.backgroundColor = s.nightsight ? "#14283a" : "#1e1b2e";

  // ANCHOR: prompt_state
  // A short message in the corner of the HUD, which `showPrompt` writes
  showPrompt("");
  // ANCHOR_END: prompt_state
  // ANCHOR: nearby_state
  // Whatever the wizard is standing next to, and how to use it
  let nearby: { name: string, open: () => void } | undefined;
  // ANCHOR_END: nearby_state
  // ANCHOR: secrets_state
  // The secret walls on this floor, so that Night-sight can reveal them
  const secrets: Actor[] = [];
  // ANCHOR_END: secrets_state
  PANEL.keys = undefined;

  // The wizard starts at the top left, unless they came through some stairs
  let start = { x: 1.5, y: 1.5 };
  // ANCHOR: arrival
  // The wizard arrives next to whichever stairs they came through, on a floor
  // tile (and not on the stairs themselves, or they'd go right back)
  const find = (ch: string) => { for (let r = 0; r < floor.map.length; r++) { const c = floor.map[r].indexOf(ch); if (c >= 0) return { x: c + 0.5, y: r + 0.5 }; } return undefined; };
  const stair = s.arrive == "up" ? find("<") : s.arrive == "down" ? find(">") : undefined;
  if (stair) {
    const steps = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];
    for (const step of steps) {
      if (floor.map[stair.y - 0.5 + step.dy]?.[stair.x - 0.5 + step.dx] == ".") {
        start = { x: stair.x + step.dx, y: stair.y + step.dy };
        break;
      }
    }
  }
  // ANCHOR_END: arrival

  // ANCHOR: near_helper
  /** Something to walk up to: while the wizard is close, show "E: name", and E opens it */
  const near = (name: string, open: () => void) => new ProximityBehavior({
    onEnter: (_s: Actor, o: Actor) => { if (o == wizard) { nearby = { name, open }; showPrompt(`E: ${name}`); } },
    onExit: (_s: Actor, o: Actor) => { if (o == wizard && nearby?.name == name) { nearby = undefined; showPrompt(""); } },
  });
  // ANCHOR_END: near_helper

  // The wizard
  const glow = new FilledCircle({ radius: 0.45, fillColor: "#00000000", z: 1 });
  const wizard = new Actor({
    appearance: [glow, new FilledCircle({ radius: 0.3, fillColor: "#9b6bd6", lineWidth: 0.05, lineColor: "#4d2f73", z: 1 }), new FilledPolygon({ vertices: [{ x: -0.28, y: -0.1 }, { x: 0, y: -0.55 }, { x: 0.28, y: -0.1 }], fillColor: "#4d2f73", z: 1 })],
    rigidBody: new CircleBody({ cx: start.x, cy: start.y, radius: 0.3 }, { disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // ANCHOR: keys
  // Keyboard.  Every time a movement key goes down or up, `walk` sets the wizard's
  // velocity from the keys that are held.  A held key keeps going down, so nothing
  // needs to run on every frame.
  const held = { l: false, r: false, u: false, d: false };
  const walk = () => {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    wizard.rigidBody.setVelocity(dx * 3.5, dy * 3.5);
  };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = false; walk(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = false; walk(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => { held.u = false; walk(); });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => { held.d = false; walk(); });
  // ANCHOR_END: keys
  // ANCHOR: key_esc
  // Keys are for the whole game, and an open panel is on top of it, so a key that
  // a panel uses first asks whether a panel is open.  Esc only does something then.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_ESCAPE, () => { if (PANEL.keys) closePanel(); });
  // ANCHOR_END: key_esc
  // ANCHOR: key_interact
  // E opens whatever the wizard is next to, but not while a panel is already open
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_E, () => { if (!PANEL.keys) nearby?.open(); });
  // ANCHOR_END: key_interact
  // ANCHOR: key_potions
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT1, () => { if (PANEL.keys) PANEL.keys.get(KeyCodes.KEY_DIGIT1)?.(); else drinkLevitation(wizard, glow, floor, start, updatePassThrough); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT2, () => { if (PANEL.keys) PANEL.keys.get(KeyCodes.KEY_DIGIT2)?.(); else drinkShrink(wizard, glow, updatePassThrough); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT3, () => { if (PANEL.keys) PANEL.keys.get(KeyCodes.KEY_DIGIT3)?.(); else drinkNightsight(secrets); });
  // ANCHOR_END: key_potions
  // ANCHOR: key_restart
  // R starts the tower over from the beginning, at any time
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => restart(thisLevel));
  // ANCHOR_END: key_restart

  // The HUD
  hudText(0.3, 0.1, 20, "#f2c14e", () => floor.name);
  // ANCHOR: hud_bag
  hudText(4.2, 0.1, 18, "#ffffff", () => `herb ${s.bag.herb}  mushroom ${s.bag.mushroom}  feather ${s.bag.feather}  crystal ${s.bag.crystal}${s.bag.bell ? "  + bell" : ""}`);
  hudText(10.5, 8.55, 18, "#f2c14e", () => PROMPT.get());
  // ANCHOR_END: hud_bag
  // ANCHOR: hud_potions
  hudText(0.3, 8.55, 18, "#6bd6ff", () => `1: Levitation x${s.potions.levitation}   2: Shrink x${s.potions.shrink}   3: Night-sight x${s.potions.nightsight}` + (stage.score.counters.get("levitating") > 0 ? "   (floating!)" : "") + (stage.score.counters.get("shrunk") > 0 ? "   (tiny!)" : ""));
  // ANCHOR_END: hud_potions
  // ANCHOR: hud_restart
  hudText(13.4, 0.1, 16, "#aab3c5", () => "R: start over");
  // ANCHOR_END: hud_restart

  // ANCHOR: win
  // The roof hatch (a `GoalBehavior`) wins the level when the wizard reaches it, so there's no win condition to write
  stage.score.winSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "You reached the roof!", prompt: "Click or press Enter to climb again", next: () => restart(thisLevel), background: "#0d0b16ee", titleColor: "#f2c14e" });
  // ANCHOR_END: win

  return { s, floor, floorNum, near, secrets };
}

/** What a solid 1x1 tile can look like: a wall, a pit, a mouse hole, a bookshelf */
export type Look = AppearanceComponent[];

/**
 * The picture of a plain square tile
 *
 * @param fill The HTML hex color of the middle
 * @param line The HTML hex color of the edge
 */
function tileLook(fill: string, line: string): Look {
  return [new FilledBox({ width: 1, height: 1, fillColor: fill, lineWidth: 0.04, lineColor: line })];
}

/** The picture of a wall */
export function wallLook(): Look {
  return tileLook("#4a4466", "#35304d");
}

/** The picture of a pit */
export function pitLook(): Look {
  return tileLook("#07060c", "#2a2640");
}

/** The picture of a mouse hole: a wall with a hole in it */
export function holeLook(): Look {
  const look = wallLook();
  look.push(new FilledRoundedBox({ width: 0.4, height: 0.5, radius: 0.18, fillColor: "#07060c", offset: { dx: 0, dy: 0.2 } }));
  return look;
}

/** The picture of a bookshelf: a brown tile with two colored shelves */
export function shelfLook(): Look {
  const look = tileLook("#6b4a2b", "#3d2a18");
  look.push(new FilledBox({ width: 0.8, height: 0.12, fillColor: "#c94c4c", offset: { dx: 0, dy: -0.2 } }));
  look.push(new FilledBox({ width: 0.8, height: 0.12, fillColor: "#4c7fc9", offset: { dx: 0, dy: 0.15 } }));
  return look;
}

/**
 * A 1x1 solid tile
 *
 * @param x             The x coordinate of the center of the tile
 * @param y             The y coordinate of the center of the tile
 * @param look          What the tile looks like
 * @param passThroughId Numbers for the pass-through rule, if any
 * @param extra         Any other behaviors to give the tile
 * @returns             The tile
 */
export function tile(x: number, y: number, look: Look, passThroughId?: number[], extra: Behavior[] = []) {
  return new Actor({
    appearance: look,
    rigidBody: new BoxBody({ cx: x, cy: y, width: 1, height: 1 }, { passThroughId }),
    behaviors: [new SolidBehavior(), ...extra],
  });
}

/**
 * A flight of stairs, which calls `go` when the wizard steps on it
 *
 * @param x  The x coordinate of the center of the stairs
 * @param y  The y coordinate of the center of the stairs
 * @param up Is it a flight going up?
 * @param go What to do when the wizard steps on the stairs
 */
export function stairs(x: number, y: number, up: boolean, go: () => void) {
  new Actor({
    appearance: stairsLook(up),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.8, height: 0.8 }),
    behaviors: new TouchPlateBehavior({ onEnter: go }),
  });
}

/**
 * The picture of a flight of stairs: three steps, each narrower than the last
 *
 * @param up Is it a flight going up?
 */
function stairsLook(up: boolean): Look {
  const look: Look = [];
  for (let i = 0; i < 3; i++) {
    look.push(new FilledBox({ width: 0.8 - i * 0.2, height: 0.18, fillColor: up ? "#c9b27a" : "#8a7a55", offset: { dx: 0, dy: (up ? -1 : 1) * (i * 0.25 - 0.25) } }));
  }
  return look;
}

/**
 * The picture of an ingredient (or the bell)
 *
 * @param what Which one
 */
export function itemLook(what: Ingredient | "bell"): Look {
  const colors = { herb: "#58c248", mushroom: "#d9534f", feather: "#f2f2f2", crystal: "#6bd6ff", bell: "#c0c0c0" };
  if (what == "bell") {
    return [new FilledPolygon({ vertices: [{ x: -0.2, y: 0.18 }, { x: -0.12, y: -0.15 }, { x: 0.12, y: -0.15 }, { x: 0.2, y: 0.18 }], fillColor: colors.bell, lineWidth: 0.03, lineColor: "#777777" })];
  }
  return [new FilledCircle({ radius: 0.2, fillColor: colors[what], lineWidth: 0.04, lineColor: "#00000088" })];
}

/** The picture of the cauldron: a dark pot with green brew in it */
export function cauldronLook(): Look {
  return [new FilledCircle({ radius: 0.42, fillColor: "#2b2b2b", lineWidth: 0.06, lineColor: "#777777" }), new FilledCircle({ radius: 0.28, fillColor: "#6fdc6f" })];
}

/** The picture of the cat: a dark head, two ears, and yellow eyes */
export function catLook(): Look {
  return [
    new FilledCircle({ radius: 0.32, fillColor: "#2b2b2b" }),
    new FilledPolygon({ vertices: [{ x: -0.3, y: -0.15 }, { x: -0.2, y: -0.45 }, { x: -0.05, y: -0.25 }], fillColor: "#2b2b2b" }),
    new FilledPolygon({ vertices: [{ x: 0.3, y: -0.15 }, { x: 0.2, y: -0.45 }, { x: 0.05, y: -0.25 }], fillColor: "#2b2b2b" }),
    new FilledCircle({ radius: 0.06, fillColor: "#f2d03b", offset: { dx: -0.12, dy: -0.05 } }),
    new FilledCircle({ radius: 0.06, fillColor: "#f2d03b", offset: { dx: 0.12, dy: -0.05 } }),
  ];
}

/** The picture of the roof hatch: a gold square that says ROOF */
export function hatchLook(): Look {
  return [new FilledRoundedBox({ width: 0.9, height: 0.9, radius: 0.1, fillColor: "#f2c14e", lineWidth: 0.06, lineColor: "#8a6a1c" }), new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#3d2a00" }, "ROOF")];
}

/**
 * Scenery: a tile that nothing collides with
 *
 * @param x    The x coordinate of the center of the tile
 * @param y    The y coordinate of the center of the tile
 * @param w    The width of the tile
 * @param h    The height of the tile
 * @param fill The HTML hex color of the middle
 * @param line The HTML hex color of the edge
 */
export function deco(x: number, y: number, w: number, h: number, fill: string, line: string) {
  new Actor({
    appearance: new FilledBox({ width: w, height: h, fillColor: fill, lineWidth: 0.05, lineColor: line, z: -1 }),
    rigidBody: new BoxBody({ cx: x, cy: y, width: w, height: h }, { collisionsEnabled: false }),
  });
}

