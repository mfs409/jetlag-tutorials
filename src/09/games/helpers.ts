import { Actor, BoxBody, ChaseMovement, CircleBody, CollectableBehavior, DebugToggle, DIRECTION, FilledBox, FilledCircle, FilledPolygon, getBehavior, GoalBehavior, HazardBehavior, JumpBehavior, KeyCodes, Path, PathMovement, PlayerControlBehavior, ScoreService, SolidBehavior, stage, TextSprite, TimedEvent, TouchPlateBehavior } from "jetlag2d";
import { hudBar, hudButton } from "../common/common";

/**
 * The microgames.  Each one is a builder, wrapped in a shared "frame" that
 * handles the countdown bar and reporting the result.  Each one is also a
 * tiny callback to an earlier chapter.
 *
 * This file doesn't import anything from the rest of the cabinet.  When a
 * microgame ends, it calls the `over` function that it was given, and
 * whoever is running the cabinet decides what happens next.
 *
 * It also has the state of a run, and the pieces that the screens are made of
 * (`title`, `label`, and `button`).  Everything in this file is provided, and
 * you don't have to edit it.
 */

// ANCHOR: micro
/** What a microgame is: how to show it, when it unlocks, and how to build it */
export interface Micro {
  /** The name to show in the menu */
  name: string;
  /** What to tell the player to do, as the microgame starts */
  instruction: string;
  /** The best score that the player needs before this microgame is unlocked */
  unlockAt: number;
  /** Build the microgame, at some speed, and say how it ended by calling `over` */
  build: (speed: number, over: (won: boolean) => void) => void;
}
// ANCHOR_END: micro

export const MICROS: Micro[] = [
  { name: "Catch", instruction: "CATCH!", unlockAt: 0, build: catchMicro },
  { name: "Squish", instruction: "SQUISH!", unlockAt: 0, build: squishMicro },
  { name: "Sink It", instruction: "SINK IT!", unlockAt: 0, build: sinkMicro },
  { name: "Dodge", instruction: "DODGE!", unlockAt: 4, build: dodgeMicro },
  { name: "Stomp", instruction: "STOMP!", unlockAt: 7, build: stompMicro },
  { name: "Hold It", instruction: "HOLD IT!", unlockAt: 10, build: holdMicro },
];

/**
 * The shared frame for every microgame: a countdown bar, and a `finish`
 * function that shows the result for a moment before telling `over`.
 *
 * @param bg           The background color
 * @param seconds      How long the microgame lasts, at normal speed
 * @param speed        How fast to go (2 is twice as fast)
 * @param over         Who to tell, once it ends, whether the player won
 * @param winOnTimeout Is running out of time a win?
 * @returns            `finish`, to end it early, and `isDone`
 */
function frame(bg: string, seconds: number, speed: number, over: (won: boolean) => void, winOnTimeout: boolean) {
  DebugToggle.enable();
  stage.backgroundColor = bg;
  let done = false;
  const total = seconds / speed;
  const start = stage.score.counters.get(ScoreService.STOPWATCH);
  hudBar({ cx: 8, cy: 0.125, width: 16, height: 0.25, color: "#ffd23f", lowColor: "#ee4266", backColor: "#00000000",
    value: () => 1 - (stage.score.counters.get(ScoreService.STOPWATCH) - start) / total });
  const verdict = new TextSprite({ center: true, face: "Arimo Regular", size: 120, color: "#ffffff", strokeColor: "#000000", strokeWidth: 8 }, "");
  new Actor({ appearance: verdict, rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 0.1, height: 0.1 }, { scene: stage.hud }) });
  const finish = (won: boolean) => {
    if (done) return;
    done = true;
    verdict.producer = won ? "✓" : "✗";
    verdict.color = won ? "#3bceac" : "#ee4266";
    stage.hud.timer.addEvent(new TimedEvent(0.45, false, () => over(won)));
  };
  stage.world.timer.addEvent(new TimedEvent(total, false, () => finish(winOnTimeout)));
  return { finish, isDone: () => done };
}

