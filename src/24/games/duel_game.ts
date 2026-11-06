import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, getAppearance, getBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, ParticleComponent, PunchBehavior, SessionValue, stage, TextSprite, TimedEvent } from "jetlag2d";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    imageNames: ["pirate.json"],
    // ANCHOR: sound_names
    soundNames: ["high_pitch.ogg", "low_pitch.ogg", "win_sound.ogg", "lose_sound.ogg"],
    // ANCHOR_END: sound_names
  };
}
// ANCHOR_END: config

/**
 * Duel at Dawn: a tournament of sword fights on the dock.  Every swing has
 * three parts: a wind-up, a moment when the blade is out and can hit, and a
 * recovery, in which you're open.  Learn to read your opponent's wind-up,
 * and you can guard it, and a guard that's timed just right turns the blow
 * back on them.
 *
 * Move with A and D (or the arrow keys), swing with J (or Z), and guard with
 * K (or X).  Hold the guard, or tap it at the last moment.
 */

// ---------------------------------------------------------------------------
// The data
// ---------------------------------------------------------------------------

// ANCHOR: timing
// ANCHOR: t_swing
/** How long each part of a swing lasts, in milliseconds */
const WINDUP = 220, ACTIVE = 120, RECOVERY = 340;
/** How long a fighter is stunned after being hit */
const HURT = 380;
// ANCHOR_END: t_swing
// ANCHOR: t_guard
/** How long a fighter is stunned after having a blow parried */
const STAGGER = 750;
/** A guard raised in the last 220 milliseconds before a blow lands is a *parry* */
const PARRY_WINDOW = 220;
/** What a swing and a blocked blow cost, in stamina */
const SWING_COST = 24, BLOCK_COST = 30;
// ANCHOR_END: t_guard
// ANCHOR: t_stop
/** How long the whole game freezes when a blow lands */
const HITSTOP = 90;
// ANCHOR_END: t_stop
/** The most stamina a fighter has */
const STAMINA = 100;
// ANCHOR_END: timing

// ANCHOR: opponent_type
/** One of the fighters in the tournament */
interface Opponent {
  /** What they're called */
  name: string;
  /** How many hits they can take */
  hp: number;
  /** How fast they walk, in meters per second */
  speed: number;
  /** How often they swing, when they're in range, from 0 to 1 */
  aggression: number;
  /** How long they take to answer a swing, in milliseconds.  Shorter is harder. */
  reaction: number;
  /** How often they try to guard a swing that they see, from 0 to 1 */
  guard: number;
  /** What they say before the duel */
  taunt: string;
  /** The doubloons for beating them */
  prize: number;
}

/** Everyone in the tournament, from the easiest to the hardest */
const OPPONENTS: Opponent[] = [
  { name: "Deckhand Dan", hp: 3, speed: 2.2, aggression: 0.30, reaction: 520, guard: 0.15, taunt: "I just mopped here!", prize: 10 },
  { name: "Salty Sue", hp: 4, speed: 2.6, aggression: 0.45, reaction: 420, guard: 0.30, taunt: "Mind your elbows, captain.", prize: 20 },
  { name: "Mad Mabel", hp: 4, speed: 3.0, aggression: 0.60, reaction: 340, guard: 0.40, taunt: "Hee hee hee!", prize: 30 },
  { name: "First Mate Finch", hp: 5, speed: 3.0, aggression: 0.55, reaction: 280, guard: 0.60, taunt: "I've watched you fight all year.", prize: 50 },
  { name: "Captain Blackjack", hp: 6, speed: 3.4, aggression: 0.65, reaction: 230, guard: 0.70, taunt: "Dawn is when I'm at my best.", prize: 100 },
];
// ANCHOR_END: opponent_type

// ANCHOR: fighter_type
/** What a fighter can be doing */
type Phase = "idle" | "windup" | "active" | "recovery" | "block" | "stagger" | "hurt" | "down";

/** What a player (or the computer) wants a fighter to do this moment */
interface Intent {
  /** -1 to walk left, 1 to walk right */
  move: -1 | 0 | 1;
  /** Swing now? (This is true for one moment, when the button goes down.) */
  attack: boolean;
  /** Is the guard held up? */
  block: boolean;
}

/** Something that decides what a fighter does: a person at the keyboard, or a computer */
type Controller = (me: Fighter, foe: Fighter, now: number) => Intent;

