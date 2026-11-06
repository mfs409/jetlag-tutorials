import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledRoundedBox, ImageSprite, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, stage, StateEvent, ZIndex } from "jetlag2d";
import { boundingBox, hudText } from "../common/common";

/**
 * STARTER CODE for Supply Run.
 *
 * You're a pirate on a small island, and a ship is anchored across the channel.
 * The ship needs supplies, and you can't swim.  You can carry things, put them
 * down, and throw them across the water.
 *
 * Right now, there's an island, a channel, a ship, and a pirate who can walk.
 * There are things lying around, and you can walk right over them.
 *
 * TODO (The pack): a pack with six slots that holds four of a kind in each, so that walking over something picks it up.
 *
 * TODO (The pack screen): a screen over the game, with the game behind it, where you pick up a stack and put it down in another slot.
 *
 * TODO (Hands): holding a stack while you walk, where everyone can see it, and keys that take a slot's stack in your hands.
 *
 * TODO (Putting down and throwing): putting down one thing in front of you, and throwing one across the water.
 *
 * TODO (The ship's order): what the ship wants, and a win when it has it, and a loss when it can't.
 */

// ANCHOR: config
/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["pirate.json", "coconut.png", "fish.png", "rum.png", "shell.png"],
    soundNames: ["high_pitch.ogg", "low_pitch.ogg", "woo_woo_woo.ogg", "win_sound.ogg"],
  };
}
// ANCHOR_END: config

// ANCHOR: world_consts
/** A rectangle, in meters: its left, top, right, and bottom edges */
interface Rect { l: number; t: number; r: number; b: number }

/** A place in the world, in meters */
export interface Point { x: number; y: number }

/** The island, on the left, which is where the pirate walks */
const ISLAND: Rect = { l: 0, t: 0, r: 9.2, b: 9 };

/** The channel of water between the island and the ship.  The pirate can't walk on it. */
const WATER: Rect = { l: 9.2, t: 0, r: 12.4, b: 9 };

/** The ship, on the right, which is where the supplies go */
export const SHIP: Rect = { l: 12.4, t: 0, r: 16, b: 9 };

/** The rocks on the island.  They're round, and they're in the way.  Every gap between two of them is wide enough for the pirate to squeeze through. */
const ROCKS = [{ x: 2.6, y: 2.3, r: 0.7 }, { x: 5.4, y: 4.6, r: 0.8 }, { x: 2.6, y: 7.3, r: 0.7 }, { x: 7.6, y: 1.8, r: 0.6 }];
// ANCHOR_END: world_consts

// ANCHOR: item_types
/** The kinds of things that there are */
type ItemKind = "coconut" | "fish" | "rum" | "shell";

/** What we need to know about a kind of thing, to show it */
interface ItemInfo {
  /** What it's called, with more than one of them */
  name: string;
  /** The picture of it */
  img: string;
}

/** Everything that we know about every kind of thing, in one table */
const ITEMS: { [kind in ItemKind]: ItemInfo } = {
  coconut: { name: "Coconuts", img: "coconut.png" },
  fish: { name: "Fish", img: "fish.png" },
  rum: { name: "Rum", img: "rum.png" },
  shell: { name: "Shells", img: "shell.png" },
};

/** Every kind of thing, in a list, for when we need to go through all of them */
export const KINDS: ItemKind[] = ["coconut", "fish", "rum", "shell"];

/** How big a thing is on the ground, in meters */
const ITEM_SIZE = 0.6;
// ANCHOR_END: item_types

/** What a thing on the ground needs to remember: what kind of thing it is */
class ItemData {
  constructor(readonly kind: ItemKind) { }
}

/** An actor that is a thing on the ground */
type Item = Actor<ItemData>;

/** What the pirate needs to remember: which way it's facing, as a step in x and y */
class HeroData {
  facing = { x: 0, y: 1 };
}

/** An actor that is the pirate */
type Hero = Actor<HeroData>;