/** Arrow-key movement for a top-down hero */
function arrows(hero: Actor, speed: number) {
  const held = { l: false, r: false, u: false, d: false };
  const bind = (key: KeyCodes, k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(key, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(key, () => (held[k] = false));
  };
  bind(KeyCodes.KEY_LEFT, "l"); bind(KeyCodes.KEY_RIGHT, "r"); bind(KeyCodes.KEY_UP, "u"); bind(KeyCodes.KEY_DOWN, "d");
  stage.world.repeatEvents.push(() => hero.rigidBody.setVelocity(((held.r ? 1 : 0) - (held.l ? 1 : 0)) * speed, ((held.d ? 1 : 0) - (held.u ? 1 : 0)) * speed));
}

function walls(color = "#00000000") {
  const edges = [{ l: -1, t: -1, r: 17, b: 0.3 }, { l: -1, t: 8.9, r: 17, b: 10 }, { l: -1, t: 0, r: 0, b: 9 }, { l: 16, t: 0, r: 17, b: 9 }];
  for (const e of edges)
    new Actor({
      appearance: new FilledBox({ width: e.r - e.l, height: e.b - e.t, fillColor: color }),
      rigidBody: new BoxBody({ cx: (e.l + e.r) / 2, cy: (e.t + e.b) / 2, width: e.r - e.l, height: e.b - e.t }),
      behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
    });
}

/**
 * Catch three fireflies (Chapter 1)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function catchMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#0b1430", 5, speed, over, false);
  walls();
  const hero = new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#e9dcc0" }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.4 }),
    behaviors: new PlayerControlBehavior(),
  });
  arrows(hero, 6 * speed);
  for (let i = 0; i < 3; i++) {
    const a = stage.random.next() * Math.PI * 2, d = 3 + stage.random.next() * 3;
    new Actor({
      appearance: [new FilledCircle({ radius: 0.45, fillColor: "#d4ff4a33" }), new FilledCircle({ radius: 0.14, fillColor: "#d4ff4a" })],
      rigidBody: new CircleBody({ cx: Math.min(15, Math.max(1, 8 + Math.cos(a) * d * 1.5)), cy: Math.min(8, Math.max(1, 4.5 + Math.sin(a) * d)), radius: 0.35 }),
      behaviors: new CollectableBehavior({ onCollect: "caught" }),
    });
  }
  stage.world.repeatEvents.push(() => { if (stage.score.counters.get("caught") >= 3) f.finish(true); });
}

/**
 * Squish the bugs before they reach the flower (Chapter 4)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function squishMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#4f8a3c", 5, speed, over, false);
  // The bugs, so that the flower can tell a bug from anything else that touches it
  const bugs = new Set<Actor>();
  const flower = new Actor({
    appearance: [new FilledCircle({ radius: 0.6, fillColor: "#ff7eb6" }), new FilledCircle({ radius: 0.25, fillColor: "#ffd23f" })],
    rigidBody: new CircleBody({ cx: 8, cy: 4.8, radius: 0.6 }),
    behaviors: new TouchPlateBehavior({ eligible: (o: Actor) => bugs.has(o), onEnter: () => f.finish(false) }),
  });
  let left = 4;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 2 * (i / 4) + stage.random.next() * 0.8;
    const bug = new Actor({
      appearance: new FilledCircle({ radius: 0.32, fillColor: "#b3261e", lineWidth: 0.05, lineColor: "#5c120e" }),
      rigidBody: new CircleBody({ cx: 8 + Math.cos(a) * 7.5, cy: 4.8 + Math.sin(a) * 4, radius: 0.32 }, { kinematic: true }),
      movement: new ChaseMovement({ speed: 1.2 * speed, target: flower }),
      gestures: {
        onTap: (me: Actor) => {
          me.remove();
          left -= 1;
          if (left == 0) f.finish(true);
          return true;
        },
      },
    });
    bugs.add(bug);
  }
}

/**
 * Sink a putt past a sliding gate (Chapter 2)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function sinkMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#2f7a3a", 5, speed, over, false);
  walls("#6d4c2f");
  const ball = new Actor({
    appearance: new FilledCircle({ radius: 0.25, fillColor: "#ffffff" }),
    rigidBody: new CircleBody({ cx: 2, cy: 4.5, radius: 0.25 }, { density: 3 }),
    behaviors: new PlayerControlBehavior(),
  });
  ball.rigidBody.setDamping(0.6);
  new Actor({
    appearance: new FilledBox({ width: 0.4, height: 2.5, fillColor: "#7b8b99" }),
    rigidBody: new BoxBody({ cx: 8, cy: 2, width: 0.4, height: 2.5 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(8, 1.6).to(8, 7.6).to(8, 1.6), velocity: 5 * speed, loop: true }),
    behaviors: new SolidBehavior(),
  });
  new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#111111", lineWidth: 0.05, lineColor: "#dddddd" }),
    rigidBody: new CircleBody({ cx: 14, cy: 4.5, radius: 0.4 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({ onArrival: () => { f.finish(true); return true; } }),
  });
  // The aim swings up and down by itself; Space shoots
  const aim = new FilledBox({ width: 1.4, height: 0.08, fillColor: "#ffffff" });
  const aimer = new Actor({ appearance: aim, rigidBody: new BoxBody({ cx: 2.9, cy: 4.5, width: 0.05, height: 0.05 }, { collisionsEnabled: false }) });
  let shot = false;
  const angle = () => Math.sin(stage.score.counters.get(ScoreService.STOPWATCH) * 2.2 * speed) * 0.6;
  stage.world.repeatEvents.push(() => {
    if (shot) return;
    aimer.rigidBody.setCenter(2 + Math.cos(angle()) * 0.95, 4.5 + Math.sin(angle()) * 0.95);
    aimer.rigidBody.rotation = angle();
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    if (shot) return;
    shot = true;
    aim.fillColor = "#00000000";
    ball.rigidBody.setVelocity(Math.cos(angle()) * 11, Math.sin(angle()) * 11);
  });
}

/**
 * Survive a patrolling seal and a chasing gull (Chapter 3)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function dodgeMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#dcebf5", 4, speed, over, true);
  walls();
  const hero = new Actor({
    appearance: [new FilledCircle({ radius: 0.35, fillColor: "#1d2328" }), new FilledCircle({ radius: 0.2, fillColor: "#ffffff", offset: { dx: 0, dy: 0.06 } })],
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.35 }),
    behaviors: new PlayerControlBehavior(),
  });
  arrows(hero, 5);
  const caught = new TouchPlateBehavior({ onEnter: () => f.finish(false) });
  new Actor({
    appearance: new FilledCircle({ radius: 0.5, fillColor: "#7d8a96" }),
    rigidBody: new CircleBody({ cx: 2, cy: 2, radius: 0.5 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(2, 2).to(14, 2).to(14, 7).to(2, 7).to(2, 2), velocity: 6 * speed, loop: true }),
    behaviors: caught,
  });
  new Actor({
    appearance: [new FilledCircle({ radius: 0.3, fillColor: "#fbfbfb" }), new FilledPolygon({ vertices: [{ x: -0.6, y: 0 }, { x: 0, y: -0.1 }, { x: 0.6, y: 0 }, { x: 0, y: 0.1 }], fillColor: "#bbbbbb" })],
    rigidBody: new CircleBody({ cx: 15, cy: 8, radius: 0.3 }, { kinematic: true }),
    movement: new ChaseMovement({ speed: 2.6 * speed, target: hero }),
    behaviors: new TouchPlateBehavior({ onEnter: () => f.finish(false) }),
  });
}

/**
 * Stomp the crab, side view (Chapter 6)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function stompMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#8fd3f4", 5, speed, over, false);
  stage.world.gravity = { x: 0, y: 20 };
  walls("#e8cf8f");
  new Actor({
    appearance: new FilledBox({ width: 16, height: 1, fillColor: "#e8cf8f" }),
    rigidBody: new BoxBody({ cx: 8, cy: 8.5, width: 16, height: 1 }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
  const hero = new Actor({
    appearance: new FilledBox({ width: 0.6, height: 0.9, fillColor: "#5a3a2a" }),
    rigidBody: new BoxBody({ cx: 3, cy: 7.4, width: 0.6, height: 0.9 }, { disableRotation: true }),
    behaviors: [new PlayerControlBehavior(), new JumpBehavior()],
  });
  const held = { l: false, r: false };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (held.l = true));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => (held.l = false));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (held.r = true));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (held.r = false));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_SPACE], () => getBehavior(hero, JumpBehavior).jump(0, -10));
  stage.world.repeatEvents.push(() => (hero.rigidBody.xVelocity = ((held.r ? 1 : 0) - (held.l ? 1 : 0)) * 5));
  new Actor({
    appearance: [new FilledCircle({ radius: 0.4, fillColor: "#e4572e" }), new FilledCircle({ radius: 0.14, fillColor: "#e4572e", offset: { dx: -0.42, dy: -0.15 } }), new FilledCircle({ radius: 0.14, fillColor: "#e4572e", offset: { dx: 0.42, dy: -0.15 } })],
    rigidBody: new CircleBody({ cx: 11, cy: 7.6, radius: 0.4 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(13.5, 7.6).to(6, 7.6).to(13.5, 7.6), velocity: 3 * speed, loop: true }),
    behaviors: new HazardBehavior({
      onContact: (zone: DIRECTION) => (zone == DIRECTION.N ? -1 : 1),
      onDefeated: () => f.finish(true),
    }),
  });
  // Getting touched from the side removes the hero; that's a loss
  stage.world.repeatEvents.push(() => { if (!hero.enabled) f.finish(false); });
}

/**
 * Be standing on the plate when time runs out (Chapter 5)
 *
 * @param speed How fast to go (2 is twice as fast)
 * @param over  Who to tell, once it ends, whether the player won
 */
function holdMicro(speed: number, over: (won: boolean) => void) {
  const f = frame("#1f232b", 4, speed, over, false);
  stage.world.gravity = { x: 0, y: 20 };
  walls("#3a4050");
  const solid = (l: number, t: number, r: number, b: number) => new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#3a4050" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
  solid(0, 8, 16, 9);
  solid(10, 5.5, 14, 5.9);
  const robot = new Actor({
    appearance: new FilledBox({ width: 0.6, height: 0.8, fillColor: "#3c7de0" }),
    rigidBody: new BoxBody({ cx: 2, cy: 7.5, width: 0.6, height: 0.8 }, { disableRotation: true }),
    behaviors: [new PlayerControlBehavior(), new JumpBehavior()],
  });
  const held = { l: false, r: false };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (held.l = true));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_LEFT, () => (held.l = false));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (held.r = true));
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_RIGHT, () => (held.r = false));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_SPACE], () => getBehavior(robot, JumpBehavior).jump(0, -11));
  stage.world.repeatEvents.push(() => (robot.rigidBody.xVelocity = ((held.r ? 1 : 0) - (held.l ? 1 : 0)) * 6));
  // The plate knows when someone is on it, thanks to `onEnter` and `onLeave`
  let onPlate = false;
  const look = new FilledBox({ width: 1.2, height: 0.15, fillColor: "#9b8cff" });
  new Actor({
    appearance: look,
    rigidBody: new BoxBody({ cx: 12.5, cy: 5.42, width: 1.2, height: 0.16 }),
    behaviors: new TouchPlateBehavior({
      onEnter: () => { onPlate = true; look.fillColor = "#f5e663"; },
      onLeave: () => { onPlate = false; look.fillColor = "#9b8cff"; },
    }),
  });
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 20, color: "#aab3c5" }, "stand here when time runs out"),
    rigidBody: new BoxBody({ cx: 12, cy: 4.6, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(4 / speed - 0.05, false, () => f.finish(onPlate)));
}

