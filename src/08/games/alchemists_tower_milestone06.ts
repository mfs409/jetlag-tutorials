import { Actor, BoxBody, CircleBody, CollectableBehavior, FilledCircle, FilledRoundedBox, GoalBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, Scene, SolidBehavior, stage, TextSprite } from "jetlag2d";
import { nextLevel, switchToLevel } from "../common/common";
import { NEAR, FLOORS, RECIPES, CAT, Recipe, Ingredient, TOWER, PANEL, closePanel, NUMBER_KEYS, brew, showPrompt, startTower, tile, stairs, wallLook, pitLook, holeLook, shelfLook, itemLook, cauldronLook, catLook, hatchLook, deco } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * MILESTONE 6 for The Alchemist's Tower: the cat answers.  The comments say what each remaining piece needs.
 */

/** Build one floor of the tower */
function builder() {
  // The state, the wizard, the keys, and the HUD come from `helpers.ts`.
  const { s, floor, floorNum, near, secrets } = startTower(builder, updatePassThrough);

  // ANCHOR: floor_panel
  // Arriving on a floor shows its name, and the world waits until Esc is pressed
  stage.requestOverlay((overlay: Scene) => panel(overlay, floor.name, [floorNum < FLOORS.length ? "Find the stairs up." : "Find the hatch to the roof."], new Map()));
  // ANCHOR_END: floor_panel

  // ANCHOR: legend
  // The map is a grid of characters.  This visits every cell, and a `switch` says
  // what to build for each character.  A character that isn't listed (like a
  // space) builds nothing.
  for (let r = 0; r < floor.map.length; r++) {
    for (let c = 0; c < floor.map[r].length; c++) {
      const x = c + 0.5, y = r + 0.5;
      // ANCHOR: legend_key
      // A name that is different for every cell, so that a picked-up item can be remembered
      const key = `${floorNum}:${r}:${c}`;
      // ANCHOR_END: legend_key
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
        case "E":
          new Actor({
            appearance: hatchLook(),
            rigidBody: new BoxBody({ cx: x, cy: y, width: 0.9, height: 0.9 }, { collisionsEnabled: false }),
            behaviors: new GoalBehavior({ onArrival: () => { stage.score.winLevel(); return true; } }),
          });
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

  // ANCHOR: cauldron
  // Generic crafting: it knows nothing about any particular recipe.  It lists the
  // recipes that the wizard knows, and a recipe that the bag can pay for gets a number key.
  // ANCHOR: open_cauldron
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
        keys.set(NUMBER_KEYS[i], () => {
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
  // ANCHOR_END: open_cauldron

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
      keys.set(NUMBER_KEYS[i], () => {
        reply.effect?.();
        stage.clearOverlay();
        if (reply.next) openCat(reply.next); else closePanel();
      });
    }
    panel(overlay, "The Cat", lines, keys);
  });

  // ANCHOR_END: cat
}

// ANCHOR: item_helper
/** An ingredient (or the bell) on the floor, which goes in the bag when touched.  One that was already picked up doesn't come back. */
function item(x: number, y: number, key: string, what: Ingredient | "bell") {
  const s = TOWER.get();
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
}
// ANCHOR_END: item_helper

// ANCHOR: panel
/**
 * Panels.  A panel is an overlay, which pauses the world.  It has a title, some lines of text, and some keys that do things
 * while it's open.
 */
function panel(overlay: Scene, title: string, lines: string[], keys: Map<KeyCodes, () => void>) {
  PANEL.keys = keys;
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
}
// ANCHOR_END: panel

// ANCHOR: can_brew
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
// ANCHOR_END: can_brew

// ANCHOR: pass_through
/**
 * Work out which kinds of tile the wizard can pass through, from the potions that are working right now, and show a glow while levitating
 *
 * @param _wizard The wizard
 * @param glow    The glow around the wizard
 */
function updatePassThrough(_wizard: Actor, glow: FilledCircle) {
  // TODO (Potions): Give the wizard (`_wizard.rigidBody.passThroughId`) a list of numbers: 1 if the "levitating" counter is more than zero (pits are 1), and 2 if the
  // "shrunk" counter is (mouse holes are 2).  Rename `_wizard` when you use it.
  glow.fillColor = stage.score.counters.get("levitating") > 0 ? "#6bd6ff44" : "#00000000";
}
// ANCHOR_END: pass_through

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