// ANCHOR: spots
/** Where each thing starts out, on the island */
const SPOTS: { kind: ItemKind; x: number; y: number }[] = [
  { kind: "coconut", x: 1.2, y: 1.2 }, { kind: "coconut", x: 1.9, y: 1.6 }, { kind: "coconut", x: 1.4, y: 2.2 },
  { kind: "coconut", x: 6.6, y: 7.6 }, { kind: "coconut", x: 7.3, y: 7.2 }, { kind: "coconut", x: 4.6, y: 1.0 },
  { kind: "coconut", x: 8.2, y: 4.2 }, { kind: "coconut", x: 1.5, y: 8.1 },
  { kind: "fish", x: 0.9, y: 4.6 }, { kind: "fish", x: 1.4, y: 5.1 }, { kind: "fish", x: 1.1, y: 5.6 },
  { kind: "fish", x: 6.0, y: 3.0 }, { kind: "fish", x: 6.6, y: 3.6 }, { kind: "fish", x: 4.0, y: 8.0 },
  { kind: "rum", x: 5.0, y: 6.2 }, { kind: "rum", x: 5.6, y: 6.6 }, { kind: "rum", x: 8.5, y: 1.0 }, { kind: "rum", x: 3.2, y: 4.4 },
  { kind: "shell", x: 2.2, y: 3.4 }, { kind: "shell", x: 3.8, y: 3.2 }, { kind: "shell", x: 4.2, y: 5.6 },
  { kind: "shell", x: 6.2, y: 5.4 }, { kind: "shell", x: 7.6, y: 6.0 }, { kind: "shell", x: 1.4, y: 7.0 },
];
// ANCHOR_END: spots










// ANCHOR: scenery
/**
 * Draw a plain rectangle that's only there to look at
 *
 * @param rect  The rectangle
 * @param color The HTML hex color
 * @param z     How far forward it is (negative is behind everything else)
 */
function scenery(rect: Rect, color: string, z: ZIndex) {
  const width = rect.r - rect.l, height = rect.b - rect.t;
  new Actor({
    appearance: new FilledBox({ width, height, fillColor: color, z }),
    rigidBody: new BoxBody({ cx: rect.l + width / 2, cy: rect.t + height / 2, width, height }, { collisionsEnabled: false }),
  });
}

/** Draw the sea, the island, the ship, and the rocks, and put a wall along the shore */
function drawScenery() {
  scenery({ l: 0, t: 0, r: 16, b: 9 }, "#2f7fb8", -4);
  scenery(WATER, "#3a8fc9", -4);
  scenery(ISLAND, "#e9d8a6", -3);
  scenery({ l: ISLAND.r - 0.35, t: 0, r: ISLAND.r, b: 9 }, "#f5ecc8", -3);

  // The ship is a hull with a deck, and some planks
  new Actor({
    appearance: new FilledRoundedBox({ width: 4.6, height: 8.2, radius: 0.7, fillColor: "#6b4526", z: -2 }),
    rigidBody: new BoxBody({ cx: 14.3, cy: 4.5, width: 4.6, height: 8.2 }, { collisionsEnabled: false }),
  });
  new Actor({
    appearance: new FilledRoundedBox({ width: 3.8, height: 7.4, radius: 0.5, fillColor: "#b98b58", z: -1 }),
    rigidBody: new BoxBody({ cx: 14.3, cy: 4.5, width: 3.8, height: 7.4 }, { collisionsEnabled: false }),
  });
  for (let y = 1.4; y < 8; y += 1) {
    new Actor({
      appearance: new FilledBox({ width: 3.8, height: 0.04, fillColor: "#8f6a3f", z: -1 }),
      rigidBody: new BoxBody({ cx: 14.3, cy: y, width: 3.8, height: 0.04 }, { collisionsEnabled: false }),
    });
  }

  // The pirate can't walk into the water, so there's a wall along the shore that you can't see
  new Actor({
    appearance: new FilledBox({ width: 0.2, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: ISLAND.r + 0.1, cy: 4.5, width: 0.2, height: 9 }),
    behaviors: new SolidBehavior(),
  });

  for (const rock of ROCKS) {
    new Actor({
      appearance: new FilledCircle({ radius: rock.r, fillColor: "#8d99ae", lineWidth: 0.06, lineColor: "#5c677d", z: -1 }),
      rigidBody: new CircleBody({ cx: rock.x, cy: rock.y, radius: rock.r }),
      behaviors: new SolidBehavior(),
    });
  }
}
// ANCHOR_END: scenery

