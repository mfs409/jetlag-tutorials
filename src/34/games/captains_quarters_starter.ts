import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, KeyCodes, stage, TextSprite, ZIndex } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    imageNames: ["pirate.json"],
  };
}

/**
 * STARTER CODE for Captain's Quarters.
 *
 * A bare cabin, with a window, and a pirate who can walk around it.  The
 * catalog of things for sale is here, with the art for each one drawn from
 * shapes, but nothing can be bought yet.  The comments below say what each
 * stage adds.
 *
 * TODO (The shop): a shop with three pages that lists what's for sale, and lets you buy something and put it anywhere.
 *
 * TODO (Where things go): a grid, rules for the floor, the wall, and desks, and a preview that shows whether it fits.
 *
 * TODO (Rearranging): picking something up, turning it around, selling it, and putting it back.
 *
 * TODO (Remembering): the room saved after every change, and rebuilt when the page loads.
 *
 * TODO (Living in it): sleeping in the bed to earn doubloons for how cozy the room is, a chair to sit in, lamps that glow at night, and a day that passes.
 *
 * TODO (Finishing touches): things that drop in with dust, sounds, music, and a click to begin.
 */

// ---------------------------------------------------------------------------
// The room, and the things that go in it
// ---------------------------------------------------------------------------

/** The inside of the cabin, in meters: where the walls, the ceiling, and the floor are */
const ROOM = { left: 1, right: 15, ceiling: 1.5, floor: 7.2 };
/** The window, which wall hangings can't cover */
const WINDOW = { x: 12.2, y: 3.5, w: 2.6, h: 2.0 };
/** Things are placed on a grid this big, in meters */
export const GRID = 0.5;

/** Where a kind of thing can go */
type Layer = "floor" | "rug" | "wall" | "surface";

/** One kind of thing that you can buy */
interface ItemDef {
  /** A short name, used to find it, and to save it */
  id: string;
  /** What it's called */
  name: string;
  /** Which page of the shop it's on */
  tab: "furniture" | "wall" | "tabletop";
  /**
   * Where it goes: on the floor, flat on the floor like a rug, hung on the
   * wall, or standing on a desk
   */
  layer: Layer;
  /** How big it is, in meters */
  w: number; h: number;
  /** What it costs, in doubloons */
  price: number;
  /** How much it adds to the room's coziness */
  cozy: number;
  /** Things can stand on it (a desk), you can sleep in it, sit in it, or light it */
  surface?: boolean; bed?: boolean; seat?: boolean; light?: boolean;
}

/** One thing that's in the room */
interface Placed {
  /** Which kind it is */
  def: ItemDef;
  /** Where its center is */
  x: number; y: number;
  /** Is it turned around, to face the other way? */
  flip: boolean;
  /** Is it lit?  (This only matters for lamps.) */
  on: boolean;
  /** What it looks like */
  actor: Actor;
}

/** Everything that's for sale */
export const ITEMS: ItemDef[] = [
  { id: "bed", name: "Bed", tab: "furniture", layer: "floor", w: 3.4, h: 1.3, price: 60, cozy: 6, bed: true },
  { id: "chair", name: "Chair", tab: "furniture", layer: "floor", w: 1.0, h: 1.6, price: 20, cozy: 2, seat: true },
  { id: "desk", name: "Desk", tab: "furniture", layer: "floor", w: 2.4, h: 1.3, price: 50, cozy: 3, surface: true },
  { id: "shelf", name: "Bookshelf", tab: "furniture", layer: "floor", w: 1.6, h: 2.8, price: 70, cozy: 4 },
  { id: "chest", name: "Sea Chest", tab: "furniture", layer: "floor", w: 1.5, h: 1.0, price: 45, cozy: 3, surface: true },
  { id: "lamp", name: "Floor Lamp", tab: "furniture", layer: "floor", w: 0.8, h: 3.0, price: 30, cozy: 3, light: true },
  { id: "plant", name: "Palm in a Pot", tab: "furniture", layer: "floor", w: 1.0, h: 1.6, price: 15, cozy: 2 },
  { id: "rug", name: "Rug", tab: "furniture", layer: "rug", w: 3.2, h: 0.2, price: 35, cozy: 4 },
  { id: "painting", name: "Little Painting", tab: "wall", layer: "wall", w: 1.3, h: 1.1, price: 25, cozy: 3 },
  { id: "seascape", name: "Big Seascape", tab: "wall", layer: "wall", w: 2.2, h: 1.5, price: 55, cozy: 5 },
  { id: "map", name: "Treasure Map", tab: "wall", layer: "wall", w: 1.8, h: 1.3, price: 40, cozy: 3 },
  { id: "wheel", name: "Ship's Wheel", tab: "wall", layer: "wall", w: 1.7, h: 1.7, price: 80, cozy: 4 },
  { id: "flag", name: "Jolly Roger", tab: "wall", layer: "wall", w: 1.2, h: 1.7, price: 20, cozy: 2 },
  { id: "tablelamp", name: "Table Lamp", tab: "tabletop", layer: "surface", w: 0.6, h: 1.0, price: 20, cozy: 2, light: true },
  { id: "books", name: "Stack of Books", tab: "tabletop", layer: "surface", w: 0.8, h: 0.5, price: 15, cozy: 2 },
  { id: "globe", name: "Globe", tab: "tabletop", layer: "surface", w: 0.7, h: 0.9, price: 35, cozy: 3 },
];