/** Everything about one of the two fighters */
interface Fighter {
  /** What they're called */
  name: string;
  /** The actor that draws them, and holds the sword's hitbox */
  actor: Actor;
  /** Which way they face: 1 for right, -1 for left */
  face: 1 | -1;
  /** What they're doing, and the time (in `stage.renderer.now`) that it stops */
  phase: Phase;
  phaseEnds: number;
  /** Hit points, and the most that there were */
  hp: number; maxHp: number;
  /** Stamina, which swinging and guarding use up, and standing around gives back */
  stamina: number;
  /** When the guard went up */
  blockSince: number;
  /** Are they walking? */
  walking: boolean;
  /** Being knocked back: how fast, and until when */
  knockVx: number; knockUntil: number;
  /** How fast they walk */
  speed: number;
  /** Who decides what they do */
  controller: Controller;
  /** A flash of light on the guard, which is bright when a blow has been parried */
  guardFx: FilledPolygon;
  /** A ring that is red when they've been hurt */
  hurtRing: FilledCircle;
}
// ANCHOR_END: fighter_type

// ANCHOR: pirate_sprite
/**
 * A pirate with a cutlass, whose picture is chosen by what the fighter is doing
 *
 * @param size The size to draw the pirate, in meters
 * @param f    A function that gives the fighter, which is asked whenever JetLag needs to choose the picture
 */
function fighterSprite(size: number, f: () => Fighter) {
  const animations = new Map<AnimationState, AnimationSequence>();
  const dirs: { face: string; idle: AnimationState; walk: AnimationState; slash: AnimationState; windup: AnimationState; hurt: AnimationState }[] = [
    { face: "r", idle: AnimationState.IDLE_E, walk: AnimationState.WALK_E, slash: AnimationState.TOSS_IDLE_E, windup: AnimationState.PUNCH_IDLE_E, hurt: AnimationState.JUMP_IDLE_E },
    { face: "l", idle: AnimationState.IDLE_W, walk: AnimationState.WALK_W, slash: AnimationState.TOSS_IDLE_W, windup: AnimationState.PUNCH_IDLE_W, hurt: AnimationState.JUMP_IDLE_W },
  ];
  for (const dir of dirs) {
    animations.set(dir.idle, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_s_${dir.face}_0.png`] }));
    animations.set(dir.walk, AnimationSequence.makeSimple({ timePerFrame: 80, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_walk_s_${dir.face}_${i}.png`) }));
    // The swing plays once, and holds its last frame while the fighter recovers
    animations.set(dir.slash, AnimationSequence.makeSimple({ timePerFrame: 55, repeat: false, images: [0, 1, 2, 3, 4, 5].map(i => `pirate_slash_s_${dir.face}_${i}.png`) }));
    animations.set(dir.windup, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_slash_s_${dir.face}_1.png`] }));
    animations.set(dir.hurt, AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_s_${dir.face}_5.png`] }));
  }
  const sprite = new AnimatedSprite({ width: size, height: size, z: 1, animations, offset: { dx: 0, dy: -0.35 } });
  // JetLag asks which animation to use when the state changes, and when we call `restartCurrentAnimation`
  sprite.stateSelector = () => {
    const me = f();
    const e = me.face == 1;
    switch (me.phase) {
      case "windup": return e ? AnimationState.PUNCH_IDLE_E : AnimationState.PUNCH_IDLE_W;
      case "active": case "recovery": return e ? AnimationState.TOSS_IDLE_E : AnimationState.TOSS_IDLE_W;
      case "hurt": case "stagger": case "down": return e ? AnimationState.JUMP_IDLE_E : AnimationState.JUMP_IDLE_W;
      default: return me.walking ? (e ? AnimationState.WALK_E : AnimationState.WALK_W) : (e ? AnimationState.IDLE_E : AnimationState.IDLE_W);
    }
  };
  return sprite;
}
// ANCHOR_END: pirate_sprite

// ANCHOR: ai_fn
/**
 * A computer opponent.  It's a controller, like the player: every frame it
 * looks at the two fighters, and says what it wants to do.  Nothing else
 * about it is special, and it follows all of the same rules.
 *
 * It walks up to sword range, and then, now and then, swings, or steps
 * back.  It watches for the player's wind-up, which is the tell, and may
 * raise its guard, but only after its reaction time.  A slow opponent
 * guards too late, and a quick one guards just in time to parry.
 *
 * @param p Who the opponent is
 */