// ANCHOR: make_item
/**
 * Put a thing on the ground
 *
 * @param kind  What kind of thing it is
 * @param x     The x coordinate of its middle
 * @param y     The y coordinate of its middle
 * @param _hero The pirate
 *
 * @returns The thing
 */
function makeItem(kind: ItemKind, x: number, y: number, _hero: Hero): Item {
  // TODO (The pack): walking over it should pick it up.  Nothing happens yet, so `_hero` isn't used.
  return new Actor({
    appearance: new ImageSprite({ width: ITEM_SIZE, height: ITEM_SIZE, img: ITEMS[kind].img }),
    rigidBody: new CircleBody({ cx: x, cy: y, radius: ITEM_SIZE / 2 }, { collisionsEnabled: false }),
    data: new ItemData(kind),
  });
}
// ANCHOR_END: make_item

// ANCHOR: make_hero
/** The four ways that the pirate can face, with the animation for each way, and the letter in the names of its pictures */
const FACINGS = [
  { letter: "u", walk: AnimationState.WALK_N, idle: AnimationState.IDLE_N, toss: AnimationState.TOSS_N, tossIdle: AnimationState.TOSS_IDLE_N },
  { letter: "d", walk: AnimationState.WALK_S, idle: AnimationState.IDLE_S, toss: AnimationState.TOSS_S, tossIdle: AnimationState.TOSS_IDLE_S },
  { letter: "l", walk: AnimationState.WALK_W, idle: AnimationState.IDLE_W, toss: AnimationState.TOSS_W, tossIdle: AnimationState.TOSS_IDLE_W },
  { letter: "r", walk: AnimationState.WALK_E, idle: AnimationState.IDLE_E, toss: AnimationState.TOSS_E, tossIdle: AnimationState.TOSS_IDLE_E },
];

/** There are no pictures for facing at an angle, so those use the picture for left or right */
const ANGLES = [
  { from: AnimationState.WALK_NE, to: AnimationState.WALK_E }, { from: AnimationState.WALK_SE, to: AnimationState.WALK_E },
  { from: AnimationState.WALK_NW, to: AnimationState.WALK_W }, { from: AnimationState.WALK_SW, to: AnimationState.WALK_W },
  { from: AnimationState.IDLE_NE, to: AnimationState.IDLE_E }, { from: AnimationState.IDLE_SE, to: AnimationState.IDLE_E },
  { from: AnimationState.IDLE_NW, to: AnimationState.IDLE_W }, { from: AnimationState.IDLE_SW, to: AnimationState.IDLE_W },
  { from: AnimationState.TOSS_NE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_SE, to: AnimationState.TOSS_E },
  { from: AnimationState.TOSS_NW, to: AnimationState.TOSS_W }, { from: AnimationState.TOSS_SW, to: AnimationState.TOSS_W },
  { from: AnimationState.TOSS_IDLE_NE, to: AnimationState.TOSS_E }, { from: AnimationState.TOSS_IDLE_SE, to: AnimationState.TOSS_E },
  { from: AnimationState.TOSS_IDLE_NW, to: AnimationState.TOSS_W }, { from: AnimationState.TOSS_IDLE_SW, to: AnimationState.TOSS_W },
];

/**
 * Make the pirate's picture.  It's the same pirate as in Moonlight Harvest, in
 * Chapter 16: a walking animation, a standing one, and a tossing one, for each
 * of the four ways to face.  Nothing says when to use them.  The pirate has a
 * body, and JetLag works out its state from how the body is moving, and picks
 * the matching animation.  (The toss is the exception.  It starts when the game
 * says so, in Stage 4.)
 */