/**
 * Which z index each kind of thing is drawn at: wall hangings are behind
 * everything, then rugs, then furniture, and then things on a desk.
 *
 * @param layer The layer
 */
export const zOf = (layer: Layer): -2 | -1 | 0 | 1 => (layer == "wall" ? -2 : layer == "rug" ? -1 : layer == "floor" ? 0 : 1);

/**
 * What a kind of thing looks like, drawn from shapes.  Every shape's position
 * is measured from the center of the thing.
 *
 * @param id    Which kind of thing
 * @param flip  Draw it turned around?
 * @param z     The z index to draw it at
 * @param scale How big to draw it, where 1 is its real size
 */
export function art(id: string, flip: boolean, z: ZIndex, scale = 1) {
  const s = flip ? -1 : 1;
  const r = (x: number, y: number, w: number, h: number, fill: string, line?: string) => new FilledBox({ width: w * scale, height: h * scale, fillColor: fill, lineWidth: line ? 0.03 : undefined, lineColor: line, offset: { dx: x * s * scale, dy: y * scale }, z: z });
  const c = (x: number, y: number, rad: number, fill: string, line?: string) => new FilledCircle({ radius: rad * scale, fillColor: fill, lineWidth: line ? 0.03 : undefined, lineColor: line, offset: { dx: x * s * scale, dy: y * scale }, z: z });
  const p = (pts: number[][], fill: string, line?: string) => new FilledPolygon({ vertices: pts.map(([x, y]) => ({ x: x * s * scale, y: y * scale })), fillColor: fill, lineWidth: line ? 0.03 : undefined, lineColor: line, z: z });
  const wood = "#7a5632", dark = "#4a2f18", brass = "#e8c84a";
  switch (id) {
    case "bed": return [r(0, 0.3, 3.4, 0.45, wood, dark), r(-1.55, 0.55, 0.22, 0.2, dark), r(1.55, 0.55, 0.22, 0.2, dark), r(-1.65, -0.05, 0.22, 1.3, dark), r(0.05, -0.1, 3.0, 0.45, "#f0e6d0", "#b8a888"), r(0.55, -0.2, 2.0, 0.5, "#b8432f", "#7a2a1a"), r(0.55, -0.2, 2.0, 0.1, brass), r(-1.15, -0.32, 0.8, 0.3, "#ffffff", "#b8a888")];
    case "chair": return [r(0, 0.1, 0.95, 0.15, wood, dark), r(-0.4, 0.45, 0.12, 0.75, dark), r(0.4, 0.45, 0.12, 0.75, dark), r(-0.38, -0.4, 0.14, 1.2, wood, dark), r(-0.38, -0.7, 0.2, 0.2, brass)];
    case "desk": return [r(0, -0.5, 2.4, 0.22, wood, dark), r(-1.05, 0.15, 0.2, 1.1, dark), r(1.05, 0.15, 0.2, 1.1, dark), r(0.6, -0.05, 0.9, 0.7, wood, dark), r(0.6, -0.05, 0.12, 0.12, brass), r(0.6, 0.25, 0.9, 0.04, dark)];
    case "shelf": return [r(0, 0, 1.6, 2.8, wood, dark), r(0, -0.75, 1.4, 0.06, dark), r(0, 0.05, 1.4, 0.06, dark), r(0, 0.85, 1.4, 0.06, dark), r(-0.4, -1.1, 0.25, 0.55, "#b8432f"), r(-0.1, -1.05, 0.2, 0.65, "#3a6b9a"), r(0.25, -1.12, 0.3, 0.5, "#4a8a4a"), r(-0.3, -0.35, 0.3, 0.55, "#e8c84a"), r(0.2, -0.38, 0.25, 0.5, "#9b5de5"), r(-0.35, 0.5, 0.3, 0.55, "#3a6b9a"), r(0.1, 0.55, 0.35, 0.45, "#b8432f")];
    case "chest": return [r(0, 0.1, 1.5, 0.8, "#8a5a1a", dark), p([[-0.75, -0.3], [-0.6, -0.5], [0.6, -0.5], [0.75, -0.3]], "#a8702a", dark), r(0, 0.05, 1.5, 0.1, brass), r(0, 0.05, 0.18, 0.25, brass, dark)];
    case "lamp": return [r(0, 0.2, 0.12, 2.5, dark), r(0, 1.35, 0.6, 0.12, dark), p([[-0.35, -0.9], [0.35, -0.9], [0.22, -1.45], [-0.22, -1.45]], "#f6d98a", "#a67c10"), c(0, -1.15, 0.1, "#fff3c0")];
    case "plant": return [p([[-0.4, 0.2], [0.4, 0.2], [0.3, 0.8], [-0.3, 0.8]], "#b8432f", "#7a2a1a"), r(0, -0.05, 0.1, 0.5, "#4a7a2a"), p([[0, -0.2], [-0.7, -0.5], [-0.3, -0.1]], "#4cbf6a", "#2a6a3a"), p([[0, -0.2], [0.7, -0.5], [0.3, -0.1]], "#4cbf6a", "#2a6a3a"), p([[0, -0.3], [-0.4, -0.8], [-0.05, -0.55]], "#3aa85a", "#2a6a3a"), p([[0, -0.3], [0.4, -0.8], [0.05, -0.55]], "#3aa85a", "#2a6a3a")];
    case "rug": return [r(0, 0, 3.2, 0.2, "#8a2f2f", "#e8c84a"), r(0, 0, 2.6, 0.08, "#e8c84a")];
    case "painting": return [r(0, 0, 1.3, 1.1, "#8a5a1a", dark), r(0, 0, 1.05, 0.85, "#8fd3f4"), r(0, 0.22, 1.05, 0.4, "#3a6b9a"), c(0.25, -0.15, 0.13, "#ffe9a8")];
    case "seascape": return [r(0, 0, 2.2, 1.5, "#8a5a1a", dark), r(0, 0, 1.9, 1.2, "#6ab0e0"), r(0, 0.3, 1.9, 0.55, "#2f5a86"), p([[-0.6, 0.1], [0.0, 0.1], [-0.3, -0.35]], "#f4f1e0", "#888888"), r(-0.3, 0.15, 0.7, 0.08, "#7a5632"), c(0.6, -0.3, 0.17, "#ffe9a8")];
    case "map": return [r(0, 0, 1.8, 1.3, "#e8d4a0", "#a8884a"), p([[-0.6, -0.2], [-0.2, 0.2], [0.3, -0.1], [0.6, 0.3]], "#00000000", "#8a5a1a"), r(0.55, 0.3, 0.14, 0.04, "#b8221a"), r(0.55, 0.3, 0.04, 0.14, "#b8221a"), c(-0.55, -0.25, 0.1, "#3a6b9a")];
    case "wheel": return [c(0, 0, 0.85, "#00000000", "#7a5632"), c(0, 0, 0.6, "#00000000", "#7a5632"), r(0, 0, 0.1, 1.7, wood), r(0, 0, 1.7, 0.1, wood), p([[-0.6, -0.6], [-0.5, -0.65], [0.6, 0.6], [0.5, 0.65]], wood), p([[0.6, -0.6], [0.5, -0.65], [-0.6, 0.6], [-0.5, 0.65]], wood), c(0, 0, 0.16, brass, dark)];
    case "flag": return [r(-0.5, 0, 0.08, 1.7, dark), p([[-0.46, -0.8], [0.6, -0.65], [0.5, 0.2], [-0.46, 0.3]], "#222222", "#000000"), c(0.05, -0.2, 0.2, "#ffffff"), r(0.05, 0.05, 0.4, 0.07, "#ffffff")];
    case "tablelamp": return [r(0, 0.4, 0.4, 0.15, dark), r(0, 0.1, 0.1, 0.5, brass), p([[-0.28, -0.1], [0.28, -0.1], [0.18, -0.5], [-0.18, -0.5]], "#f6d98a", "#a67c10")];
    case "books": return [r(0, 0.17, 0.8, 0.14, "#3a6b9a", dark), r(0.05, 0.03, 0.7, 0.14, "#b8432f", dark), r(-0.03, -0.11, 0.6, 0.14, "#4cbf6a", dark)];
    case "globe": return [r(0, 0.38, 0.4, 0.1, dark), r(0, 0.28, 0.08, 0.2, brass), c(0, -0.05, 0.33, "#3a6b9a", dark), p([[-0.2, -0.15], [0, -0.3], [0.1, -0.05], [-0.1, 0.05]], "#4cbf6a"), p([[0.1, 0.05], [0.25, 0.0], [0.2, 0.2]], "#4cbf6a")];
  }
  return [];
}