function ai(p: Opponent): Controller {
  /** When to next choose what to do, and what the plan is until then */
  let nextChoice = 0, plan: "hold" | "forward" | "back" = "hold";
  /** When the guard will go up, and when it will come down again */
  let guardAt = 0, guardUntil = 0;
  /** Has this swing already been seen? */
  let noticed = false;
  return (me, foe, now) => {
    const dx = foe.actor.rigidBody.getCenter().x - me.actor.rigidBody.getCenter().x;
    const d = Math.abs(dx), toward = dx > 0 ? 1 : -1, away = dx > 0 ? -1 : 1;
    const intent: Intent = { move: 0, attack: false, block: false };
    // Seeing a wind-up, and deciding to answer it, after a reaction time that's a little different each time
    if (foe.phase == "windup" && !noticed) {
      noticed = true;
      if (d < 2.4 && stage.random.nextBoolean(p.guard)) guardAt = now + p.reaction * (0.6 + stage.random.next() * 0.8);
    }
    if (foe.phase != "windup" && foe.phase != "active") noticed = false;
    if (guardAt > 0 && now >= guardAt) { guardAt = 0; guardUntil = now + 500; }
    if (now < guardUntil && me.stamina > 0) { intent.block = true; return intent; }
    if (d > 2.1) { intent.move = toward; return intent; }
    if (now >= nextChoice) {
      nextChoice = now + 300 + stage.random.nextInt(400);
      if (d < 2.0 && stage.random.nextBoolean(p.aggression)) { intent.attack = true; return intent; }
      plan = stage.random.choice<"hold" | "forward" | "back">(d < 1.5 ? ["back", "hold"] : d > 1.8 ? ["forward", "hold"] : ["hold", "back", "forward"]);
    }
    intent.move = d < 1.1 ? away : plan == "forward" ? toward : plan == "back" ? away : 0;
    return intent;
  };
}
// ANCHOR_END: ai_fn

// ANCHOR: progress
/**
 * Where the player is in the tournament: which opponent is next, and the
 * doubloons won so far
 */
class Progress {
  /**
   * @param round Which opponent is next
   * @param prize The doubloons won so far
   */
  constructor(public round: number, public prize: number) { }
}

/**
 * The progress, in session storage, which survives starting a duel over, and
 * goes away when the page is closed.  Until a duel has been won, there is none.
 */
const PROGRESS = new SessionValue<Progress | undefined>("progress", () => undefined);
// ANCHOR_END: progress

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------

