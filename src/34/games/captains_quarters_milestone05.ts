import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, KeyCodes, SessionValue, stage, TextSprite, ZIndex } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  storageKey = "com.github.mfs409.captains-quarters/";
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    imageNames: ["pirate.json"],
  };
}

/**
 * MILESTONE 5 for Captain's Quarters: living in the room all work.
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
const GRID = 0.5;

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
const ITEMS: ItemDef[] = [
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
const zOf = (layer: Layer): -2 | -1 | 0 | 1 => (layer == "wall" ? -2 : layer == "rug" ? -1 : layer == "floor" ? 0 : 1);

/**
 * What a kind of thing looks like, drawn from shapes.  Every shape's position
 * is measured from the center of the thing.
 *
 * @param id    Which kind of thing
 * @param flip  Draw it turned around?
 * @param z     The z index to draw it at
 * @param scale How big to draw it, where 1 is its real size
 */
function art(id: string, flip: boolean, z: ZIndex, scale = 1) {
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
class Save {
  /** Has the room ever been saved?  If not, everything else is just the starting values. */
  saved = false;
  /** The doubloons */
  coins = 0;
  /** The night that it is */
  day = 1;
  /** Each thing in the room */
  items: SavedItem[] = [];
}

/** One thing in the room: what it is, where it is, whether it's flipped, and whether it's lit */
class SavedItem {
  id = "";
  x = 0;
  y = 0;
  flip = false;
  on = false;
}

/**
 * The room.  It's loaded from persistent storage the first time that it's
 * needed, and from then on the game works with the copy in session storage,
 * and saves it whenever something changes.
 */
const SAVE = new SessionValue<Save>("room", () => stage.storage.loadPersistent("cabin", new Save()));

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

/**
 * A color with an opacity, as the HTML hex string that JetLag wants
 *
 * @param rgb   The color, as `#rrggbb`
 * @param alpha How opaque, from 0 to 1
 */
const withAlpha = (rgb: string, alpha: number) => rgb + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");

/**
 * Do two stretches of a line overlap?  Touching doesn't count.
 *
 * @param ac The center of the first
 * @param aw The length of the first
 * @param bc The center of the second
 * @param bw The length of the second
 */
const overlaps = (ac: number, aw: number, bc: number, bw: number) => Math.abs(ac - bc) < (aw + bw) / 2 - 0.01;

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
  /** Everything that's in the room */
  const placed: Placed[] = [];

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
  // A line of words at the bottom of the screen, which goes away by itself
  let said = "", sayUntil = 0;
  label(8, 8.55, () => (stage.renderer.now < sayUntil ? said : ""), 24, "#ffe9a8", true);
  /**
   * Say something to the player
   *
   * @param text What to say
   */
  const say = (text: string) => { said = text; sayUntil = stage.renderer.now + 2600; };

  /** The places on the HUD that buttons and the shop cover, so that a click there isn't also a click in the room */
  const uiRects: { l: number, t: number, r: number, b: number }[] = [];
  /**
   * A button on the HUD
   *
   * @param cx     The x coordinate of the center
   * @param cy     The y coordinate of the center
   * @param w      The width
   * @param h      The height
   * @param color  The HTML hex color
   * @param text   The words
   * @param action What it does when it's tapped
   */
  const button = (cx: number, cy: number, w: number, h: number, color: string, text: string, action: () => void) => {
    uiRects.push({ l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2 });
    return new Actor({
      appearance: [new FilledBox({ width: w, height: h, fillColor: color, lineWidth: 0.05, lineColor: "#e8d8a8" }), new TextSprite({ center: true, face: "Roboto Black", size: Math.min(24, h * 26), color: "#ffffff", z: 1 }, text)],
      rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { scene: stage.hud, collisionsEnabled: false }),
      gestures: { onTap: () => { action(); return true; } },
    });
  };

  /** The animations that are running right now */
  const tweens: { left: number, total: number, step: (t: number) => void, done?: () => void }[] = [];
  /**
   * Animate something.  `step` is called every frame, with how far along the
   * animation is, from 0 to 1, and `done` is called at the end.
   *
   * @param seconds How long it takes
   * @param step    What to do each frame
   * @param done    What to do at the end
   */
  const tween = (seconds: number, step: (t: number) => void, done?: () => void) => { tweens.push({ left: seconds, total: seconds, step, done }); };
  stage.world.repeatEvents.push((dt: number) => {
    // A copy, because a finished tween removes itself from the list
    const running = [...tweens];
    for (const t of running) {
      t.left -= dt;
      t.step(Math.min(1, 1 - t.left / t.total));
      if (t.left <= 0) { tweens.splice(tweens.indexOf(t), 1); t.done?.(); }
    }
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
  const sunActor = new Actor({ appearance: sun, rigidBody: new CircleBody({ cx: WINDOW.x + 0.5, cy: WINDOW.y - 0.4, radius: 0.1 }, { collisionsEnabled: false }) });
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
  label(5.2, 0.35, () => `Night ${game.day}`, 28, "#ffffff");
  label(8.2, 0.35, () => `Coziness ${cozy()}  (pays ${INCOME_BASE + cozy()} a night)`, 24, "#9fe8b0");

  // --- The shop ---------------------------------------------------------------------------------------
  /** The state of the shop: is it open, and which page */
  const shop: { open: boolean, tab: ItemDef["tab"] } = { open: false, tab: "furniture" };
  /** Everything that the open shop has made, so that it can be taken away */
  let panel: Actor[] = [];
  /** The area that the shop covers, when it's open */
  const PANEL = { l: 10.9, t: 0.9, r: 15.9, b: 8.3 };
  /** Close the shop */
  const closeShop = () => { panel.forEach(a => a.remove()); panel = []; shop.open = false; };
  /** Open the shop, or show another page of it */
  const showShop = () => {
    panel.forEach(a => a.remove());
    panel = [];
    shop.open = true;
    const hud = { scene: stage.hud, collisionsEnabled: false };
    panel.push(new Actor({
      appearance: new FilledBox({ width: PANEL.r - PANEL.l, height: PANEL.b - PANEL.t, fillColor: "#1d2b3aee", lineWidth: 0.08, lineColor: "#e8d8a8", z: -1 }),
      rigidBody: new BoxBody({ cx: (PANEL.l + PANEL.r) / 2, cy: (PANEL.t + PANEL.b) / 2, width: PANEL.r - PANEL.l, height: PANEL.b - PANEL.t }, hud),
    }));
    // The pages
    (["furniture", "wall", "tabletop"] as const).forEach((tab, i) => {
      const x = PANEL.l + 0.9 + i * 1.65;
      panel.push(new Actor({
        appearance: [new FilledBox({ width: 1.55, height: 0.55, fillColor: shop.tab == tab ? "#8a2f2f" : "#3a4f7a", lineWidth: 0.04, lineColor: "#e8d8a8" }), new TextSprite({ center: true, face: "Roboto Black", size: 16, color: "#ffffff", z: 1 }, tab == "furniture" ? "Furniture" : tab == "wall" ? "Wall" : "Tabletop")],
        rigidBody: new BoxBody({ cx: x + 0.2, cy: PANEL.t + 0.55, width: 1.55, height: 0.55 }, hud),
        gestures: { onTap: () => { shop.tab = tab; showShop(); return true; } },
      }));
    });
    // The things for sale
    ITEMS.filter(i => i.tab == shop.tab).forEach((def, i) => {
      const y = PANEL.t + 1.55 + i * 0.78;
      const affordable = game.coins >= def.price;
      const fit = Math.min(0.62 / def.w, 0.62 / def.h);
      panel.push(new Actor({
        appearance: [
          new FilledBox({ width: 4.7, height: 0.7, fillColor: affordable ? "#2f5a3a" : "#3a3a3a", lineWidth: 0.04, lineColor: "#e8d8a888", z: 0 }),
          ...art(def.id, false, 1, fit).map(part => { part.offset = { dx: part.offset.dx - 1.95, dy: part.offset.dy }; return part; }),
          new TextSprite({ center: false, face: "Roboto Black", size: 17, color: "#ffffff", offset: { dx: -1.4, dy: -0.12 }, z: 2 }, def.name),
          new TextSprite({ center: false, face: "Arimo Regular", size: 14, color: "#9fe8b0", offset: { dx: -1.4, dy: 0.15 }, z: 2 }, `Coziness +${def.cozy}`),
          new TextSprite({ center: true, face: "Roboto Black", size: 20, color: affordable ? "#ffd35a" : "#ff8a8a", offset: { dx: 1.85, dy: 0 }, z: 2 }, `${def.price}`),
        ],
        rigidBody: new BoxBody({ cx: (PANEL.l + PANEL.r) / 2, cy: y, width: 4.7, height: 0.7 }, hud),
        gestures: { onTap: () => { if (!affordable) { say("Not enough doubloons"); return true; } startHolding(def); return true; } },
      }));
    });
  };
  button(1.3, 8.45, 2.2, 0.75, "#8a2f2f", "Shop  (S)", () => (shop.open ? closeShop() : showShop()));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_S, () => (shop.open ? closeShop() : showShop()));

  // --- Putting things down ---------------------------------------------------------------------------
  /** The result of aiming: where the thing would go, and if it can */
  interface Spot { x: number; y: number; ok: boolean; reason: string }
  /**
   * Where would a thing go if the pointer is here?  The thing is moved onto
   * the grid, and onto the floor, or the wall, or a desk, as its kind needs.
   * Then it's checked against the rules: it has to fit in the room, and it
   * can't be on top of anything else.
   *
   * @param def    What the thing is
   * @param p      Where the pointer is
   * @param ignore Something that doesn't count as in the way, because it's the thing itself
   */
  const aim = (def: ItemDef, p: { x: number, y: number }, ignore?: Placed): Spot => {
    const hw = def.w / 2, hh = def.h / 2;
    const snap = (v: number) => Math.round(v / GRID) * GRID;
    const others = placed.filter(o => o !== ignore);
    let x = Math.min(ROOM.right - hw, Math.max(ROOM.left + hw, snap(p.x - hw) + hw));
    let y = p.y;
    if (def.layer == "floor" || def.layer == "rug") {
      y = ROOM.floor - hh;
      const clash = others.find(o => (o.def.layer == def.layer) && overlaps(x, def.w, o.x, o.def.w));
      return { x, y, ok: !clash, reason: clash ? "That's in the way" : "" };
    }
    if (def.layer == "wall") {
      y = Math.min(ROOM.floor - 1.5 - hh, Math.max(ROOM.ceiling + 0.3 + hh, snap(p.y - hh) + hh));
      const onWindow = overlaps(x, def.w, WINDOW.x, WINDOW.w) && overlaps(y, def.h, WINDOW.y, WINDOW.h);
      const clash = others.find(o => o.def.layer == "wall" && overlaps(x, def.w, o.x, o.def.w) && overlaps(y, def.h, o.y, o.def.h));
      return { x, y, ok: !clash && !onWindow, reason: onWindow ? "That's the window" : clash ? "Something is hung there" : "" };
    }
    // Something that stands on a desk: find the desk under the pointer
    const desk = others.find(o => o.def.surface && Math.abs(p.x - o.x) <= o.def.w / 2);
    if (!desk) return { x, y, ok: false, reason: "That needs a desk or a chest" };
    x = Math.min(desk.x + desk.def.w / 2 - hw, Math.max(desk.x - desk.def.w / 2 + hw, Math.round((p.x - hw) / 0.25) * 0.25 + hw));
    y = desk.y - desk.def.h / 2 - hh;
    const clash = others.find(o => o.def.layer == "surface" && Math.abs(o.y - y) < 0.01 && overlaps(x, def.w, o.x, o.def.w));
    return { x, y, ok: !clash, reason: clash ? "No room there" : "" };
  };

  /**
   * Make a thing in the room
   *
   * @param def  What it is
   * @param x    The x coordinate of its center
   * @param y    The y coordinate of its center
   * @param flip Turned around?
   * @param on   Lit?
   */
  const put = (def: ItemDef, x: number, y: number, flip: boolean, on = true) => {
    const actor = new Actor({ appearance: art(def.id, flip, zOf(def.layer)), rigidBody: new BoxBody({ cx: x, cy: y, width: def.w, height: def.h }, { collisionsEnabled: false }) });
    const item: Placed = { def, x, y, flip, on, actor };
    placed.push(item);
    return item;
  };

  /** What the player is holding, if anything: a new purchase, or something picked up from the room */
  let holding: { def: ItemDef, flip: boolean, from?: Placed, ghost: Actor, tint: FilledBox } | undefined;
  /** Where the pointer is */
  let mouse = { x: 8, y: 5 };

  /**
   * Pick a thing up, to put it somewhere
   *
   * @param def  What it is
   * @param from Where it came from, if it was already in the room
   * @param flip Turned around?
   */
  const startHolding = (def: ItemDef, from?: Placed, flip = false) => {
    closeShop();
    const tint = new FilledBox({ width: def.w, height: def.h, fillColor: "#00ff0044", z: 4 });
    const ghost = new Actor({ appearance: [...art(def.id, flip, 4), tint], rigidBody: new BoxBody({ cx: mouse.x, cy: mouse.y, width: def.w, height: def.h }, { collisionsEnabled: false }) });
    holding = { def, flip, from, ghost, tint };
  };

  // The thing that's held follows the pointer, and shows whether it can go there
  stage.world.repeatEvents.push(() => {
    if (!holding) return;
    const spot = aim(holding.def, mouse, holding.from);
    holding.ghost.rigidBody.setCenter(spot.x, spot.y);
    holding.tint.fillColor = spot.ok ? "#00ff0044" : "#ff000066";
  });

  /** Put the held thing down where the pointer is, if it can go there */
  const putDown = () => {
    if (!holding) return;
    const spot = aim(holding.def, mouse, holding.from);
    if (!spot.ok) { say(spot.reason); return; }
    const { def, flip, from, ghost } = holding;
    holding = undefined;
    ghost.remove();
    // A new purchase is paid for when it goes down.  Something that was already ours is free to move.
    if (!from) game.coins -= def.price;
    put(def, spot.x, spot.y, flip, from ? from.on : true);
    save();
  };

  /** Put back what was picked up where it was, or let go of something that hasn't been bought */
  const cancel = () => {
    if (!holding) return;
    const { def, from, ghost } = holding;
    holding = undefined;
    ghost.remove();
    if (from) put(def, from.x, from.y, from.flip, from.on);
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_ESCAPE, cancel);

  /**
   * Pick up a thing that's in the room.  A desk with things on it has to be cleared first.
   *
   * @param item The thing
   */
  const pickUp = (item: Placed) => {
    if (item.def.surface && placed.some(o => o.def.layer == "surface" && o.y < item.y - item.def.h / 2 + 0.01 && overlaps(o.x, o.def.w, item.x, item.def.w))) { say("Clear what's on it first"); return; }
    placed.splice(placed.indexOf(item), 1);
    item.actor.remove();
    startHolding(item.def, item, item.flip);
  };
  /**
   * The thing in the room at a place, if there is one.  Things on a desk win over the desk.
   *
   * @param p The place
   */
  const itemAt = (p: { x: number, y: number }) => {
    const order: Layer[] = ["surface", "floor", "rug", "wall"];
    for (const layer of order) {
      const hit = placed.find(o => o.def.layer == layer && Math.abs(p.x - o.x) <= o.def.w / 2 && Math.abs(p.y - o.y) <= o.def.h / 2);
      if (hit) return hit;
    }
    return undefined;
  };
  // Turning around, selling, and changing your mind
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_F, () => {
    if (!holding) return;
    holding.flip = !holding.flip;
    const g = holding;
    g.ghost.remove();
    g.tint = new FilledBox({ width: g.def.w, height: g.def.h, fillColor: "#00ff0044", z: 4 });
    g.ghost = new Actor({ appearance: [...art(g.def.id, g.flip, 4), g.tint], rigidBody: new BoxBody({ cx: mouse.x, cy: mouse.y, width: g.def.w, height: g.def.h }, { collisionsEnabled: false }) });
  });
  /** Sell what's held, for half of what it cost.  Something that hasn't been bought can't be sold. */
  const sell = () => {
    if (!holding || !holding.from) return;
    const refund = Math.floor(holding.def.price / 2);
    holding.ghost.remove();
    holding = undefined;
    game.coins += refund;
    say(`Sold for ${refund} doubloons`);
    save();
  };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DELETE, KeyCodes.KEY_X], sell);

  // The whole HUD listens to the pointer.  It's behind everything, and moves what's held, and puts it down.
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000", z: -4 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud, collisionsEnabled: false }),
    gestures: {
      onMouseHover: (_a: Actor, p: { x: number, y: number }) => { mouse = p; return true; },
      onTap: (_a: Actor, p: { x: number, y: number }) => {
        // A click on the shop, or on a button, is not a click in the room
        if (uiRects.some(r => p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b)) return false;
        if (shop.open && p.x >= PANEL.l && p.x <= PANEL.r && p.y >= PANEL.t && p.y <= PANEL.b) return false;
        mouse = p;
        if (holding) { putDown(); return true; }
        const item = itemAt(p);
        if (item) { pickUp(item); return true; }
        return false;
      },
    },
  });

  // --- Remembering ----------------------------------------------------------------------------------------
  /** Write down the doubloons, the day, and what's in the room, and where */
  const save = () => {
    const data = SAVE.get();
    data.saved = true;
    data.coins = game.coins;
    data.day = game.day;
    data.items = placed.map(o => Object.assign(new SavedItem(), { id: o.def.id, x: o.x, y: o.y, flip: o.flip, on: o.on }));
    stage.storage.savePersistent("cabin", data);
  };
  /**
   * Read what was written down, and put everything back
   *
   * @returns True if there was something saved
   */
  const load = () => {
    const data = SAVE.get();
    if (!data.saved) return false;
    game.coins = data.coins;
    game.day = data.day;
    for (const i of data.items) {
      const def = ITEMS.find(d => d.id == i.id);
      if (def) put(def, i.x, i.y, i.flip, i.on);
    }
    return true;
  };

  // --- Living in the room ----------------------------------------------------------------------------------
  /** What a night's sleep pays, before the coziness is added */
  const INCOME_BASE = 10;
  /**
   * How cozy the room is.  Every kind of thing adds its coziness, but the
   * second one adds only half, and the third one nothing, and every kind
   * that you have is worth a point.
   */
  const cozy = () => {
    const counts: { [id: string]: number } = {};
    let total = 0;
    for (const o of placed) {
      const n = (counts[o.def.id] = (counts[o.def.id] ?? 0) + 1);
      total += n == 1 ? o.def.cozy + 1 : n == 2 ? Math.floor(o.def.cozy / 2) : 0;
    }
    return total;
  };

  /** How far through the day it is, from 0 (morning) to 1 (the next morning), which is only for looking at */
  let phase = 0.1;
  const DAY_SECONDS = 150;
  /** How dark it is, from 0 (day) to 1 (night) */
  const night = () => Math.max(0, Math.min(1, 0.5 + 1.3 * Math.sin((phase - 0.35) * 2 * Math.PI)));
  const dark = new FilledBox({ width: ROOM.right - ROOM.left, height: ROOM.floor - ROOM.ceiling, fillColor: withAlpha("#0a1030", 0), z: 3 });
  new Actor({ appearance: dark, rigidBody: new BoxBody({ cx: 8, cy: (ROOM.ceiling + ROOM.floor) / 2, width: ROOM.right - ROOM.left, height: ROOM.floor - ROOM.ceiling }, { collisionsEnabled: false }) });
  stage.world.repeatEvents.push((dt: number) => {
    phase = (phase + dt / DAY_SECONDS) % 1;
    const n = night();
    dark.fillColor = withAlpha("#0a1030", n * 0.55);
    sky.fillColor = n > 0.5 ? "#1a2a5a" : "#8fd3f4";
    // The sun crosses the window in the day, and the moon at night
    sunActor.rigidBody.setCenter(WINDOW.x - 0.9 + 1.8 * ((phase * 2) % 1), WINDOW.y - 0.3 - 0.6 * Math.sin(((phase * 2) % 1) * Math.PI));
    sun.fillColor = phase < 0.5 ? "#fff3b0" : "#e8e8ff";
  });

  // Every lamp that's lit glows, once it's dark
  const glows: { item: Placed, rings: FilledCircle[] }[] = [];
  /** Make sure that every lamp in the room has a glow, and that the glows that aren't needed are gone */
  const syncGlows = () => {
    // A copy, because glows that aren't needed are removed from the list
    const currentGlows = [...glows];
    for (const g of currentGlows) if (!placed.includes(g.item)) glows.splice(glows.indexOf(g), 1);
    for (const o of placed) {
      if (!o.def.light || glows.some(g => g.item == o)) continue;
      const rings = [2.1, 1.7, 1.3, 0.9, 0.55].map(r => new FilledCircle({ radius: r, fillColor: "#ffd35a00", z: 4 }));
      const a = new Actor({ appearance: rings, rigidBody: new CircleBody({ cx: o.x, cy: o.y - o.def.h / 2 + 0.5, radius: 0.1 }, { collisionsEnabled: false }) });
      glows.push({ item: o, rings });
      // The glow follows its lamp, and goes when its lamp does
      stage.world.repeatEvents.push(() => { if (placed.includes(o)) a.rigidBody.setCenter(o.x, o.y - o.def.h / 2 + 0.5); else a.remove(); });
    }
  };
  stage.world.repeatEvents.push(() => {
    syncGlows();
    const n = night();
    for (const g of glows) g.rings.forEach((r, i) => (r.fillColor = withAlpha("#ffd35a", g.item.on ? n * [0.05, 0.06, 0.07, 0.09, 0.12][i] : 0)));
  });

  /**
   * The nearest thing of some kind that the pirate is next to
   *
   * @param test What kind of thing
   */
  const near = (test: (d: ItemDef) => boolean) => placed.filter(o => test(o.def) && Math.abs(o.x - hero.rigidBody.getCenter().x) < o.def.w / 2 + 0.6).sort((a, b) => Math.abs(a.x - hero.rigidBody.getCenter().x) - Math.abs(b.x - hero.rigidBody.getCenter().x))[0];
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_E, () => {
    if (holding) return;
    const bed = near(d => !!d.bed), seat = near(d => !!d.seat), lamp = near(d => !!d.light);
    if (bed) sleep();
    else if (seat) { sitting = seat; hero.rigidBody.setCenter(seat.x, ROOM.floor - 1.15 + 0.2); face = seat.flip ? "l" : "r"; heroSprite.restartCurrentAnimation(); }
    else if (lamp) { lamp.on = !lamp.on; save(); }
    else say("Nothing here to use");
  });

  // --- Sleeping: the fade, a new night, and the pay --------------------------------------------------
  const curtain = new FilledBox({ width: 16, height: 9, fillColor: withAlpha("#000000", 0), z: 4 });
  new Actor({ appearance: curtain, rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud, collisionsEnabled: false }) });
  /** Are we in the middle of sleeping? */
  let sleeping = false;
  /** Go to sleep: the screen fades, a night goes by, and the room pays for how cozy it is */
  const sleep = () => {
    if (sleeping) return;
    sleeping = true;
    tween(0.7, t => (curtain.fillColor = withAlpha("#000000", t)), () => {
      const pay = INCOME_BASE + cozy();
      game.day += 1;
      game.coins += pay;
      phase = 0.05;
      sitting = undefined;
      save();
      say(`Night ${game.day - 1} is over.  You earned ${pay} doubloons`);
      tween(0.9, t => (curtain.fillColor = withAlpha("#000000", 1 - t)), () => { sleeping = false; });
    });
  };

  // --- Coming back ---------------------------------------------------------------------------------------
  /**
   * Say hello
   *
   * @param returning Has the captain been here before?
   */
  const welcome = (returning: boolean) => {
    say(returning ? `Welcome back, Captain!  Night ${game.day}` : "Welcome aboard, Captain!  Press S to open the shop");
  };

  const returning = load();
  syncGlows();
  welcome(returning);
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
