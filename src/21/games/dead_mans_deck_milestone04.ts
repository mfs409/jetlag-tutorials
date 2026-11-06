import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, initializeAndLaunch, JetLagGameConfig, ParticleComponent, stage, TextSprite, TimedEvent } from "jetlag2d";
import { required } from "../common/common";

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
 * MILESTONE 4 for Dead Man's Deck: the impact all work.
 *
 * TODO (Sound and flow): sounds, music, fades between screens, and a title screen.
 *
 * TODO (The voyage): a map to choose a course on, cards that drop in as a reward, and the best voyage remembered.
 */

// ---------------------------------------------------------------------------
// The data: cards, enemies, and the rules of a fight
// ---------------------------------------------------------------------------

/** The pictures that a card can have on it */
type IconKind = "sword" | "shield" | "cannon" | "pistol" | "grog" | "spyglass";

/** One kind of card.  A card in the game is an instance of one of these. */
interface Card {
  /** A short name for the card, used to find it */
  id: string;
  /** What it's called */
  name: string;
  /** Attacks are red, and skills are blue */
  kind: "attack" | "skill";
  /** How much energy it costs to play */
  cost: number;
  /** What it does, in words */
  text: string;
  /** The picture on it */
  icon: IconKind;
  /** What it does, in code */
  effect: (s: Combat) => void;
}

/** A particular card in the deck.  A deck can have many copies of one kind, and each copy has its own `uid`. */
interface CardInst { uid: number; id: string }

/** One kind of enemy */
interface EnemyDef {
  /** What it's called */
  name: string;
  /** How much damage it can take */
  maxHp: number;
  /** What it does, in order, over and over */
  moves: Move[];
  /** Which art it has */
  look: "crab" | "gull" | "rival" | "boss";
}

/** What an enemy might do on its turn */
interface Move { kind: "attack" | "defend"; value: number }

/** Everything about the fight that's going on right now */
interface Combat {
  /** The player's hit points, block, and energy */
  hp: number; maxHp: number; block: number; energy: number;
  /** The three places that a card can be */
  drawPile: CardInst[]; hand: CardInst[]; discard: CardInst[];
  /** The enemy, and which of its moves is next */
  enemy: { def: EnemyDef; hp: number; block: number; move: number };
  /** What has happened, which the screen hasn't shown yet */
  fx: Fx[];
  /** Set when the fight is over */
  over?: "won" | "lost";
}

/** Things that happen in a fight, as the screen has to show them */
type Fx =
  | { kind: "swing"; who: "player" | "enemy" }
  | { kind: "hurt"; who: "player" | "enemy"; amount: number; absorbed: number; hp: number; block: number }
  | { kind: "shield"; who: "player" | "enemy"; amount: number; block: number }
  | { kind: "heal"; amount: number; hp: number }
  | { kind: "intent"; move: Move }
  | { kind: "die"; who: "player" | "enemy" };

/**
 * Hit the enemy, through its block first
 *
 * @param s      The fight
 * @param amount How much damage
 */
function hitEnemy(s: Combat, amount: number) {
  const absorbed = Math.min(s.enemy.block, amount);
  s.enemy.block -= absorbed;
  s.enemy.hp -= amount - absorbed;
  s.fx.push({ kind: "swing", who: "player" });
  s.fx.push({ kind: "hurt", who: "enemy", amount: amount - absorbed, absorbed, hp: Math.max(0, s.enemy.hp), block: s.enemy.block });
}

/**
 * Give the player block, which soaks up damage until the next turn
 *
 * @param s      The fight
 * @param amount How much block
 */
function gainBlock(s: Combat, amount: number) {
  s.block += amount;
  s.fx.push({ kind: "shield", who: "player", amount, block: s.block });
}

/**
 * Heal the player, up to the most that they can have
 *
 * @param s      The fight
 * @param amount How many hit points
 */
function heal(s: Combat, amount: number) {
  const gained = Math.min(amount, s.maxHp - s.hp);
  s.hp += gained;
  s.fx.push({ kind: "heal", amount: gained, hp: s.hp });
}

/**
 * Shuffle a list, using the game's random numbers.  The original is left alone.
 *
 * @param list The list to shuffle
 */
function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = stage.random.nextInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw cards into the hand, shuffling the discard pile into the draw pile if it runs out
 *
 * @param s The fight
 * @param n How many cards to draw
 */
function drawCards(s: Combat, n: number) {
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length == 0) {
      if (s.discard.length == 0) return;
      s.drawPile = shuffle(s.discard);
      s.discard = [];
    }
    s.hand.push(required(s.drawPile.pop(), "a card to draw"));
  }
}

/** Every card in the game */
const CARDS: Card[] = [
  { id: "slash", name: "Slash", kind: "attack", cost: 1, text: "Deal 6 damage", icon: "sword", effect: (s) => hitEnemy(s, 6) },
  { id: "parry", name: "Parry", kind: "skill", cost: 1, text: "Gain 5 block", icon: "shield", effect: (s) => gainBlock(s, 5) },
  { id: "pistol", name: "Pistol Shot", kind: "attack", cost: 0, text: "Deal 3 damage", icon: "pistol", effect: (s) => hitEnemy(s, 3) },
  { id: "twin", name: "Twin Blades", kind: "attack", cost: 1, text: "Deal 4 damage twice", icon: "sword", effect: (s) => { hitEnemy(s, 4); hitEnemy(s, 4); } },
  { id: "broadside", name: "Broadside", kind: "attack", cost: 2, text: "Deal 9 damage and gain 4 block", icon: "cannon", effect: (s) => { hitEnemy(s, 9); gainBlock(s, 4); } },
  { id: "cannon", name: "Cannon Shot", kind: "attack", cost: 2, text: "Deal 14 damage", icon: "cannon", effect: (s) => hitEnemy(s, 14) },
  { id: "barricade", name: "Barricade", kind: "skill", cost: 2, text: "Gain 11 block", icon: "shield", effect: (s) => gainBlock(s, 11) },
  { id: "grog", name: "Grog", kind: "skill", cost: 1, text: "Heal 6 hit points", icon: "grog", effect: (s) => heal(s, 6) },
  { id: "spyglass", name: "Spyglass", kind: "skill", cost: 1, text: "Draw 2 cards", icon: "spyglass", effect: (s) => drawCards(s, 2) },
];

