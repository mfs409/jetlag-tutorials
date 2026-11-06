import { Actor, ActorPoolSystem, BoxBody, CircleBody, FilledBox, FilledCircle, FilledPolygon, KeyCodes, LevelValue, PlayerControlBehavior, SessionValue, SolidBehavior, stage, TextSprite } from "jetlag2d";
import { hudButton } from "../common/common";

/**
 * HELPERS for Cave Flyer.
 *
 * Everything in this file is provided, and you don't have to edit it.  It has the data (what a slice of cave is, what is saved, and the
 * ship colors), the pieces of the menu, and functions that make the cave, the pool of actors, a wall block, and the ship.  The camera,
 * the ring of wall blocks, the rocks and stars, the Daily Cave, what is remembered, and the shop are what you write.
 */

// ANCHOR: today_fn
/** Today's date, as `YYYY-MM-DD`.  Everybody who plays today gets the same one. */
export const today = () => new Date().toISOString().slice(0, 10);
// ANCHOR_END: today_fn

// ANCHOR: slice_type
/** One 1-meter-wide slice of cave: where the gap is, and what's in it */
export interface Slice {
  /** The y coordinate of the bottom of the ceiling */
  top: number;
  /** The y coordinate of the top of the floor */
  bottom: number;
  /** The y coordinate of a rock in this slice, if there is one */
  rock?: number;
  /** The y coordinate of a star in this slice, if there is one */
  star?: number;
}
// ANCHOR_END: slice_type

// ANCHOR: save_type
/**
 * Everything that's kept forever.  It's plain data, with fields and nothing
 * else, because it is saved as JSON.
 */
export class Save {
  /** The longest flight ever, in meters */
  best = 0;
  /** The longest flight in the Daily Cave on `dailyDate` */
  dailyBest = 0;
  /** The date (as `YYYY-MM-DD`) of the last Daily Cave flight */
  dailyDate = "";
  /** Every star ever collected, minus the ones spent on ship colors */
  lifetime = 0;
  // ANCHOR: save_skin_fields
  /** Which ship colors (positions in `SKINS`) have been bought */
  skins: number[] = [0];
  /** Which ship color is in use */
  skin = 0;
  // ANCHOR_END: save_skin_fields
  /** Has a flight ever been finished?  If not, this is a brand new player. */
  played = false;
}
// ANCHOR_END: save_type

// ANCHOR: save_fns
/** The key under which the one JSON object is kept in persistent storage */
export const SAVE_KEY = "cave_flyer";

/** How many stars have been banked in this sitting (session storage) */
export const SESSION_STARS = new SessionValue<number>("stars", () => 0);

/** Is there a shield, bought in the menu, waiting for the next flight? */
export const SHIELD_READY = new SessionValue<boolean>("shield", () => false);

/** How many stars have been collected on this flight (level storage, so a new flight starts at zero) */
export const FLIGHT_STARS = new LevelValue<number>("stars", () => 0);
// ANCHOR_END: save_fns

// ANCHOR: skins_table
/** The ship colors, and what each costs in lifetime stars */
export const SKINS = [{ color: "#ffd23f", cost: 0 }, { color: "#3bceac", cost: 25 }, { color: "#ff5d8f", cost: 60 }, { color: "#9b5de5", cost: 120 }];
// ANCHOR_END: skins_table

// ANCHOR: menu_helpers
/**
 * Some text on the menu
 *
 * @param x      The x coordinate of the text's center (or left, if not centered)
 * @param y      The y coordinate of the text
 * @param size   The font size
 * @param face   The font
 * @param color  The HTML hex color of the text
 * @param t      The words
 * @param center Should `x` be the center of the text?
 */
export function text(x: number, y: number, size: number, face: string, color: string, t: string, center = false) {
  new Actor({ appearance: new TextSprite({ center, face, size, color }, t), rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }) });
}

/**
 * A button that works with a tap or a key
 *
 * @param cx     The x coordinate of the center of the button
 * @param cy     The y coordinate of the center of the button
 * @param label  The words on the button
 * @param color  The HTML hex color of the button
 * @param key    The key that does the same thing
 * @param action What the button does
 */
export function button(cx: number, cy: number, label: string, color: string, key: KeyCodes, action: () => void) {
  hudButton({ cx, cy, width: 4.5, height: 1, label, color, key, action, scene: stage.world });
}
// ANCHOR_END: menu_helpers

