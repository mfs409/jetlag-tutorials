import { Actor, AppearanceComponent, Behavior, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, initializeAndLaunch, JetLagGameConfig, KeyCodes, LevelValue, PlayerControlBehavior, ProximityBehavior, Scene, SessionValue, SolidBehavior, stage, TextSprite, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { arrivalCell, generateFloor } from "./floor_generator";
import { currentLevel, hudText, nextLevel, switchToLevel } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * The Endless Stair: the Alchemist's Tower, with floors that are made up by
 * a generator, so the tower has no top, and everyone gets the same floors on
 * the same day.  (The original text follows.)
 *
 * The Alchemist's Tower: climb four floors to the roof.  Every floor is
 * just a grid of characters, turned into actors by a `switch`.  Gather
 * ingredients, brew potions at a cauldron, and drink them (1/2/3) to change
 * what the map's tiles mean: Levitation floats you over pits, Shrink fits you
 * through mouse holes, and Night-sight reveals walls that aren't walls.
 *
 * Recipes are data, and so is the cat's conversation.  Walk up to the
 * cauldron, the bookshelf, or the cat and press E.  Press R to start over.
 */

// ---------------------------------------------------------------------------
// The data: floors, recipes, and a conversation
// ---------------------------------------------------------------------------

/** One floor of the tower: its name, the recipe that its bookshelf teaches (or none), and its map */
interface Floor { name: string; book: Potion | ""; map: string[]; }

/** The four kinds of ingredient */
type Ingredient = "herb" | "mushroom" | "feather" | "crystal";

/** The three potions */
type Potion = "levitation" | "shrink" | "nightsight";

/** A recipe: what it is called, which key drinks it, what goes into it, and how many seconds it lasts */
interface Recipe { label: string; key: string; inputs: Ingredient[]; seconds: number; }

// ANCHOR: recipes
/** The recipes: pure data, read by generic crafting code */
const RECIPES: { levitation: Recipe, shrink: Recipe, nightsight: Recipe } = {
  levitation: { label: "Levitation", key: "1", inputs: ["herb", "feather"], seconds: 8 },
  shrink: { label: "Shrink", key: "2", inputs: ["mushroom", "herb"], seconds: 10 },
  nightsight: { label: "Night-sight", key: "3", inputs: ["crystal", "mushroom"], seconds: 0 },
};
// ANCHOR_END: recipes

// ANCHOR: cat_data
/** The cat's conversation: each node has some text (a `\n` starts a new line) and numbered replies */
interface Node { text: string; replies: { say: string, next: string, effect?: () => void }[]; }
const CAT: { [id: string]: Node } = {
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

// ---------------------------------------------------------------------------
// State that survives moving between floors (session storage)
// ---------------------------------------------------------------------------

// ANCHOR: tower_state
/** Everything that the wizard has and knows.  It lasts for the whole climb. */
class TowerState {
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
const TOWER = new SessionValue<TowerState>("tower", () => new TowerState());
// ANCHOR_END: tower_state

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------

/** Build one floor of the tower */
function builder() {
  DebugToggle.enable();
  const floorNum = currentLevel();
  // ANCHOR: generated_floor
  // The floor is made up, from the day's number: the same day always gives the same tower
  const today = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const generated = generateFloor(floorNum, today);
  const floor: Floor = { name: `Floor ${floorNum}`, book: "", map: generated.map };
  // ANCHOR_END: generated_floor
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
  // The keys of the panel that is open, if one is.  While it is open, 1, 2 and 3 choose from it
  let panelKeys: Map<KeyCodes, () => void> | undefined;

  // ANCHOR: arrival
  // The first floor has no stairs down: the wizard starts where the map has an @
  let start = { x: 1.5, y: 1.5 };
  for (let r = 0; r < floor.map.length; r++) {
    const c = floor.map[r].indexOf("@");
    if (c >= 0) start = { x: c + 0.5, y: r + 0.5 };
  }
  // Otherwise they arrive next to whichever stairs they came through
  const arrival = arrivalCell(floor.map, s.arrive == "down" ? ">" : "<");
  if (arrival) start = { x: arrival[1] + 0.5, y: arrival[0] + 0.5 };
  // ANCHOR_END: arrival

  // ANCHOR: item_helper
  /** An ingredient (or the bell) on the floor, which goes in the bag when touched.  One that was already picked up doesn't come back. */
  const item = (x: number, y: number, key: string, what: Ingredient | "bell") => {
    if (s.taken.includes(key)) return;
    new Actor({
      appearance: itemLook(what),
      rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.22 }),
      behaviors: new CollectableBehavior({
        onCollect: () => {
          s.bag[what] += 1;
          s.taken.push(key);
          showPrompt(`Got a ${what}`);
          return true;
        },
      }),
    });
  };
  // ANCHOR_END: item_helper

  // ANCHOR: near_helper
  /** Something to walk up to: while the wizard is close, show "E: name", and E opens it */
  const NEAR = 1.3;
  const near = (name: string, open: () => void) => new ProximityBehavior({
    onEnter: (_s: Actor, o: Actor) => { if (o == wizard) { nearby = { name, open }; showPrompt(`E: ${name}`); } },
    onExit: (_s: Actor, o: Actor) => { if (o == wizard && nearby?.name == name) { nearby = undefined; showPrompt(""); } },
  });
  // ANCHOR_END: near_helper

  // ANCHOR: legend
  // The map is a grid of characters.  This visits every cell, and a `switch` says
  // what to build for each character.  A character that isn't listed (like a
  // space) builds nothing.
  for (let r = 0; r < floor.map.length; r++) {
    for (let c = 0; c < floor.map[r].length; c++) {
      const x = c + 0.5, y = r + 0.5;
      // A name that is different for every cell, so that a picked-up item can be remembered
      const key = `${floorNum}:${r}:${c}`;
      switch (floor.map[r][c]) {
        // ANCHOR: legend_walls
        case "#":
          tile(x, y, wallLook());
          break;
        // ANCHOR_END: legend_walls
        // ANCHOR: legend_stairs
        case "<":
          stairs(x, y, false, () => { s.arrive = "down"; switchToLevel(builder, floorNum - 1); });
          break;
        case ">":
          stairs(x, y, true, () => { s.arrive = "up"; nextLevel(builder); });
          break;
        // ANCHOR_END: legend_stairs
        // ANCHOR: legend_items
        case "h":
          item(x, y, key, "herb");
          break;
        case "m":
          item(x, y, key, "mushroom");
          break;
        case "f":
          item(x, y, key, "feather");
          break;
        case "c":
          item(x, y, key, "crystal");
          break;
        case "b":
          if (!s.gaveBell) item(x, y, key, "bell");
          break;
        // ANCHOR_END: legend_items
        // ANCHOR: legend_furniture
        case "K": {
          const cauldron = new Actor({
            appearance: cauldronLook(),
            rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.42 }),
            behaviors: [new SolidBehavior(), near("brew at the cauldron", () => openCauldron())],
          });
          cauldron.rigidBody.proximityRadius = NEAR;
          break;
        }
        case "B": {
          const shelf = tile(x, y, shelfLook(), undefined, [near("read the bookshelf", () => openBook())]);
          shelf.rigidBody.proximityRadius = NEAR;
          break;
        }
        // ANCHOR_END: legend_furniture
        // ANCHOR: legend_cat
        case "C": {
          const cat = new Actor({
            appearance: catLook(),
            rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.32 }),
            behaviors: [new SolidBehavior(), near("talk to the cat", () => openCat())],
          });
          cat.rigidBody.proximityRadius = NEAR;
          break;
        }
        // ANCHOR_END: legend_cat
        // ANCHOR: legend_hazards
        // A pit, a mouse hole, and a secret wall are solid, unless the wizard shares
        // a pass-through number with them (pits are 1, and mouse holes are 2)
        case "P":
          tile(x, y, pitLook(), [1]);
          break;
        case "o":
          tile(x, y, holeLook(), [2]);
          break;
        case "S":
          if (s.nightsight) deco(x, y, 1, 1, "#2a2640", "#6bd6ff");
          else secrets.push(tile(x, y, wallLook()));
          break;
        // ANCHOR_END: legend_hazards
      }
    }
  }
  // ANCHOR_END: legend

  // The wizard
  const glow = new FilledCircle({ radius: 0.45, fillColor: "#00000000" });
  const wizard = new Actor({
    appearance: [glow, new FilledCircle({ radius: 0.3, fillColor: "#9b6bd6", lineWidth: 0.05, lineColor: "#4d2f73" }), new FilledPolygon({ vertices: [{ x: -0.28, y: -0.1 }, { x: 0, y: -0.55 }, { x: 0.28, y: -0.1 }], fillColor: "#4d2f73" })],
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
  // ANCHOR: key_interact
  // Keys are for the whole game, and an open panel is on top of it, so each key
  // that a panel uses first asks whether a panel is open.  E does nothing then.
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_E, () => { if (!panelKeys) nearby?.open(); });
  // ANCHOR_END: key_interact
  // ANCHOR: key_potions
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT1, () => { if (panelKeys) panelKeys.get(KeyCodes.KEY_DIGIT1)?.(); else drinkLevitation(wizard, glow, floor, start); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT2, () => { if (panelKeys) panelKeys.get(KeyCodes.KEY_DIGIT2)?.(); else drinkShrink(wizard, glow); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT3, () => { if (panelKeys) panelKeys.get(KeyCodes.KEY_DIGIT3)?.(); else drinkNightsight(secrets); });
  // ANCHOR_END: key_potions
  // Esc closes a panel, and R starts the tower over from the beginning, at any time
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_ESCAPE, () => { if (panelKeys) closePanel(); });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, restart);

  // ANCHOR: panel
  // Panels.  A panel is an overlay, which pauses the world.  It has a title, some
  // lines of text, and some keys that do things while it's open.
  const closePanel = () => { stage.clearOverlay(); panelKeys = undefined; };
  const panel = (overlay: Scene, title: string, lines: string[], keys: Map<KeyCodes, () => void>) => {
    panelKeys = keys;
    new Actor({
      appearance: new FilledRoundedBox({ width: 12, height: 6.4, radius: 0.4, fillColor: "#2a2640f2", lineWidth: 0.08, lineColor: "#9b6bd6" }),
      rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 12, height: 6.4 }, { scene: overlay }),
    });
    new Actor({
      appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 30, color: "#f2c14e" }, title),
      rigidBody: new BoxBody({ cx: 2.6, cy: 1.8, width: 0.1, height: 0.1 }, { scene: overlay }),
    });
    for (let i = 0; i < lines.length; i++) {
      new Actor({
        appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 22, color: "#ffffff" }, lines[i]),
        rigidBody: new BoxBody({ cx: 2.6, cy: 2.8 + i * 0.6, width: 0.1, height: 0.1 }, { scene: overlay }),
      });
    }
    new Actor({
      appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 18, color: "#aab3c5" }, "Esc to close"),
      rigidBody: new BoxBody({ cx: 2.6, cy: 7.1, width: 0.1, height: 0.1 }, { scene: overlay }),
    });
  };
  // ANCHOR_END: panel

  // ANCHOR: floor_panel
  // Arriving on a floor shows its name, and the world waits until Esc is pressed
  stage.requestOverlay((overlay: Scene) => panel(overlay, floor.name, ["Find the stairs up.", `(Today's floor ${floorNum}, made in ${generated.tries} ${generated.tries == 1 ? "try" : "tries"}.)`], new Map()));
  // ANCHOR_END: floor_panel

  // ANCHOR: cauldron
  const numberKeys = [KeyCodes.KEY_DIGIT1, KeyCodes.KEY_DIGIT2, KeyCodes.KEY_DIGIT3];

  // Generic crafting: it knows nothing about any particular recipe.  It lists the
  // recipes that the wizard knows, and a recipe that the bag can pay for gets a number key.
  const openCauldron = (note = "") => stage.requestOverlay((overlay: Scene) => {
    const keys = new Map<KeyCodes, () => void>();
    const lines: string[] = [];
    if (s.known.length == 0) lines.push("You don't know any recipes yet.  Try a bookshelf.");
    for (let i = 0; i < s.known.length; i++) {
      const potion = s.known[i];
      const recipe = RECIPES[potion];
      const ok = canBrew(recipe);
      lines.push(`${i + 1}: ${recipe.label}  (${recipe.inputs.join(" + ")})  ${ok ? "" : "(missing ingredients)"}`);
      if (ok) {
        keys.set(numberKeys[i], () => {
          brew(recipe);
          s.potions[potion] += 1;
          stage.clearOverlay();
          openCauldron(`You brewed ${recipe.label}!  (press ${recipe.key} to drink it)`);
        });
      }
    }
    if (note) lines.push("", note);
    panel(overlay, "The Cauldron", lines, keys);
  });

  const openBook = () => stage.requestOverlay((overlay: Scene) => {
    let lines: string[];
    if (floor.book != "") {
      const recipe = RECIPES[floor.book];
      if (!s.known.includes(floor.book)) s.known.push(floor.book);
      lines = [`You learn the recipe for ${recipe.label}:`, `     ${recipe.inputs.join(" + ")}`, "", floor.book == "levitation" ? "It lets you float over pits, for a little while." : "It shrinks you small enough for a mouse hole, for a little while."];
    } else {
      lines = ["The pages here are blank.", "Someone in this tower knows more than the books do..."];
    }
    panel(overlay, "The Bookshelf", lines, new Map());
  });

  // ANCHOR_END: cauldron

  // ANCHOR: cat
  // Generic dialogue: it just walks the tree of nodes
  const openCat = (id?: string) => stage.requestOverlay((overlay: Scene) => {
    const nodeId = id ?? (s.gaveBell ? "after" : s.bag.bell > 0 ? "bell" : "start");
    const node = CAT[nodeId];
    const keys = new Map<KeyCodes, () => void>();
    const lines = node.text.split("\n");
    lines.push("");
    for (let i = 0; i < node.replies.length; i++) {
      const reply = node.replies[i];
      lines.push(`${i + 1}: ${reply.say}`);
      keys.set(numberKeys[i], () => {
        reply.effect?.();
        stage.clearOverlay();
        if (reply.next) openCat(reply.next); else closePanel();
      });
    }
    panel(overlay, "The Cat", lines, keys);
  });

  // ANCHOR_END: cat

  // The HUD
  hudText(0.3, 0.1, 20, "#f2c14e", () => floor.name);
  // ANCHOR: hud_bag
  hudText(4.2, 0.1, 18, "#ffffff", () => `herb ${s.bag.herb}  mushroom ${s.bag.mushroom}  feather ${s.bag.feather}  crystal ${s.bag.crystal}${s.bag.bell ? "  + bell" : ""}`);
  hudText(10.5, 8.55, 18, "#f2c14e", () => PROMPT.get());
  // ANCHOR_END: hud_bag
  // ANCHOR: hud_potions
  hudText(0.3, 8.55, 18, "#6bd6ff", () => `1: Levitation x${s.potions.levitation}   2: Shrink x${s.potions.shrink}   3: Night-sight x${s.potions.nightsight}` + (stage.score.counters.get("levitating") > 0 ? "   (floating!)" : "") + (stage.score.counters.get("shrunk") > 0 ? "   (tiny!)" : ""));
  // ANCHOR_END: hud_potions
  hudText(13.4, 0.1, 16, "#aab3c5", () => "R: start over");
}