/**
 * Look up a card by its id
 *
 * @param id The id
 */
const cardById = (id: string) => required(CARDS.find(c => c.id == id), `card ${id}`);

/** The deck that every run begins with */
const STARTER_DECK = ["slash", "slash", "slash", "slash", "parry", "parry", "parry", "parry"];

/** The cards that can turn up as rewards */
const REWARD_POOL = CARDS.filter(c => c.id != "slash" && c.id != "parry");

/** Every enemy in the game */
const ENEMIES: { [name: string]: EnemyDef } = {
  crab: { name: "Crab", maxHp: 24, look: "crab", moves: [{ kind: "attack", value: 6 }, { kind: "defend", value: 7 }, { kind: "attack", value: 9 }] },
  gull: { name: "Gull", maxHp: 20, look: "gull", moves: [{ kind: "attack", value: 4 }, { kind: "attack", value: 4 }, { kind: "attack", value: 9 }] },
  rival: { name: "Rival Pirate", maxHp: 40, look: "rival", moves: [{ kind: "attack", value: 11 }, { kind: "defend", value: 9 }, { kind: "attack", value: 7 }, { kind: "attack", value: 7 }] },
  boss: { name: "Captain Blackjack", maxHp: 75, look: "boss", moves: [{ kind: "attack", value: 13 }, { kind: "defend", value: 12 }, { kind: "attack", value: 8 }, { kind: "attack", value: 17 }] },
};

/** How much energy a turn gives, how many cards are drawn, and how much health a run starts with */
const ENERGY_MAX = 3, HAND_SIZE = 5, PLAYER_HP = 50;

/**
 * Begin a fight
 *
 * @param deck  The cards in the deck, all of them, in the draw pile
 * @param enemy The enemy
 * @param hp    The player's hit points
 * @param maxHp The player's most hit points
 */
function startCombat(deck: CardInst[], enemy: EnemyDef, hp: number, maxHp: number): Combat {
  const s: Combat = { hp, maxHp, block: 0, energy: 0, drawPile: shuffle(deck), hand: [], discard: [], enemy: { def: enemy, hp: enemy.maxHp, block: 0, move: 0 }, fx: [] };
  s.fx.push({ kind: "intent", move: enemy.moves[0] });
  return s;
}

/**
 * The player's turn begins: block runs out, energy comes back, and cards are drawn
 *
 * @param s The fight
 */
function startTurn(s: Combat) {
  if (s.block > 0) s.fx.push({ kind: "shield", who: "player", amount: 0, block: 0 });
  s.block = 0;
  s.energy = ENERGY_MAX;
  drawCards(s, HAND_SIZE);
}

/**
 * Play a card from the hand, if there's energy for it
 *
 * @param s    The fight
 * @param inst The card
 * @returns    True if the card was played
 */
function playCard(s: Combat, inst: CardInst) {
  const card = cardById(inst.id);
  if (s.over || s.energy < card.cost || !s.hand.includes(inst)) return false;
  s.energy -= card.cost;
  s.hand.splice(s.hand.indexOf(inst), 1);
  card.effect(s);
  s.discard.push(inst);
  if (s.enemy.hp <= 0) { s.over = "won"; s.fx.push({ kind: "die", who: "enemy" }); }
  return true;
}

/**
 * The player's turn ends: the hand is discarded, and the enemy does what it
 * had planned.
 *
 * @param s The fight
 */
function endTurn(s: Combat) {
  s.discard.push(...s.hand);
  s.hand = [];
  // Block from last turn runs out as the enemy's turn begins
  if (s.enemy.block > 0) s.fx.push({ kind: "shield", who: "enemy", amount: 0, block: 0 });
  s.enemy.block = 0;
  const move = s.enemy.def.moves[s.enemy.move % s.enemy.def.moves.length];
  if (move.kind == "attack") {
    const absorbed = Math.min(s.block, move.value);
    s.block -= absorbed;
    s.hp -= move.value - absorbed;
    s.fx.push({ kind: "swing", who: "enemy" });
    s.fx.push({ kind: "hurt", who: "player", amount: move.value - absorbed, absorbed, hp: Math.max(0, s.hp), block: s.block });
  } else {
    s.enemy.block += move.value;
    s.fx.push({ kind: "shield", who: "enemy", amount: move.value, block: s.enemy.block });
  }
  s.enemy.move += 1;
  s.fx.push({ kind: "intent", move: s.enemy.def.moves[s.enemy.move % s.enemy.def.moves.length] });
  if (s.hp <= 0) { s.over = "lost"; s.fx.push({ kind: "die", who: "player" }); }
}

// ---------------------------------------------------------------------------
// The art
// ---------------------------------------------------------------------------

/**
 * A little picture for a card, drawn from shapes, about a meter across
 *
 * @param kind  Which picture
 * @param scale How big, where 1 is a meter
 */