// ANCHOR: run_class
/**
 * The state of one run through the cabinet.  It lives in session storage,
 * because every microgame and every screen is a fresh `switchTo`, and
 * anything kept in a local variable would be forgotten along the way.
 */
export class Run {
  /** How many lives are left */
  lives = 4;
  /** How many microgames have been won */
  score = 0;
  /** How fast things go (2 is twice as fast) */
  speed = 1;
  /** Which microgames this run may use (all unlocked ones, or one to practice) */
  pool: number[];
  /** The microgame that comes next */
  next: number;
  /** Did the last microgame end in a win, a loss, or has the run just begun? */
  last: "start" | "won" | "lost" = "start";

  /**
   * Begin a run
   *
   * @param pool The numbers of the microgames that this run may use
   * @param next The number of the microgame that comes first
   */
  constructor(pool: number[], next: number) {
    this.pool = pool;
    this.next = next;
  }
}
// ANCHOR_END: run_class

/**
 * Some big text, with an outline
 *
 * @param text  The text
 * @param y     The y coordinate of the center of the text
 * @param size  The font size
 * @param color The HTML hex color of the text
 */
export function title(text: string, y: number, size: number, color: string) {
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size, color, strokeColor: "#000000", strokeWidth: 5 }, text),
    rigidBody: new BoxBody({ cx: 8, cy: y, width: 0.1, height: 0.1 }),
  });
}

/**
 * Some text
 *
 * @param text  The text
 * @param y     The y coordinate of the center of the text
 * @param size  The font size
 * @param color The HTML hex color of the text
 */
export function label(text: string, y: number, size: number, color: string) {
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size, color }, text),
    rigidBody: new BoxBody({ cx: 8, cy: y, width: 0.1, height: 0.1 }),
  });
}

/**
 * A button that can be clicked, or triggered with a key
 *
 * @param cx     The x coordinate of the center of the button
 * @param cy     The y coordinate of the center of the button
 * @param w      The width of the button
 * @param h      The height of the button
 * @param color  The HTML hex color of the button
 * @param text   The words on the button
 * @param action What the button does.  Without one, the button is grayed out.
 * @param key    A key that does the same thing, if any
 */
export function button(cx: number, cy: number, w: number, h: number, color: string, text: string, action?: () => void, key?: KeyCodes) {
  hudButton({ cx, cy, width: w, height: h, label: text, color, action, key, face: "Arimo Regular", fontSize: Math.min(24, h * 26), scene: stage.world });
}