/** Build the dock, and run the tournament on it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#0f2236";

  // --- Actors that belong to a screen -----------------------------------------------
  /** Everything that the current screen made, so that the next screen can clear it */
  let live: Actor[] = [];
  /** Things that run every frame for the current screen, which are dropped along with it */
  let loops: ((dt: number) => void)[] = [];
  /**
   * Make an actor that belongs to the current screen
   *
   * @param cfg The actor
   */
  const spawn = (cfg: ConstructorParameters<typeof Actor>[0]) => { const a = new Actor(cfg); live.push(a); return a; };
  /** Remove everything that the current screen made */
  const clearScreen = () => { live.forEach(a => a.remove()); live = []; loops = []; };
  stage.world.repeatEvents.push((dt: number) => loops.forEach(l => l(dt)));
  // ANCHOR: later_fn
  /**
   * Run some code after a delay
   *
   * @param seconds How long to wait
   * @param fn      What to do
   */
  const later = (seconds: number, fn: () => void) => stage.world.timer.addEvent(new TimedEvent(Math.max(0.0001, seconds), false, fn));
  // ANCHOR_END: later_fn
  /**
   * Some text, on the HUD
   *
   * @param x      The x coordinate of the text
   * @param y      The y coordinate of the middle of the text
   * @param text   The words, or a function that makes them
   * @param size   The font size
   * @param color  The HTML hex color
   * @param center Is `x` the middle of the text?  If not, it's the left edge.
   */
  const label = (x: number, y: number, text: string | (() => string), size: number, color: string, center = true) => spawn({
    appearance: new TextSprite({ center, face: "Roboto Black", size, color, strokeColor: "#000000", strokeWidth: 3 }, text),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
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
    appearance: [new FilledRoundedBox({ width: w, height: h, radius: 0.2, fillColor: color, lineWidth: 0.06, lineColor: "#e8d8a8" }), new TextSprite({ center: true, face: "Roboto Black", size: Math.min(26, h * 24), color: "#ffffff" }, text)],
    rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { scene: stage.hud, collisionsEnabled: false }),
    gestures: { onTap: () => { action(); return true; } },
  });

  // ANCHOR: impact_helpers
  // --- Making a blow feel like something: sparks, a shake, words, and a sound ---------
  let shakeUntil = 0, shakeSize = 0;
  /**
   * Shake the world
   *
   * @param ms   How long
   * @param size How far the camera is thrown, in meters
   */
  const shake = (ms: number, size: number) => { shakeUntil = stage.renderer.now + ms; shakeSize = size; };
  stage.world.repeatEvents.push(() => {
    const j = stage.renderer.now < shakeUntil ? shakeSize : 0;
    stage.world.camera.setCenter({ x: 8 + (stage.random.next() * 2 - 1) * j, y: 4.5 + (stage.random.next() * 2 - 1) * j });
  });
  /**
   * A burst of sparks
   *
   * @param x      The x coordinate of the center
   * @param y      The y coordinate of the center
   * @param colors The HTML hex colors to pick from
   * @param count  How many
   */
  const sparks = (x: number, y: number, colors: string[], count: number) => {
    const p = new ParticleComponent({ colors, speed: { min: 1.5, max: 5 }, lifetime: { min: 0.2, max: 0.6 }, size: { min: 0.05, max: 0.15 }, fade: true, z: 3 });
    const a = new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
    p.burst(count);
    later(1, () => a.remove());
  };
  /** The words that are floating up right now */
  const floaters: { a: Actor, x: number, y: number, t0: number }[] = [];
  /**
   * Words that float up from where something happened
   *
   * @param x     The x coordinate of where they start
   * @param y     The y coordinate of where they start
   * @param text  The words
   * @param color The HTML hex color
   */
  const popup = (x: number, y: number, text: string, color: string) => {
    const a = new Actor({
      appearance: new TextSprite({ center: true, face: "Roboto Black", size: 34, color, strokeColor: "#000000", strokeWidth: 4 }, text),
      rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
    });
    floaters.push({ a, x, y, t0: stage.renderer.now });
  };
  // Every frame, the words that are floating rise a little, and are removed when they're done
  stage.world.repeatEvents.push(() => {
    // A copy, because a floater that has finished is removed from the list
    const currentFloaters = [...floaters];
    for (const f of currentFloaters) {
      const t = (stage.renderer.now - f.t0) / 800;
      if (t >= 1) { f.a.remove(); floaters.splice(floaters.indexOf(f), 1); } else f.a.rigidBody.setCenter(f.x, f.y - t);
    }
  });
  /**
   * Play a sound, at a pitch
   *
   * @param file   The sound file
   * @param rate   How fast to play it: 1 is normal, and 2 is an octave higher
   * @param volume How loud, from 0 to 1
   */
  const sfx = (file: string, rate = 1, volume = 1) => {
    const s = stage.musicLibrary.getSound(file);
    if (!s) return;
    const id = s.play();
    s.rate(rate, id);
    s.volume(volume, id);
  };
  // ANCHOR_END: impact_helpers

  // --- The dock ------------------------------------------------------------------------------
  const FLOOR = 6.6;
  // ANCHOR: dock
  /** The sky, the sea, a ship, and the planks of the dock */
  const dock = () => {
    const rect = (cx: number, cy: number, w: number, h: number, color: string, z: -4 | -3 | -2 = -4) => spawn({ appearance: new FilledBox({ width: w, height: h, fillColor: color, z }), rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { collisionsEnabled: false }) });
    rect(8, 2.2, 16, 4.4, "#f2a65a");
    rect(8, 1.2, 16, 2.4, "#e8805a");
    rect(8, 5.2, 16, 3.0, "#3a6b9a");
    rect(8, 6.0, 16, 1.4, "#2f5a86");
    spawn({ appearance: new FilledCircle({ radius: 1.1, fillColor: "#ffe9a8", z: -3 }), rigidBody: new CircleBody({ cx: 3, cy: 3.8, radius: 0.1 }, { collisionsEnabled: false }) });
    // A ship in the distance
    spawn({ appearance: [new FilledPolygon({ vertices: [{ x: -1.2, y: 0 }, { x: 1.2, y: 0 }, { x: 0.8, y: 0.5 }, { x: -0.8, y: 0.5 }], fillColor: "#2a1a10", z: -3 }), new FilledPolygon({ vertices: [{ x: 0, y: -1.6 }, { x: 0.9, y: -0.1 }, { x: 0, y: -0.1 }], fillColor: "#3a2a20", z: -3 })], rigidBody: new BoxBody({ cx: 12.5, cy: 3.8, width: 0.5, height: 0.5 }, { collisionsEnabled: false }) });
    // The dock: planks, and posts
    rect(8, FLOOR + 1.3, 16, 2.6, "#6b4a2b", -3);
    for (let i = 0; i < 8; i++) rect(1 + i * 2, FLOOR + 1.3, 0.05, 2.6, "#4a2f18", -2);
    rect(8, FLOOR + 0.05, 16, 0.12, "#8a5e34", -2);
    const postXs = [0.6, 15.4];
    for (const x of postXs) rect(x, FLOOR - 0.6, 0.4, 1.7, "#4a2f18", -2);
  };
  // ANCHOR_END: dock

  // --- One duel -------------------------------------------------------------------------------
  /**
   * Run one duel, from the first step to the last blow, and then report how it went
   *
   * @param opp    Who the player is fighting
   * @param finish What to do when it's over, given whether the player won
   */
  const duel = (opp: Opponent, finish: (won: boolean) => void) => {
    clearScreen();
    dock();
    // The ground is invisible walls, so that nobody falls off the dock
    const wallXs = [0.5, 15.5];
    for (const x of wallXs) spawn({ appearance: new FilledBox({ width: 0.2, height: 4, fillColor: "#00000000" }), rigidBody: new BoxBody({ cx: x, cy: FLOOR - 1, width: 0.2, height: 4 }) });

    /** Who is who, by actor */
    const byActor = new Map<Actor, Fighter>();
    /** The game freezes while this is in the future (the pause on a blow) */
    let frozenUntil = 0;
    // ANCHOR: over_flag
    /** Is the duel over? */
    let over = false;
    // ANCHOR_END: over_flag
    // ANCHOR: swing_fn
    // ANCHOR: sword_behavior
    /**
     * A sword.  `PunchBehavior` makes a hitbox on the actor's own body for a
     * moment, and, when the hitbox touches something, it calls `onPunchContact`.
     * The standard one deals damage to a hazard, and this game has no hazards,
     * so this is where the rules of a hit go instead.
     */
    class Sword extends PunchBehavior {
      /** @param onHit What to do when the sword touches another fighter */
      constructor(private onHit: (attacker: Fighter, defender: Fighter) => void) { super({ damage: 1 }); }
      onPunchContact(self: Actor, other: Actor) {
        const attacker = byActor.get(self), defender = byActor.get(other);
        if (!attacker || !defender) return;
        // One swing hits once
        self.rigidBody.disablePunch();
        this.onHit(attacker, defender);
      }
    }
    // ANCHOR_END: sword_behavior
    // ANCHOR_END: swing_fn

    // ANCHOR: make_fighter
    /**
     * Make a fighter, standing at a place, facing the middle of the dock
     *
     * @param name       What they're called
     * @param x          Where they stand
     * @param hp         How many hits they can take
     * @param speed      How fast they walk
     * @param color      The HTML hex color of the ring that says which fighter they are
     * @param controller Who decides what they do
     */
    const makeFighter = (name: string, x: number, hp: number, speed: number, color: string, controller: Controller): Fighter => {
      const guardFx = new FilledPolygon({ vertices: [{ x: 0, y: -0.9 }, { x: 0.35, y: -0.5 }, { x: 0.35, y: 0.5 }, { x: 0, y: 0.9 }], fillColor: "#00000000", lineWidth: 0.08, lineColor: "#00000000", z: 2 });
      const hurtRing = new FilledCircle({ radius: 0.8, fillColor: "#00000000", z: 0 });
      const actor = spawn({
        appearance: [new FilledCircle({ radius: 0.55, fillColor: color + "55", lineWidth: 0.07, lineColor: color, z: -1, offset: { dx: 0, dy: 0.85 } }), hurtRing, fighterSprite(3.6, () => f), guardFx],
        rigidBody: new CircleBody({ cx: x, cy: FLOOR - 0.45, radius: 0.4 }, { dynamic: true, disableRotation: true, density: 5 }),
        // ANCHOR: fighter_behavior
        behaviors: new Sword((a, d) => resolveHit(a, d)),
        // ANCHOR_END: fighter_behavior
      });
      const f: Fighter = {
        name, actor, face: x < 8 ? 1 : -1, phase: "idle", phaseEnds: 0, hp, maxHp: hp, stamina: STAMINA, blockSince: -9999,
        walking: false, knockVx: 0, knockUntil: 0, speed, controller, guardFx, hurtRing,
      };
      byActor.set(actor, f);
      return f;
    };
    // ANCHOR_END: make_fighter

    // ANCHOR: set_phase
    /**
     * Change what a fighter is doing, and for how long
     *
     * @param f      The fighter
     * @param phase  What they're doing now
     * @param ms     How long it lasts
     */
    const setPhase = (f: Fighter, phase: Phase, ms: number) => {
      f.phase = phase;
      f.phaseEnds = stage.renderer.now + ms;
      // The picture only changes when it's asked to, so ask now
      getAppearance(f.actor, AnimatedSprite).restartCurrentAnimation();
    };
    // ANCHOR_END: set_phase

    // ANCHOR: resolve_hit
    /**
     * A sword has touched a fighter.  What happens depends on what the
     * defender was doing.
     *
     * @param attacker Whose sword it is
     * @param defender Who it touched
     */
    const resolveHit = (attacker: Fighter, defender: Fighter) => {
      // ANCHOR: now_var
      const now = stage.renderer.now;
      // ANCHOR_END: now_var
      if (over || defender.phase == "down") return;
      // ANCHOR: at_var
      const at = defender.actor.rigidBody.getCenter();
      // ANCHOR_END: at_var
      // ANCHOR: guard_rules
      if (defender.phase == "block") {
        if (now - defender.blockSince <= PARRY_WINDOW) {
          // A parry: the blow is turned back on the attacker
          setPhase(attacker, "stagger", STAGGER);
          // ANCHOR: parry_fx
          defender.guardFx.lineColor = "#ffe066";
          defender.guardFx.fillColor = "#ffe06655";
          later(0.3, () => (defender.guardFx.fillColor = "#00000000"));
          popup(at.x, at.y - 1.6, "PARRY!", "#ffe066");
          sparks(at.x + defender.face * 0.6, at.y - 0.2, ["#ffe066", "#ffffff"], 24);
          sfx("high_pitch.ogg", 2.0);
          // ANCHOR_END: parry_fx
          defender.stamina = Math.min(STAMINA, defender.stamina + 30);
        } else {
          // A block: no damage, but the guard takes the weight of it
          defender.stamina -= BLOCK_COST;
          // ANCHOR: block_fx
          popup(at.x, at.y - 1.6, "Blocked", "#9fd0ff");
          sparks(at.x + defender.face * 0.6, at.y - 0.2, ["#9fd0ff", "#ffffff"], 10);
          sfx("low_pitch.ogg", 1.4);
          // ANCHOR_END: block_fx
          // A guard that runs out of stamina is broken, and the defender is left open
          if (defender.stamina <= 0) { defender.stamina = 0; setPhase(defender, "stagger", STAGGER); }
        }
        // ANCHOR: knockback
        push(attacker, -attacker.face * 3, 120);
        push(defender, attacker.face * 3, 120);
        // ANCHOR_END: knockback
        return;
      }
      // ANCHOR_END: guard_rules
      // A hit: it hurts, and whatever the defender was doing is interrupted
      defender.hp -= 1;
      // ANCHOR: hit_fx
      popup(at.x, at.y - 1.6, "-1", "#ff6b6b");
      sparks(at.x, at.y - 0.2, ["#ff3b3b", "#ffffff", "#ffcc33"], 22);
      shake(220, 0.18);
      sfx("low_pitch.ogg", 0.7);
      // ANCHOR_END: hit_fx
      // ANCHOR: hit_stop
      // The whole game stops for a moment, which is what makes a hit feel solid
      frozenUntil = now + HITSTOP;
      attacker.phaseEnds += HITSTOP;
      // ANCHOR_END: hit_stop
      // ANCHOR: knockback_hit
      push(defender, attacker.face * 5.5, 170);
      // ANCHOR_END: knockback_hit
      if (defender.hp <= 0) {
        setPhase(defender, "down", 99999);
        end(defender);
      } else {
        setPhase(defender, "hurt", HURT);
      }
    };
    // ANCHOR_END: resolve_hit

    // ANCHOR: push_fn
    /**
     * Knock a fighter sideways for a moment
     *
     * @param f  The fighter
     * @param vx How fast, and which way
     * @param ms How long
     */
    const push = (f: Fighter, vx: number, ms: number) => { f.knockVx = vx; f.knockUntil = stage.renderer.now + ms; };
    // ANCHOR_END: push_fn

    // ANCHOR: step_fn
    /**
     * Let a fighter do one frame of what they want to do.  The same rules are
     * used for the player and the computer; they only differ in who chooses
     * the intent.
     *
     * @param f      The fighter
     * @param foe    The other fighter
     * @param intent What they want to do
     * @param dt     How many seconds have gone by
     */
    const step = (f: Fighter, foe: Fighter, intent: Intent, dt: number) => {
      const body = f.actor.rigidBody;
      // ANCHOR: stamina_regen
      // Stamina comes back while a fighter isn't swinging or guarding
      if (f.phase == "idle" || f.phase == "recovery") f.stamina = Math.min(STAMINA, f.stamina + 26 * dt);
      // ANCHOR_END: stamina_regen
      // ANCHOR: step_done
      const now = stage.renderer.now;
      // Nothing happens until the phase that they're in is over
      const done = now >= f.phaseEnds;
      // ANCHOR_END: step_done
      // ANCHOR: knocked
      if (now < f.knockUntil) { body.setVelocity(f.knockVx, 0); return; }
      // ANCHOR_END: knocked
      switch (f.phase) {
        case "idle": {
          if (foe.phase != "down") { const face = foe.actor.rigidBody.getCenter().x > body.getCenter().x ? 1 : -1; if (face != f.face) { f.face = face; getAppearance(f.actor, AnimatedSprite).restartCurrentAnimation(); } }
          // ANCHOR: begin_guard
          if (intent.block && f.stamina > 0) { f.blockSince = now; setPhase(f, "block", 99999); body.setVelocity(0, 0); break; }
          // ANCHOR_END: begin_guard
          // ANCHOR: begin_swing
          if (intent.attack && f.stamina >= SWING_COST) {
            f.stamina -= SWING_COST;
            setPhase(f, "windup", WINDUP);
            body.setVelocity(0, 0);
            break;
          }
          // ANCHOR_END: begin_swing
          const walking = intent.move != 0;
          body.setVelocity(intent.move * f.speed, 0);
          if (walking != f.walking) { f.walking = walking; getAppearance(f.actor, AnimatedSprite).restartCurrentAnimation(); }
          break;
        }
        case "windup":
          // ANCHOR: swing_phases
          body.setVelocity(0, 0);
          if (done) {
            setPhase(f, "active", ACTIVE);
            // The blade is out: for this long, it can hit
            getBehavior(f.actor, PunchBehavior).punch({ offset: { dx: f.face * 0.95, dy: 0 }, radius: 0.45, duration: ACTIVE / 1000 });
          }
          break;
        case "active":
          body.setVelocity(f.face * 2.5, 0);
          if (done) setPhase(f, "recovery", RECOVERY);
          break;
        case "recovery":
          body.setVelocity(0, 0);
          if (done) setPhase(f, "idle", 0);
          break;
          // ANCHOR_END: swing_phases
        // ANCHOR: block_case
        case "block":
          body.setVelocity(0, 0);
          if (!intent.block) setPhase(f, "idle", 0);
          break;
        // ANCHOR_END: block_case
        // ANCHOR: hurt_case
        case "stagger": case "hurt":
          body.setVelocity(0, 0);
          if (done) setPhase(f, "idle", 0);
          break;
        // ANCHOR_END: hurt_case
        case "down":
          body.setVelocity(0, 0);
          break;
      }
    };
    // ANCHOR_END: step_fn

    // The two fighters
    // ANCHOR: controls
    /** The keys that the player uses */
    const held = { l: false, r: false, block: false };
    let attackPressed = false;
    stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => (held.l = true));
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => (held.l = false));
    stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => (held.r = true));
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => (held.r = false));
    stage.keyboard.setKeyDownHandler([KeyCodes.KEY_J, KeyCodes.KEY_Z], () => (attackPressed = true));
    stage.keyboard.setKeyDownHandler([KeyCodes.KEY_K, KeyCodes.KEY_X], () => (held.block = true));
    stage.keyboard.setKeyUpHandler([KeyCodes.KEY_K, KeyCodes.KEY_X], () => (held.block = false));
    /** The player is a controller: it turns the keys into an intent */
    const player: Controller = () => {
      const intent: Intent = { move: held.r && !held.l ? 1 : held.l && !held.r ? -1 : 0, attack: attackPressed, block: held.block };
      attackPressed = false;
      return intent;
    };
    // ANCHOR_END: controls

    // ANCHOR: opp_controller
    /** The opponent's controller */
    const brain: Controller = ai(opp);
    // ANCHOR_END: opp_controller

    const me = makeFighter("You", 4, 5, 3.4, "#4da3ff", player);
    const them = makeFighter(opp.name, 12, opp.hp, opp.speed, "#ff5a4d", brain);
    // Both fighters, for the things that happen to each of them
    const fighters = [me, them];

    // ANCHOR: loop
    // Every frame, each fighter does what their controller says
    loops.push((dt: number) => {
      const now = stage.renderer.now;
      if (now < frozenUntil) { me.actor.rigidBody.setVelocity(0, 0); them.actor.rigidBody.setVelocity(0, 0); return; }
      step(me, them, me.controller(me, them, now), dt);
      step(them, me, them.controller(them, me, now), dt);
      // ANCHOR: guard_fx_loop
      for (const f of fighters) {
        f.guardFx.offset = { dx: f.face * 0.85, dy: 0.1 };
        f.guardFx.lineColor = f.phase == "block" ? (stage.renderer.now - f.blockSince <= PARRY_WINDOW ? "#ffe066" : "#9fd0ff") : "#00000000";
      }
      // ANCHOR_END: guard_fx_loop
      // ANCHOR: hurt_fx_loop
      for (const f of fighters) f.hurtRing.fillColor = f.phase == "hurt" ? "#ff3b3b55" : "#00000000";
      // ANCHOR_END: hurt_fx_loop
    });
    // ANCHOR_END: loop

    // ANCHOR: end_fn
    /**
     * The duel is over, because someone has been beaten
     *
     * @param loser Who lost
     */
    const end = (loser: Fighter) => {
      over = true;
      later(1.3, () => finish(loser !== me));
    };
    // ANCHOR_END: end_fn

    // ANCHOR: hud
    // The hit points, stamina, and names
    /**
     * A row of hearts, a stamina bar, and a name, for one fighter
     *
     * @param f     The fighter
     * @param x     The x coordinate of the left edge
     * @param color The HTML hex color of the stamina bar
     */
    const panel = (f: Fighter, x: number, color: string) => {
      label(x, 0.4, () => f.name, 26, "#ffffff", false);
      label(x, 0.95, () => "♥".repeat(Math.max(0, f.hp)) + "♡".repeat(Math.max(0, f.maxHp - f.hp)), 28, "#ff6b6b", false);
      // ANCHOR: stamina_bar
      const fill = new FilledBox({ width: 3, height: 0.2, fillColor: color, z: 1 });
      spawn({ appearance: [new FilledBox({ width: 3.1, height: 0.3, fillColor: "#000000aa", z: 0 }), fill], rigidBody: new BoxBody({ cx: x + 1.5, cy: 1.7, width: 3, height: 0.3 }, { scene: stage.hud, collisionsEnabled: false }) });
      loops.push(() => { const w = Math.max(0.001, 3 * f.stamina / STAMINA); fill.width = w; fill.offset = { dx: -(3 - w) / 2, dy: 0 }; });
      // ANCHOR_END: stamina_bar
    };
    panel(me, 0.4, "#6bd6ff");
    panel(them, 12.6, "#ffb36b");
    // ANCHOR_END: hud
    // ANCHOR: taunt
    label(8, 3.1, opp.taunt, 30, "#fff3d0");
    // ANCHOR_END: taunt
  };

  // --- The screens around a duel -------------------------------------------------------------------
  // ANCHOR: flow

  /**
   * A screen with some words and some buttons
   *
   * @param title   The big words
   * @param lines   Smaller words under them
   * @param buttons The buttons, from top to bottom
   * @param color   The HTML hex color of the title
   */
  const screen = (title: string, lines: string[], buttons: { text: string, action: () => void }[], color = "#ffd35a") => {
    clearScreen();
    dock();
    label(8, 1.6, title, 54, color);
    lines.forEach((l, i) => label(8, 2.7 + i * 0.5, l, 24, "#fff3d0"));
    buttons.forEach((b, i) => button(8, 4.6 + i * 1.3, 5, 1.0, i == 0 ? "#8a2f2f" : "#3a4f7a", b.text, b.action));
  };

  // ANCHOR: round_fns
  /**
   * Fight one round of the tournament
   *
   * @param round The opponent, by number
   * @param prize The doubloons that have been won so far
   */
  const fightRound = (round: number, prize: number) => {
    const opp = OPPONENTS[round];
    duel(opp, (won) => {
      if (!won) return defeated(round, prize);
      // ANCHOR: bank
      // A win is banked at once: the next opponent, and the prize, are written down
      const earned = prize + opp.prize;
      if (round + 1 == OPPONENTS.length) { PROGRESS.clear(); return champion(earned); }
      PROGRESS.set(new Progress(round + 1, earned));
      // ANCHOR_END: bank
      screen(`${opp.name} yields!`, [`+${opp.prize} doubloons (${earned} so far)`, `Next: ${OPPONENTS[round + 1].name}`, "Your progress is saved."], [{ text: "Next duel", action: () => fightRound(round + 1, earned) }], "#9fe8b0");
    });
  };

  /**
   * The player lost.  What's been won so far is kept, and the same opponent can be fought again.
   *
   * @param round The opponent who won
   * @param prize The doubloons that had been won
   */
  const defeated = (round: number, prize: number) => screen(
    `Bested by ${OPPONENTS[round].name}`,
    [`You keep your ${prize} doubloons, and your place in the tournament.`],
    [{ text: `Rematch: ${OPPONENTS[round].name}`, action: () => fightRound(round, prize) }, { text: "Start over", action: () => { PROGRESS.clear(); title(); } }],
    "#ff8a8a",
  );

  /**
   * The player has beaten everyone
   *
   * @param prize The doubloons won
   */
  const champion = (prize: number) => {
    sfx("win_sound.ogg");
    screen("Champion of the Dock!", [`${prize} doubloons, and the dawn is yours.`], [{ text: "Fight again", action: title }]);
  };
  // ANCHOR_END: round_fns

  /** The title screen, with a way to carry on from where the last session left off */
  const title = () => {
    const saved = PROGRESS.get();
    screen("DUEL AT DAWN", ["Move: A, D    Swing: J    Guard: K"], [
      saved ? { text: `Continue: ${OPPONENTS[saved.round].name}`, action: () => fightRound(saved.round, saved.prize) } : { text: "Begin the tournament", action: () => fightRound(0, 0) },
      ...(saved ? [{ text: "Start over", action: () => { PROGRESS.clear(); fightRound(0, 0); } }] : []),
    ]);
  };
  // ANCHOR_END: flow

  // ANCHOR: begin
  title();
  // ANCHOR_END: begin
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