function icon(kind: IconKind, scale = 1) {
  const poly = (pts: number[][], fill: string, line = "#2a1a0a") => new FilledPolygon({ vertices: pts.map(([x, y]) => ({ x: x * scale, y: y * scale })), fillColor: fill, lineWidth: 0.03 * scale, lineColor: line, z: 1 });
  const dot = (x: number, y: number, r: number, fill: string) => new FilledCircle({ radius: r * scale, fillColor: fill, lineWidth: 0.03 * scale, lineColor: "#2a1a0a", offset: { dx: x * scale, dy: y * scale }, z: 1 });
  switch (kind) {
    case "sword": return [poly([[-0.4, 0.4], [0.35, -0.35], [0.42, -0.42], [0.42, -0.28], [-0.28, 0.5]], "#d8dde6"), poly([[-0.5, 0.2], [-0.2, 0.5], [-0.3, 0.6], [-0.6, 0.3]], "#c9a227"), dot(-0.52, 0.52, 0.07, "#8a5a1a")];
    case "shield": return [poly([[-0.4, -0.4], [0.4, -0.4], [0.4, 0.05], [0, 0.5], [-0.4, 0.05]], "#4a78b8", "#1a2a48"), poly([[-0.25, -0.25], [0.25, -0.25], [0.25, 0], [0, 0.3], [-0.25, 0]], "#e8c84a", "#7a5a10")];
    case "cannon": return [poly([[-0.45, -0.1], [0.3, -0.25], [0.3, 0.15], [-0.45, 0.2]], "#3a3f4a"), dot(-0.1, 0.25, 0.2, "#6a4a2a"), dot(0.45, -0.05, 0.1, "#ff8c1a")];
    case "pistol": return [poly([[-0.4, -0.15], [0.35, -0.15], [0.35, 0.02], [-0.1, 0.02], [-0.1, 0.4], [-0.3, 0.4], [-0.25, 0.02], [-0.4, 0.02]], "#5a5f6a"), dot(0.42, -0.07, 0.07, "#ff8c1a")];
    case "grog": return [poly([[-0.2, -0.1], [0.2, -0.1], [0.3, 0.4], [-0.3, 0.4]], "#a8431f", "#4a1a0a"), poly([[-0.08, -0.45], [0.08, -0.45], [0.08, -0.1], [-0.08, -0.1]], "#a8431f", "#4a1a0a"), poly([[-0.14, -0.55], [0.14, -0.55], [0.14, -0.45], [-0.14, -0.45]], "#c9a227")];
    case "spyglass": return [poly([[-0.45, 0.2], [0.1, -0.05], [0.1, 0.2], [-0.45, 0.35]], "#8a5a1a"), poly([[0.1, -0.15], [0.45, -0.3], [0.45, 0.3], [0.1, 0.2]], "#c9a227"), dot(0.45, 0, 0.12, "#8fd3f4")];
  }
}

/** The four directions that the art faces */
type Face = "r" | "l" | "u" | "d";

/**
 * A pirate with a cutlass, who can stand and swing it
 *
 * @param size  How big to draw it, in meters
 * @param face  Which way it looks
 * @returns     The sprite, and a function that swings the cutlass
 */