function pirateSprite() {
  const animations = new Map<AnimationState, AnimationSequence>();
  for (const facing of FACINGS) {
    const walking = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `pirate_walk_${facing.letter}_${n}.png`);
    const tossing = [0, 1, 2, 3, 4, 5, 6, 7].map(n => `pirate_thrust_${facing.letter}_${n}.png`);
    animations.set(facing.walk, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: walking }));
    animations.set(facing.idle, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_${facing.letter}_0.png`] }));
    // A toss plays once, and then the pirate goes back to walking, or standing.  These are the
    // pictures of the pirate's arm reaching forward, which Moonlight Harvest uses for punching
    animations.set(facing.toss, AnimationSequence.makeSimple({ timePerFrame: 30, repeat: false, images: tossing }));
    animations.set(facing.tossIdle, AnimationSequence.makeSimple({ timePerFrame: 30, repeat: false, images: tossing }));
  }
  const remap = new Map<AnimationState, AnimationState>();
  for (const angle of ANGLES) remap.set(angle.from, angle.to);
  // The picture is bigger than the pirate, and it's moved a little, so that the pirate fits in the body
  return new AnimatedSprite({ width: 2, height: 2, animations, remap, offset: { dx: 0, dy: -0.15 } });
}

/**
 * Make the pirate
 *
 * @param cx The x coordinate of its middle
 * @param cy The y coordinate of its middle
 *
 * @returns The pirate
 */
function makeHero(cx: number, cy: number): Hero {
  return new Actor({
    appearance: pirateSprite(),
    // A box that covers the whole pirate, from its head to its feet
    rigidBody: new BoxBody({ cx, cy, width: 0.8, height: 1.4 }, { dynamic: true, disableRotation: true }),
    // Nothing bumps into an actor with no behaviors, so the pirate has one
    behaviors: new PlayerControlBehavior(),
    data: new HeroData(),
  });
}

/**
 * Turn the pirate to face a way.  This writes down which way, for putting down
 * and throwing, and it turns the picture.  The picture usually turns by itself,
 * because it follows how the body moves, but a body that's walking into the
 * shore doesn't move, and it would stay facing the wrong way.  So we say it
 * outright, with a state event.  (If the body does move, it says the same thing.)
 *
 * @param hero The pirate
 * @param dx   The step in x (-1, 0, or 1)
 * @param dy   The step in y (-1, 0, or 1)
 */
function face(hero: Hero, dx: number, dy: number) {
  hero.data.facing = { x: dx, y: dy };
  const turn = dy < 0 ? StateEvent.MOVE_N : dy > 0 ? StateEvent.MOVE_S : dx < 0 ? StateEvent.MOVE_W : StateEvent.MOVE_E;
  hero.state.changeState(hero, turn);
}
// ANCHOR_END: make_hero

/** Walking speed, in meters per second */
const WALK_SPEED = 3;

// ANCHOR: walk
/**
 * Start the pirate walking, and turn it to face the way that it's going.  A key
 * down calls this with a direction, and letting go of the key stops that
 * direction.
 *
 * @param hero The pirate
 * @param dx   The step in x (-1, 0, or 1)
 * @param dy   The step in y (-1, 0, or 1)
 */
function walk(hero: Hero, dx: number, dy: number) {
  if (dx != 0) hero.rigidBody.xVelocity = dx * WALK_SPEED;
  if (dy != 0) hero.rigidBody.yVelocity = dy * WALK_SPEED;
  face(hero, dx, dy);
}
// ANCHOR_END: walk

/** The hint at the top left of the screen, which says what the keys do */
const HELP =
  "Arrows or WASD: walk";

/**
 * Draw the first scene that shows when the game starts.
 */
function builder() {
  DebugToggle.enable();
  boundingBox();
  drawScenery();

  const hero = makeHero(2.25, 4.5);
  for (const spot of SPOTS) makeItem(spot.kind, spot.x, spot.y, hero);

  hudText(0.3, 0.4, 20, "#ffffff", () => HELP, { outline: "#00000088" });


  // ANCHOR: walking
  // Walking: a key sets the pirate's speed, and letting go stops it
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_DOWN, KeyCodes.KEY_W, KeyCodes.KEY_S], () => (hero.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_A, KeyCodes.KEY_D], () => (hero.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => walk(hero, 0, -1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => walk(hero, 0, 1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => walk(hero, -1, 0));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => walk(hero, 1, 0));
  // ANCHOR_END: walking


}

// call the function that starts running the game in the `game-player` div tag
// of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