/** The things that the cabin is saved as: how many doubloons, which day, and each thing and where it is */

/**
 * The pirate, who walks left and right, and stands still
 *
 * @param size  How big to draw the pirate
 * @param state A function that says which way the pirate faces, and whether it is walking
 * @returns     The sprite
 */
function pirateSprite(size: number, state: () => { face: "r" | "l", walking: boolean }) {
  const animations = new Map<AnimationState, AnimationSequence>();
  const faces = ["r", "l"] as const;
  for (const f of faces) {
    const e = f == "r";
    animations.set(e ? AnimationState.WALK_E : AnimationState.WALK_W, AnimationSequence.makeSimple({ timePerFrame: 80, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_walk_${f}_${i}.png`) }));
    animations.set(e ? AnimationState.IDLE_E : AnimationState.IDLE_W, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_${f}_0.png`] }));
  }
  const sprite = new AnimatedSprite({ width: size, height: size, z: 2, animations });
  // JetLag asks which animation to use when the state changes, and when we call `restartCurrentAnimation`
  sprite.stateSelector = () => {
    const { face, walking } = state();
    return walking ? (face == "r" ? AnimationState.WALK_E : AnimationState.WALK_W) : (face == "r" ? AnimationState.IDLE_E : AnimationState.IDLE_W);
  };
  return sprite;
}

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------