function pirateSprite(size: number, face: Face) {
  let swinging = false;
  const animations = new Map<AnimationState, AnimationSequence>();
  animations.set(AnimationState.IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_s_${face}_0.png`] }));
  animations.set(AnimationState.TOSS_IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 55, repeat: false, images: [0, 1, 2, 3, 4, 5].map(i => `pirate_slash_s_${face}_${i}.png`) }));
  const sprite = new AnimatedSprite({ width: size, height: size, z: 1, animations });
  // JetLag asks this when the actor's state changes, and when we restart the animation
  sprite.stateSelector = () => (swinging ? AnimationState.TOSS_IDLE_E : AnimationState.IDLE_E);
  const swing = () => {
    swinging = true;
    sprite.restartCurrentAnimation();
    stage.world.timer.addEvent(new TimedEvent(0.4, false, () => { swinging = false; sprite.restartCurrentAnimation(); }));
  };
  return { sprite, swing };
}

/**
 * Break a sentence into lines, no longer than a given length
 *
 * @param text  The sentence
 * @param width The most letters on a line
 */
function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > width) { lines.push(line); line = word; } else line = (line + " " + word).trim();
  }
  lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// The run: a deck, some health, and a map
// ---------------------------------------------------------------------------

/** Everything about a run that lasts from fight to fight */
interface Run {
  /** The cards that you own */
  deck: CardInst[];
  /** How healthy you are, and how healthy you can be */
  hp: number; maxHp: number;
  /** The number for the next card instance that gets made */
  nextUid: number;
}

/** The game, from the title to the end of a run.  There's just one builder, and the screens replace each other. */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1d2b3a";

  // --- Actors that belong to a screen -------------------------------------------
  /** Everything that the current screen made, so that the next screen can clear it */
  let live: Actor[] = [];
  /**
   * Make an actor that belongs to the current screen
   *
   * @param cfg The actor
   */
  const spawn = (cfg: ConstructorParameters<typeof Actor>[0]) => { const a = new Actor(cfg); live.push(a); return a; };
  /** Remove everything on the screen */
  const clearScreen = () => { live.forEach(a => a.remove()); live = []; };
  /**
   * Run some code after a delay
   *
   * @param seconds How long to wait
   * @param fn      What to do
   */
  const later = (seconds: number, fn: () => void) => stage.world.timer.addEvent(new TimedEvent(Math.max(0.0001, seconds), false, fn));
  /**
   * Some text, on the HUD (which is still while the world shakes) or in the world
   *
   * @param x     The x coordinate of the middle of the text
   * @param y     The y coordinate of the middle of the text
   * @param text  The words, or a function that makes them
   * @param size  The font size
   * @param color The HTML hex color
   * @param hud   Put it on the HUD?  This is the default.
   */
  const label = (x: number, y: number, text: string | (() => string), size: number, color: string, hud = true) => spawn({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size, color, strokeColor: "#000000", strokeWidth: 3 }, text),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, hud ? { scene: stage.hud } : {}),
  });

  // --- Things that take a moment ------------------------------------------------
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

  // --- The camera is held still, except for a shake ---------------------------------
  let shakeUntil = 0, shakeSize = 0;
  /**
   * Shake the world.  The HUD, where the cards are, doesn't move.
   *
   * @param ms   How long
   * @param size How far the camera can be thrown, in meters
   */
  const shake = (ms: number, size: number) => { shakeUntil = stage.renderer.now + ms; shakeSize = size; };
  stage.world.repeatEvents.push(() => {
    const j = stage.renderer.now < shakeUntil ? shakeSize : 0;
    stage.world.camera.setCenter({ x: 8 + (stage.random.next() * 2 - 1) * j, y: 4.5 + (stage.random.next() * 2 - 1) * j });
  });

  /**
   * A one-time burst of particles
   *
   * @param x      The x coordinate of the center of the burst
   * @param y      The y coordinate of the center of the burst
   * @param colors The HTML hex colors to pick from
   * @param count  How many particles
   */
  const burst = (x: number, y: number, colors: string[], count: number) => {
    const p = new ParticleComponent({ colors, speed: { min: 1.5, max: 5 }, lifetime: { min: 0.3, max: 0.9 }, size: { min: 0.06, max: 0.18 }, fade: true, z: 2 });
    const a = new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
    p.burst(count);
    later(1.2, () => a.remove());
  };

  /**
   * Numbers that float up from where something happened, and then are gone
   *
   * @param x     The x coordinate of where it starts
   * @param y     The y coordinate of where it starts
   * @param text  The words
   * @param color The HTML hex color
   */
  const popup = (x: number, y: number, text: string, color: string) => {
    const a = label(x, y, text, 38, color, false);
    tween(0.9, t => a.rigidBody.setCenter(x, y - 1.1 * t), () => a.remove());
  };

  /**
   * A button on the HUD
   *
   * @param cx     The x coordinate of the center
   * @param cy     The y coordinate of the center
   * @param w      The width
   * @param h      The height
   * @param color  The HTML hex color
   * @param text   The words
   * @param action What it does when tapped
   */
  const button = (cx: number, cy: number, w: number, h: number, color: string, text: string, action: () => void) => spawn({
    appearance: [
      new FilledRoundedBox({ width: w, height: h, radius: 0.2, fillColor: color, lineWidth: 0.06, lineColor: "#e8d8a8" }),
      new TextSprite({ center: true, face: "Roboto Black", size: Math.min(26, h * 24), color: "#ffffff" }, text),
    ],
    rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { scene: stage.hud }),
    gestures: { onTap: () => { action(); return true; } },
  });

  /** The sea, the sky, and the deck of the ship, with the waves moving a little */
  const backdrop = () => {
    const rect = (cx: number, cy: number, w: number, h: number, color: string, z: -2 | -1 = -2) => spawn({ appearance: new FilledBox({ width: w, height: h, fillColor: color, z }), rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { collisionsEnabled: false }) });
    rect(8, 1.8, 16, 3.6, "#3a6b9a");
    rect(8, 3.2, 16, 1.0, "#2f5a86");
    spawn({ appearance: new FilledCircle({ radius: 0.7, fillColor: "#ffe9a8", z: -2 }), rigidBody: new CircleBody({ cx: 13.8, cy: 1.1, radius: 0.7 }, { collisionsEnabled: false }) });
    for (let i = 0; i < 8; i++) rect(8, 4.2 + i * 0.62, 16, 0.58, i % 2 ? "#6b4a2b" : "#7a5632", -1);
    const waves = [0, 1, 2, 3, 4].map(i => rect(1.6 + i * 3.4, 3.65, 2.6, 0.14, "#9fdcf8"));
    const base = waves.map(w => w.rigidBody.getCenter().y);
    stage.world.repeatEvents.push(() => waves.forEach((w, i) => w.enabled && w.rigidBody.setCenter(w.rigidBody.getCenter().x, base[i] + Math.sin(stage.renderer.now / 600 + i) * 0.09)));
  };

  /**
   * What a card looks like.  Each card is a frame, a picture, a cost, a name,
   * and some words.  It also has a dark layer on top, which is only visible
   * when the card can't be afforded.
   *
   * @param card The card
   */
  const cardLook = (card: Card) => {
    const attack = card.kind == "attack";
    const text = (t: string, size: number, color: string, dx: number, dy: number, face = "Arimo Regular") => new TextSprite({ center: true, face, size, color, offset: { dx, dy }, z: 2 }, t);
    const dim = new FilledRoundedBox({ width: 2.2, height: 3.1, radius: 0.18, fillColor: "#00000000", z: 3 });
    const picture = icon(card.icon, 1.3);
    picture.forEach(p => { p.offset = { dx: p.offset.dx, dy: p.offset.dy - 0.55 }; });
    const parts: (FilledRoundedBox | FilledCircle | FilledPolygon | TextSprite)[] = [
      new FilledRoundedBox({ width: 2.2, height: 3.1, radius: 0.18, fillColor: attack ? "#8a2f2f" : "#2f5a8a", lineWidth: 0.08, lineColor: "#e8d8a8" }),
      new FilledRoundedBox({ width: 1.84, height: 1.3, radius: 0.12, fillColor: attack ? "#c86a4a" : "#6a9ac8", lineWidth: 0.04, lineColor: "#00000055", offset: { dx: 0, dy: -0.55 }, z: 1 }),
      ...picture,
      new FilledCircle({ radius: 0.3, fillColor: "#e8c84a", lineWidth: 0.05, lineColor: "#7a5a10", offset: { dx: -0.8, dy: -1.3 }, z: 2 }),
      text(`${card.cost}`, 22, "#3a2a08", -0.8, -1.3, "Roboto Black"),
      text(card.name, 17, "#ffffff", 0, 0.35, "Roboto Black"),
      ...wrap(card.text, 15).map((line, i) => text(line, 12, "#fff3d0", 0, 0.8 + i * 0.22)),
      dim,
    ];
    return { parts, dim };
  };

  /**
   * Make a set of cards that you can choose from, to add to your deck
   *
   * @param run  The run
   * @param done What to do when a card has been chosen
   */
  const reward = (run: Run, done: () => void) => {
    clearScreen();
    backdrop();
    label(8, 1.0, "Victory!  Choose a card for your deck", 34, "#ffd35a");
    const choices = shuffle(REWARD_POOL).slice(0, 3);
    choices.forEach((card, i) => {
      const x = 4.6 + i * 3.4;
      spawn({
        appearance: cardLook(card).parts,
        rigidBody: new BoxBody({ cx: x, cy: 4.6, width: 2.2, height: 3.1 }, { scene: stage.hud }),
        gestures: { onTap: () => { run.deck.push({ uid: run.nextUid++, id: card.id });
          done();
          return true;
        },
      },
      });
    });
    button(8, 7.9, 3, 0.9, "#4a4f5a", "Skip", done);
  };

  // --- A fight -------------------------------------------------------------------------------
  /**
   * Run one fight, from the first card to the last, and then say how it went
   *
   * @param deck   The cards in the deck
   * @param def    The enemy
   * @param hp     The player's hit points
   * @param maxHp  The player's most hit points
   * @param finish What to do when it's over, given whether the player won, and how many hit points they have left
   */
  const fight = (deck: CardInst[], def: EnemyDef, hp: number, maxHp: number, finish: (won: boolean, hp: number) => void) => {
    clearScreen();
    backdrop();
    const s = startCombat(deck, def, hp, maxHp);

    // What the screen is showing.  Events change it, one at a time, so it can be a moment behind `s`.
    const shown = { player: { hp, block: 0 }, enemy: { hp: def.maxHp, block: 0 }, intent: s.enemy.def.moves[0] };

    // --- The two fighters -----------------------------------------------------------------
    const HERO = { x: 3.3, y: 3.2 }, FOE = { x: 12.6, y: 3.3 };
    const hero = pirateSprite(3.8, "r");
    const heroActor = spawn({ appearance: hero.sprite, rigidBody: new CircleBody({ cx: HERO.x, cy: HERO.y, radius: 0.5 }, { collisionsEnabled: false }) });
    /** The enemy's picture: shapes for the animals, and a pirate for the people */
    const foeLook = () => {
      const k = def.look;
      if (k == "crab") {
        const part = (dx: number, dy: number, r: number) => new FilledCircle({ radius: r, fillColor: "#e4572e", lineWidth: 0.06, lineColor: "#8c2a12", offset: { dx, dy }, z: 1 });
        return [part(0, 0, 0.9), part(-1.05, -0.4, 0.36), part(1.05, -0.4, 0.36), part(-0.3, -0.6, 0.13), part(0.3, -0.6, 0.13)];
      }
      if (k == "gull") {
        const wing = (m: number) => new FilledPolygon({ vertices: [{ x: 0.1 * m, y: 0 }, { x: 1.7 * m, y: -0.8 }, { x: 1.4 * m, y: 0.45 }], fillColor: "#f4f4f4", lineWidth: 0.05, lineColor: "#888888", z: 1 });
        return [wing(-1), wing(1), new FilledCircle({ radius: 0.6, fillColor: "#ffffff", lineWidth: 0.05, lineColor: "#888888", z: 1 }), new FilledPolygon({ vertices: [{ x: 0, y: -0.1 }, { x: 0.4, y: 0.1 }, { x: 0, y: 0.28 }], fillColor: "#f2a31b", offset: { dx: 0.65, dy: -0.1 }, z: 1 })];
      }
      const boss = k == "boss";
      return [new FilledCircle({ radius: boss ? 1.3 : 1.0, fillColor: boss ? "#20202099" : "#d6283033", lineWidth: 0.08, lineColor: boss ? "#111111" : "#d62830", z: 0 }), pirateSprite(boss ? 5 : 3.8, "l").sprite];
    };
    const foeActor = spawn({ appearance: foeLook(), rigidBody: new CircleBody({ cx: FOE.x, cy: FOE.y, radius: 0.6 }, { collisionsEnabled: false }) });
    /** How far each fighter is from home, while it lunges */
    const off = { hero: 0, foe: 0 };
    /**
     * A fighter lunges at the other, and comes back
     *
     * @param who Which one
     * @param dx  How far, in meters, and which way
     */
    const lunge = (who: "hero" | "foe", dx: number) => tween(0.3, t => (off[who] = dx * Math.sin(Math.PI * t)));
    // The fighters breathe, and lunge
    stage.world.repeatEvents.push(() => {
      const now = stage.renderer.now;
      if (heroActor.enabled) heroActor.rigidBody.setCenter(HERO.x + off.hero, HERO.y + Math.sin(now / 400) * 0.06);
      if (foeActor.enabled) foeActor.rigidBody.setCenter(FOE.x + off.foe, FOE.y + Math.sin(now / 330 + 1) * 0.1);
    });
    /**
     * A health bar.  The bar itself drops at once, and a paler bar behind it
     * drains slowly, so that you can see how much was lost.
     *
     * @param cx    The x coordinate of the middle of the bar
     * @param cy    The y coordinate of the middle of the bar
     * @param who   Whose hit points
     * @param max   The most that they can have
     * @param color The HTML hex color of the bar
     */
    const bar = (cx: number, cy: number, who: "player" | "enemy", max: number, color: string) => {
      const W = 3.6;
      const trail = new FilledBox({ width: W, height: 0.28, fillColor: "#f2c14e", z: 1 });
      const fill = new FilledBox({ width: W, height: 0.28, fillColor: color, z: 2 });
      spawn({
        appearance: [new FilledBox({ width: W + 0.14, height: 0.42, fillColor: "#000000aa", lineWidth: 0.04, lineColor: "#e8d8a8", z: 0 }), trail, fill,
          new TextSprite({ center: true, face: "Roboto Black", size: 14, color: "#ffffff", offset: { dx: 0, dy: 0.02 }, z: 3 }, () => `${shown[who].hp} / ${max}`),
          new TextSprite({ center: true, face: "Roboto Black", size: 16, color: "#9fd0ff", offset: { dx: 0, dy: 0.5 }, z: 3 }, () => (shown[who].block > 0 ? `Block ${shown[who].block}` : ""))],
        rigidBody: new BoxBody({ cx, cy, width: W, height: 0.4 }, { collisionsEnabled: false }),
      });
      stage.world.repeatEvents.push((dt: number) => {
        const target = Math.max(0.001, W * shown[who].hp / max);
        fill.width = target;
        fill.offset = { dx: -(W - target) / 2, dy: 0 };
        trail.width = Math.max(target, trail.width - W * 0.5 * dt);
        trail.offset = { dx: -(W - trail.width) / 2, dy: 0 };
      });
    };
    bar(HERO.x + 0.5, 5.25, "player", maxHp, "#4cbf6a");
    bar(FOE.x, 5.25, "enemy", def.maxHp, "#d65050");

    // Above the enemy, a picture of what it's about to do, which bobs.  There's a sword and a shield, and the one that doesn't apply waits off the screen.
    const swordIcon = spawn({ appearance: icon("sword", 1.2), rigidBody: new BoxBody({ cx: -5, cy: -5, width: 0.5, height: 0.5 }, { collisionsEnabled: false }) });
    const shieldIcon = spawn({ appearance: icon("shield", 1.2), rigidBody: new BoxBody({ cx: -5, cy: -5, width: 0.5, height: 0.5 }, { collisionsEnabled: false }) });
    label(FOE.x + 0.6, 1.0, () => `${shown.intent.value}`, 32, "#ffffff", false);
    stage.world.repeatEvents.push(() => {
      const bob = 1.0 + Math.sin(stage.renderer.now / 250) * 0.08;
      (shown.intent.kind == "attack" ? swordIcon : shieldIcon).rigidBody.setCenter(FOE.x - 0.3, bob);
      (shown.intent.kind == "attack" ? shieldIcon : swordIcon).rigidBody.setCenter(-5, -5);
    });
    // A ring around a fighter that has block
    const ring = (at: { x: number, y: number }, r: number, who: "player" | "enemy") => {
      const c = new FilledCircle({ radius: r, fillColor: "#00000000", lineWidth: 0.1, lineColor: "#00000000", z: 2 });
      spawn({ appearance: c, rigidBody: new CircleBody({ cx: at.x, cy: at.y + 0.2, radius: 0.1 }, { collisionsEnabled: false }) });
      stage.world.repeatEvents.push(() => { c.lineColor = shown[who].block > 0 ? "#6bb6ffcc" : "#00000000"; c.fillColor = shown[who].block > 0 ? "#6bb6ff22" : "#00000000"; });
    };
    ring(HERO, 1.5, "player");
    ring(FOE, 1.5, "enemy");

    // --- The hand ---------------------------------------------------------------------------------
    /** Where the piles of cards are */
    const DRAW_PILE = { x: 1.1, y: 7.85 }, DISCARD_PILE = { x: 14.9, y: 7.85 };
    /** One card on the screen */
    interface CardView {
      inst: CardInst;
      actor: Actor;
      dim: FilledRoundedBox;
      /** Where it is, and where it's going */
      x: number; y: number; rot: number; tx: number; ty: number; trot: number;
      /** Is the mouse over it, and is it being dragged? */
      hover: boolean; dragging: boolean;
    }
    const views: CardView[] = [];
    /** The card that's being dragged, if any */
    let dragging: CardView | undefined;
    /** Is it the player's turn, with nothing in the middle of happening? */
    let busy = true;

    /**
     * Where the card in a place of the hand goes: the hand is a fan, and a card that the mouse is over lifts out of it
     *
     * @param i     Which place
     * @param n     How many cards are in the hand
     * @param hover Is the mouse over this card?
     */
    const slot = (i: number, n: number, hover: boolean) => {
      const t = n == 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const spread = Math.min(4.6, 1.0 * n);
      return { x: 8 + t * spread, y: 7.5 + 0.3 * t * t - (hover ? 0.95 : 0), rot: hover ? 0 : t * 0.2 };
    };

    /**
     * Have a go at playing a card, if it can be afforded
     *
     * @param v The card
     */
    const tryPlay = (v: CardView) => {
      if (busy || s.over) return;
      if (cardById(v.inst.id).cost > s.energy) {
        return;
      }
      run(() => playCard(s, v.inst));
    };

    /**
     * Make the picture of a card that's just been drawn
     *
     * @param inst Which card
     */
    const makeView = (inst: CardInst) => {
      const look = cardLook(cardById(inst.id));
      const actor = spawn({
        appearance: look.parts,
        rigidBody: new BoxBody({ cx: DRAW_PILE.x, cy: DRAW_PILE.y, width: 2.2, height: 3.1 }, { scene: stage.hud, collisionsEnabled: false }),
        gestures: {
          onTap: () => { tryPlay(v); return true; },
          // The mouse lifts a card out of the hand, and a drag carries it
          onMouseHover: () => { v.hover = true; return true; },
          onMouseUnHover: () => { v.hover = false; return true; },
          onPanStart: () => { if (busy || cardById(v.inst.id).cost > s.energy) return false; dragging = v; v.dragging = true; return true; },
        },
      });
      const v: CardView = { inst, actor, dim: look.dim, x: DRAW_PILE.x, y: DRAW_PILE.y, rot: 0, tx: DRAW_PILE.x, ty: DRAW_PILE.y, trot: 0, hover: false, dragging: false };
      views.push(v);
      return v;
    };

    /** Make the cards on the screen match the cards in the hand: new ones fly in, and old ones fly away */
    const syncHand = () => {
      // A copy, because cards that fly away are removed from the list
      const currentViews = [...views];
      for (const v of currentViews) {
        if (s.hand.includes(v.inst)) continue;
        views.splice(views.indexOf(v), 1);
        v.tx = DISCARD_PILE.x; v.ty = DISCARD_PILE.y; v.trot = 0; v.dragging = false;
        later(0.45, () => v.actor.remove());
      }
      for (const inst of s.hand) if (!views.some(v => v.inst == inst)) makeView(inst);
      s.hand.forEach((inst, i) => {
        const v = required(views.find(c => c.inst == inst), "a view for a card in the hand");
        if (v.dragging) return;
        const p = slot(i, s.hand.length, v.hover);
        v.tx = p.x; v.ty = p.y; v.trot = p.rot;
      });
    };

    stage.world.repeatEvents.push((dt: number) => {
      // Each frame, a card goes some of the way to where it wants to be
      const k = Math.min(1, dt * 12);
      // A card that the mouse is over (or has just left) moves to its new place
      s.hand.forEach((inst, i) => {
        const v = views.find(c => c.inst == inst);
        if (v && !v.dragging) { const p = slot(i, s.hand.length, v.hover); v.tx = p.x; v.ty = p.y; v.trot = p.rot; }
      });
      for (const v of views) {
        if (v.dragging) { v.x = v.tx; v.y = v.ty; v.rot = 0; } else { v.x += (v.tx - v.x) * k; v.y += (v.ty - v.y) * k; v.rot += (v.trot - v.rot) * k; }
        v.actor.rigidBody.setCenter(v.x, v.y);
        v.actor.rigidBody.rotation = v.rot;
        v.dim.fillColor = cardById(v.inst.id).cost > s.energy ? "#000000aa" : "#00000000";
      }
    });

    // The whole HUD listens for the drag's movement, so that it isn't lost if the pointer gets ahead of the card
    spawn({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000", z: -2 }),
      rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud, collisionsEnabled: false }),
      gestures: {
        onPanMove: (_a: Actor, p: { x: number, y: number }) => { if (!dragging) return false; dragging.tx = p.x; dragging.ty = p.y; return true; },
        onPanStop: (_a: Actor, p: { x: number, y: number }) => {
          const v = dragging;
          if (!v) return false;
          dragging = undefined;
          v.dragging = false;
          // Let go above the hand, and the card is played
          if (p.y < 5.9) tryPlay(v);
          return true;
        },
      },
    });

    // The energy, and the piles
    spawn({
      appearance: [new FilledCircle({ radius: 0.62, fillColor: "#e8c84a", lineWidth: 0.1, lineColor: "#7a5a10", z: 1 }), new TextSprite({ center: true, face: "Roboto Black", size: 32, color: "#3a2a08", offset: { dx: 0, dy: 0 }, z: 3 }, () => `${s.energy}/${ENERGY_MAX}`)],
      rigidBody: new BoxBody({ cx: 0.95, cy: 5.9, width: 1.2, height: 1.2 }, { scene: stage.hud, collisionsEnabled: false }),
    });
    /**
     * A pile of cards, as a few cards stacked, with how many there are
     *
     * @param at    Where
     * @param count A function that says how many cards are in the pile
     * @param color The HTML hex color of the backs of the cards
     * @param name  What the pile is called
     */
    const pile = (at: { x: number, y: number }, count: () => number, color: string, name: string) => {
      const card = (dx: number, dy: number) => new FilledRoundedBox({ width: 1.5, height: 2.1, radius: 0.14, fillColor: color, lineWidth: 0.06, lineColor: "#e8d8a8", offset: { dx, dy }, z: -1 });
      spawn({
        appearance: [card(-0.1, 0.1), card(0, 0), card(0.1, -0.1),
          new TextSprite({ center: true, face: "Roboto Black", size: 30, color: "#ffffff", strokeColor: "#000000", strokeWidth: 4, offset: { dx: 0, dy: 0 }, z: 3 }, () => `${count()}`),
          new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#e8d8a8", offset: { dx: 0, dy: 1.3 }, z: 3 }, name)],
        rigidBody: new BoxBody({ cx: at.x, cy: at.y, width: 1.5, height: 2.1 }, { scene: stage.hud, collisionsEnabled: false }),
      });
    };
    pile(DRAW_PILE, () => s.drawPile.length, "#3a4f7a", "Draw");
    pile(DISCARD_PILE, () => s.discard.length, "#6a3a3a", "Discard");
    button(14.6, 6.1, 2.2, 0.9, "#3a3a6b", "End Turn", () => endIt());

    // --- Playing back what happened ---------------------------------------------------------------
    /**
     * Show one thing that happened.  This changes what's on the screen, and
     * says how long to wait before showing the next thing.
     *
     * @param e What happened
     * @returns How many seconds to wait
     */
    const show = (e: Fx) => {
      let wait = 0;
      const at = (who: "player" | "enemy") => (who == "player" ? HERO : FOE);
      switch (e.kind) {
        case "swing":
          if (e.who == "player") { hero.swing(); lunge("hero", 1.7); } else lunge("foe", -1.7);
          wait = 0.3;
          break;
        case "hurt":
          shown[e.who].hp = e.hp;
          shown[e.who].block = e.block;
          if (e.amount > 0) popup(at(e.who).x, at(e.who).y - 0.8, `-${e.amount}`, "#ff6b6b");
          else popup(at(e.who).x, at(e.who).y - 0.8, "Blocked", "#9fd0ff");
          wait = 0.45;
          if (e.amount > 0) { burst(at(e.who).x, at(e.who).y, ["#ff3b3b", "#ffffff", "#ffcc33"], 18 + e.amount * 2); shake(250, e.who == "player" ? 0.25 : 0.12); }
          break;
        case "shield":
          shown[e.who].block = e.block;
          if (e.amount > 0) { popup(at(e.who).x, at(e.who).y - 0.8, `+${e.amount}`, "#6bb6ff"); wait = 0.3; }
          if (e.amount > 0) burst(at(e.who).x, at(e.who).y, ["#6bb6ff", "#ffffff"], 16);
          break;
        case "heal":
          shown.player.hp = e.hp;
          popup(HERO.x, HERO.y - 0.8, `+${e.amount}`, "#6bdc7a");
          wait = 0.35;
          burst(HERO.x, HERO.y, ["#6bdc7a", "#ffffff"], 18);
          break;
        case "intent":
          shown.intent = e.move;
          break;
        case "die":
          if (e.who == "enemy") foeActor.remove(); else heroActor.remove();
          wait = 0.8;
          burst(at(e.who).x, at(e.who).y, ["#ffd35a", "#ff6b6b", "#ffffff"], 40);
          shake(450, 0.3);
          break;
      }
      return wait;
    };

    /**
     * Show everything that has happened, one thing after another
     *
     * @param done What to do when there's nothing left to show
     */
    const runFx = (done: () => void) => {
      const e = s.fx.shift();
      if (!e) return done();
      const wait = show(e);
      if (wait > 0) later(wait, () => runFx(done)); else runFx(done);
    };

    // --- Turns ----------------------------------------------------------------------------------------
    /**
     * Make something happen in the fight, show it, and then carry on
     *
     * @param change What happens, as changes to the state
     * @param after  What to do next (by default, the player gets the next move)
     */
    const run = (change: () => void, after?: () => void) => {
      busy = true;
      change();
      syncHand();
      runFx(() => {
        // A fight that's over is over: wait a moment, and report how it went
        if (s.over) { later(0.9, () => finish(s.over == "won", s.hp)); return; }
        if (after) after(); else busy = false;
      });
    };
    /** The player ends their turn: the enemy acts, and then the next turn begins */
    const endIt = () => {
      if (busy || s.over) return;
      run(() => endTurn(s), () => run(() => startTurn(s)));
    };
    // Begin
    run(() => startTurn(s));
  };

  // --- The screens ------------------------------------------------------------------------------------
  /**
   * A new run's deck, and health
   */
  const newRun = (): Run => {
    const run: Run = {
      deck: [], hp: PLAYER_HP, maxHp: PLAYER_HP, nextUid: 0,
    };
    STARTER_DECK.forEach(id => run.deck.push({ uid: run.nextUid++, id }));
    return run;
  };

  /**
   * The end of a run
   *
   * @param won  Did the player win?
   * @param run  The run
   */
  const endRun = (won: boolean, run: Run) => {
    clearScreen();
    backdrop();
    label(8, 2.4, won ? "Captain Blackjack walks the plank!" : "Davy Jones takes the captain...", 40, won ? "#ffd35a" : "#ff8a8a");
    label(8, 3.5, `Cards in your final deck: ${run.deck.length}`, 22, "#ffffff");
    button(8, 5.8, 3.6, 1.1, "#8a2f2f", "Sail again", () => startRun());
  };

  /** Begin a run: three fights, in order, with a card to choose after each */
  const startRun = () => {
    const run = newRun();
    const foes = [ENEMIES.crab, ENEMIES.gull, ENEMIES.rival];
    const next = (i: number) => fight(run.deck, foes[i], run.hp, run.maxHp, (won, hp) => {
      run.hp = hp;
      if (!won) return endRun(false, run);
      if (i == foes.length - 1) return endRun(true, run);
      reward(run, () => next(i + 1));
    });
    next(0);
  };

startRun();
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