/** Start the tower over from floor 1.  It works at any time, which matters, because a wizard can get stuck. */
function restart() {
  stage.clearOverlay();
  TOWER.clear();
  switchToLevel(builder, 1);
}

// ---------------------------------------------------------------------------
// Crafting and potions
// ---------------------------------------------------------------------------

/**
 * Can the bag pay for a recipe?  Each ingredient that the recipe lists is
 * taken out of a copy of the bag, one at a time, and the answer is no if any
 * count goes below zero.  A recipe that needs two herbs needs two in the bag.
 *
 * @param recipe The recipe
 */
function canBrew(recipe: Recipe) {
  const left = { ...TOWER.get().bag };
  for (const ingredient of recipe.inputs) {
    left[ingredient] -= 1;
    if (left[ingredient] < 0) return false;
  }
  return true;
}

/**
 * Take what a recipe needs out of the bag.  Call `canBrew` first.
 *
 * @param recipe The recipe
 */
function brew(recipe: Recipe) {
  const bag = TOWER.get().bag;
  for (const ingredient of recipe.inputs) bag[ingredient] -= 1;
}

/** The message in the corner of the HUD.  Level storage is forgotten when a floor is built. */
const PROMPT = new LevelValue<string>("prompt", () => "");

/**
 * Show a short message in the corner of the HUD, until the next one
 *
 * @param text The message
 */