/**
 * Make the cave.  It's made one slice at a time, only when something asks for it, and every slice is remembered.
 *
 * @returns A function that says what slice number `i` of the cave is like
 */
export function makeCave() {
  // ANCHOR: slice_gen
  // The cave is made one slice at a time, only when something asks for it,
  // and every slice is remembered.  So the random numbers are used strictly
  // in order of distance, no matter who asks for a slice first.
  const cave: Slice[] = [];
  let center = 4.5;
  const sliceAt = (i: number) => {
    while (cave.length <= i) {
      const n = cave.length;
      const gap = Math.max(2.8, 5.6 - n / 140);
      center = Math.max(1 + gap / 2, Math.min(8 - gap / 2, center + (stage.random.next() - 0.5) * 1.3));
      const slice: Slice = { top: center - gap / 2, bottom: center + gap / 2 };
      // ANCHOR: slice_content
      // Rocks get more likely as the cave goes on.  A slice never has both.
      if (n > 14 && stage.random.nextBoolean(Math.min(0.2, 0.06 + n / 3000))) slice.rock = slice.top + 0.5 + stage.random.next() * (gap - 1);
      else if (n > 6 && stage.random.nextBoolean(0.18)) slice.star = slice.top + 0.4 + stage.random.next() * (gap - 0.8);
      // ANCHOR_END: slice_content
      cave.push(slice);
    }
    return cave[i];
  };
  // ANCHOR_END: slice_gen
  return sliceAt;
}

// ANCHOR: make_pool
/**
 * Make a pool of identical actors.  Each is put back in the pool, which
 * turns it off, as soon as it falls behind the camera.
 *
 * @param size  How many actors to make, ever
 * @param build How to make one actor
 */
export function makePool(size: number, build: () => Actor) {
  const pool = new ActorPoolSystem();
  for (let i = 0; i < size; i++) {
    const a = build();
    a.prerenderTasks.push(() => {
      if (a.enabled && a.rigidBody.getCenter().x < stage.world.camera.getLeft() - 1) pool.put(a);
    });
    pool.put(a);
  }
  return pool;
}
// ANCHOR_END: make_pool

/**
 * Make a wall block.  Each is 9 meters tall (the height of the screen), so
 * the only thing we ever need to change is where it is.
 *
 * @param cx    The x coordinate of the center of the block
 * @param cy    The y coordinate of the center of the block
 * @param color The HTML hex color of the block
 * @param ship  The ship, which crashes if it touches the block
 * @param crash What to do when it does
 */
export function makeWall(cx: number, cy: number, color: string, ship: Actor, crash: () => void) {
  return new Actor({
    appearance: new FilledBox({ width: 1.05, height: 9, fillColor: color, lineWidth: 0.02, lineColor: "#00000055" }),
    rigidBody: new BoxBody({ cx, cy, width: 1.02, height: 9 }),
    behaviors: new SolidBehavior({ onContact: (_a: Actor, o: Actor) => { if (o == ship) crash(); } }),
  });
}

/**
 * Make the ship, with its flame and its shield ring
 *
 * @param skin      The HTML hex color of the ship
 * @param hasShield Does the ship have a shield?
 *
 * @returns The ship, its flame, and its shield ring
 */
export function makeShip(skin: string, hasShield: boolean) {
  // ANCHOR: ship
  // The ship
  const shieldRing = new FilledCircle({ radius: 0.55, fillColor: "#00000000", lineWidth: 0.06, lineColor: hasShield ? "#3bceac" : "#00000000" });
  const flame = new FilledPolygon({ vertices: [{ x: -0.3, y: -0.12 }, { x: -0.75, y: 0 }, { x: -0.3, y: 0.12 }], fillColor: "#00000000" });
  const ship = new Actor({
    appearance: [shieldRing, flame, new FilledPolygon({ vertices: [{ x: 0.45, y: 0 }, { x: -0.3, y: -0.28 }, { x: -0.2, y: 0 }, { x: -0.3, y: 0.28 }], fillColor: skin, lineWidth: 0.04, lineColor: "#ffffff" })],
    rigidBody: new CircleBody({ cx: 2, cy: 4.5, radius: 0.28 }, { disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  // ANCHOR_END: ship
  return { ship, flame, shieldRing };
}