/** Build the cabin, and everything in it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#10243a";

  // --- What's in the room: the doubloons, the day, and the things --------------------------
  /** The doubloons, and the number of nights slept */
  const game = { coins: 120, day: 1 };

  // --- Small helpers --------------------------------------------------------------------------
  /**
   * Some text on the HUD
   *
   * @param x      The x coordinate of the text
   * @param y      The y coordinate of the middle of the text
   * @param text   The words, or a function that makes them
   * @param size   The font size
   * @param color  The HTML hex color
   * @param center Is `x` the middle of the text?  If not, it's the left edge.
   */
  const label = (x: number, y: number, text: string | (() => string), size: number, color: string, center = false) => new Actor({
    appearance: new TextSprite({ center, face: "Roboto Black", size, color, strokeColor: "#000000", strokeWidth: 3 }, text),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  // --- The cabin ---------------------------------------------------------------------------------
  /**
   * A rectangle of the cabin, which is only for looking at
   *
   * @param cx    The x coordinate of the center
   * @param cy    The y coordinate of the center
   * @param w     The width
   * @param h     The height
   * @param color The HTML hex color
   * @param z     How far behind everything else it is
   */
  const rect = (cx: number, cy: number, w: number, h: number, color: string, z: -4 | -3 | -2 | -1 | 0 = -4) => new Actor({ appearance: new FilledBox({ width: w, height: h, fillColor: color, z }), rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { collisionsEnabled: false }) });
  // The outside of the ship, and the wall behind everything: planks, and a strip of dark paneling
  rect(8, 4.5, 16, 9, "#0f2236");
  rect(8, (ROOM.ceiling + ROOM.floor) / 2, ROOM.right - ROOM.left, ROOM.floor - ROOM.ceiling, "#c9a96a");
  for (let i = 0; i < 14; i++) rect(ROOM.left + 0.5 + i, (ROOM.ceiling + ROOM.floor) / 2 - 0.35, 0.96, ROOM.floor - ROOM.ceiling - 0.7, i % 2 ? "#d4b478" : "#c9a96a");
  rect(8, ROOM.floor - 0.6, ROOM.right - ROOM.left, 1.2, "#8a5e34", -3);
  // The ceiling beam, the floor, and the walls of the hull
  rect(8, ROOM.ceiling - 0.2, 16, 0.5, "#4a2f18", -3);
  rect(8, ROOM.floor + 0.9, 16, 1.8, "#6b4a2b", -3);
  for (let i = 0; i < 4; i++) rect(8, ROOM.floor + 0.25 + i * 0.5, 16, 0.04, "#4a2f18", -2);
  rect(ROOM.left - 0.5, 4.5, 1, 9, "#4a2f18", -2);
  rect(ROOM.right + 0.5, 4.5, 1, 9, "#4a2f18", -2);
  // The window: a frame, the sky, and a sun
  rect(WINDOW.x, WINDOW.y, WINDOW.w + 0.3, WINDOW.h + 0.3, "#4a2f18", -3);
  const sky = new FilledBox({ width: WINDOW.w, height: WINDOW.h, fillColor: "#8fd3f4", z: -2 });
  new Actor({ appearance: sky, rigidBody: new BoxBody({ cx: WINDOW.x, cy: WINDOW.y, width: WINDOW.w, height: WINDOW.h }, { collisionsEnabled: false }) });
  const sun = new FilledCircle({ radius: 0.28, fillColor: "#fff3b0", z: -2, offset: { dx: 0, dy: 0 } });
  new Actor({ appearance: sun, rigidBody: new CircleBody({ cx: WINDOW.x + 0.5, cy: WINDOW.y - 0.4, radius: 0.1 }, { collisionsEnabled: false }) });
  rect(WINDOW.x, WINDOW.y + 0.65, WINDOW.w, 0.7, "#3a6b9a", -2);
  rect(WINDOW.x, WINDOW.y, 0.08, WINDOW.h, "#4a2f18", -2);
  rect(WINDOW.x, WINDOW.y, WINDOW.w, 0.08, "#4a2f18", -2);

  // --- The pirate --------------------------------------------------------------------------------
  const held = { l: false, r: false };
  let face: "r" | "l" = "r";
  let walking = false;
  /** Is the pirate sitting in a chair? */
  let sitting: Placed | undefined;
  const heroSprite = pirateSprite(2.7, () => ({ face, walking }));
  const hero = new Actor({
    appearance: heroSprite,
    rigidBody: new CircleBody({ cx: 4, cy: ROOM.floor - 1.15, radius: 0.3 }, { collisionsEnabled: false }),
  });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => (held.l = true));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => (held.l = false));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => (held.r = true));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => (held.r = false));
  stage.world.repeatEvents.push((dt: number) => {
    const dir = (held.r ? 1 : 0) - (held.l ? 1 : 0);
    // Walking away from a chair stands up
    if (dir != 0 && sitting) { sitting = undefined; }
    const isWalking = dir != 0 && !sitting;
    if (!sitting) {
      const p = hero.rigidBody.getCenter();
      hero.rigidBody.setCenter(Math.max(ROOM.left + 0.6, Math.min(ROOM.right - 0.6, p.x + dir * 3.6 * dt)), ROOM.floor - 1.15);
    }
    const newFace = dir > 0 ? "r" : dir < 0 ? "l" : face;
    // The sprite only asks again when we tell it that something changed
    if (newFace != face || isWalking != walking) { face = newFace; walking = isWalking; heroSprite.restartCurrentAnimation(); }
  });

  // --- The HUD ---------------------------------------------------------------------------------------
  label(0.3, 0.35, () => `Doubloons: ${game.coins}`, 28, "#ffd35a");

  // --- The shop ---------------------------------------------------------------------------------------

  // --- Putting things down ---------------------------------------------------------------------------

  // --- Remembering ----------------------------------------------------------------------------------------

  // --- Living in the room ----------------------------------------------------------------------------------

}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