function showPrompt(text: string) {
  PROMPT.set(text);
}

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

/**
 * Work out which kinds of tile the wizard can pass through, from the potions
 * that are working right now, and show a glow while levitating
 *
 * @param wizard The wizard
 * @param glow   The glow around the wizard
 */
function updatePassThrough(wizard: Actor, glow: FilledCircle) {
  const ids: number[] = [];
  if (stage.score.counters.get("levitating") > 0) ids.push(1);
  if (stage.score.counters.get("shrunk") > 0) ids.push(2);
  wizard.rigidBody.passThroughId = ids;
  glow.fillColor = stage.score.counters.get("levitating") > 0 ? "#6bd6ff44" : "#00000000";
}

/**
 * Drink Levitation: for a while, the wizard can pass over pits.  When it wears
 * off over a pit, the wizard falls, and starts the floor again.
 *
 * @param wizard The wizard
 * @param glow   The glow around the wizard
 * @param floor  The floor that the wizard is on
 * @param start  Where the wizard begins the floor
 */
function drinkLevitation(wizard: Actor, glow: FilledCircle, floor: Floor, start: { x: number, y: number }) {
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

/**
 * Drink Shrink: for a while, the wizard is half the size, and can pass through
 * mouse holes.
 *
 * @param wizard The wizard
 * @param glow   The glow around the wizard
 */
function drinkShrink(wizard: Actor, glow: FilledCircle) {
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

/**
 * Drink Night-sight: from now on, the secret walls on this floor, and every
 * floor after it, are doors that can be walked through.
 *
 * @param secrets The secret walls on this floor
 */
function drinkNightsight(secrets: Actor[]) {
  if (!useUp("nightsight")) return;
  TOWER.get().nightsight = true;
  for (const secret of secrets) {
    secret.enabled = false;
    const c = secret.rigidBody.getCenter();
    deco(c.x, c.y, 1, 1, "#2a2640", "#6bd6ff");
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers, for the map to use
// ---------------------------------------------------------------------------

/** What a solid 1x1 tile can look like: a wall, a pit, a mouse hole, a bookshelf */
type Look = AppearanceComponent[];

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
function wallLook(): Look {
  return tileLook("#4a4466", "#35304d");
}

/** The picture of a pit */
function pitLook(): Look {
  return tileLook("#07060c", "#2a2640");
}

/** The picture of a mouse hole: a wall with a hole in it */
function holeLook(): Look {
  const look = wallLook();
  look.push(new FilledRoundedBox({ width: 0.4, height: 0.5, radius: 0.18, fillColor: "#07060c", offset: { dx: 0, dy: 0.2 } }));
  return look;
}

/** The picture of a bookshelf: a brown tile with two colored shelves */
function shelfLook(): Look {
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
function tile(x: number, y: number, look: Look, passThroughId?: number[], extra: Behavior[] = []) {
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
function stairs(x: number, y: number, up: boolean, go: () => void) {
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
function itemLook(what: Ingredient | "bell"): Look {
  const colors = { herb: "#58c248", mushroom: "#d9534f", feather: "#f2f2f2", crystal: "#6bd6ff", bell: "#c0c0c0" };
  if (what == "bell") {
    return [new FilledPolygon({ vertices: [{ x: -0.2, y: 0.18 }, { x: -0.12, y: -0.15 }, { x: 0.12, y: -0.15 }, { x: 0.2, y: 0.18 }], fillColor: colors.bell, lineWidth: 0.03, lineColor: "#777777" })];
  }
  return [new FilledCircle({ radius: 0.2, fillColor: colors[what], lineWidth: 0.04, lineColor: "#00000088" })];
}

/** The picture of the cauldron: a dark pot with green brew in it */
function cauldronLook(): Look {
  return [new FilledCircle({ radius: 0.42, fillColor: "#2b2b2b", lineWidth: 0.06, lineColor: "#777777" }), new FilledCircle({ radius: 0.28, fillColor: "#6fdc6f" })];
}

/** The picture of the cat: a dark head, two ears, and yellow eyes */
function catLook(): Look {
  return [
    new FilledCircle({ radius: 0.32, fillColor: "#2b2b2b" }),
    new FilledPolygon({ vertices: [{ x: -0.3, y: -0.15 }, { x: -0.2, y: -0.45 }, { x: -0.05, y: -0.25 }], fillColor: "#2b2b2b" }),
    new FilledPolygon({ vertices: [{ x: 0.3, y: -0.15 }, { x: 0.2, y: -0.45 }, { x: 0.05, y: -0.25 }], fillColor: "#2b2b2b" }),
    new FilledCircle({ radius: 0.06, fillColor: "#f2d03b", offset: { dx: -0.12, dy: -0.05 } }),
    new FilledCircle({ radius: 0.06, fillColor: "#f2d03b", offset: { dx: 0.12, dy: -0.05 } }),
  ];
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
function deco(x: number, y: number, w: number, h: number, fill: string, line: string) {
  new Actor({
    appearance: new FilledBox({ width: w, height: h, fillColor: fill, lineWidth: 0.05, lineColor: line, z: -1 }),
    rigidBody: new BoxBody({ cx: x, cy: y, width: w, height: h }, { collisionsEnabled: false }),
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
