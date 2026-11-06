import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledRoundedBox, KeyCodes, Scene, SessionValue, SolidBehavior, SoundEffectComponent, stage, TextSprite, TimedEvent } from "jetlag2d";
import { endScreen, requireWelcomeClick } from "../common/common";

/**
 * HELPERS for Brick Band.
 *
 * Everything in this file is provided, and you don't have to edit it.  It is the game: the walls, the bricks, the paddle, the ball,
 * the score, and the combo.  The feedback that the player gets (sounds, notes, speech, floating points, and the HUD) is what you write.
 */

/**
 * The feedback that the game gives the player, which you write: how to make the walls sound, how to play a note, how
 * to say something out loud, how to pop up some text where a brick was, and how to put text on the HUD.  The game calls them
 * at the right moments.
 */
export interface Feedback {
  /** Make the sound that a wall makes when it's hit, or nothing */
  wallSounds: () => SoundEffectComponent | undefined;
  /** Play a sound at some pitch (the `rate`) and `volume` */
  note: (file: string, rate: number, volume?: number) => void;
  /** Say something out loud */
  say: (text: string) => void;
  /** Float some text up from a spot, and make it go away */
  popText: (x: number, y: number, text: string, color: string) => void;
  /** Put some text on the HUD, which is asked for again on every frame */
  hud: (x: number, y: number, size: number, face: string, color: string, text: () => string) => void;
}

/** A pentatonic scale, as playback rates.  Row 0 is the top row. */
const SCALE = [2.0, 1.68, 1.5, 1.26, 1.12, 1.0];
const ROW_COLORS = ["#ff5d8f", "#ff9f1c", "#ffd23f", "#3bceac", "#1fa2ff", "#9b5de5"];

/**
 * Levels.  A digit is a normal brick in that row's color; T is tough (two
 * hits), X is metal (unbreakable), and * is gold (drops a wide-paddle
 * capsule).
 */
const LEVELS = [
  ["0000000000", "1111111111", "2222222222", "3333333333", "4444444444", "5555555555"],
  ["0.0.0*0.0.", ".1.1.1.1.1", "2T2T22T2T2", "3.3.3.3.3.", "XX44XX44XX", "5555*55555"],
  ["T0T0T0T0T0", "1*11111*11", "2X2X22X2X2", "3333333333", "4T4T44T4T4", "X5555555X5"],
];

/** The state of a run, which has to survive moving from level to level */
export class Run {
  /** Which level is being played (0 is the first) */
  level = 0;
  /** The score so far */
  score = 0;
  /** How many lives are left */
  lives = 3;
  /** The best score, which is kept from one run to the next */
  best = 0;
  /** How many bricks have been broken */
  broken = 0;
  /** How many bricks have been faced, broken or not */
  total = 0;
}
/** The state of the current run, which is made the first time that it is asked for */
export const RUN = new SessionValue<Run>("brick", () => new Run());

// ANCHOR: welcome
/** The first screen: a click is needed before the browser will play any sound */
export function welcome(thisLevel: () => void) {
  DebugToggle.enable();
  stage.backgroundColor = "#140a2a";
  requireWelcomeClick(() => stage.switchTo(thisLevel));
}
// ANCHOR_END: welcome

/**
 * Build one level of Brick Band: the walls, the bricks, the paddle and its controls, the ball, and the capsules, the score and the combo, and
 * the HUD.  It gives the player feedback by calling the functions in `fb`.
 *
 * @param thisLevel The builder function for a level, so that a level can start the next one (or the same one again)
 * @param fb        The feedback functions
 *
 * @returns The state of the run (`r`), `levelDone` (which celebrates a win), and `yes` and `no` (the two answers to "Continue?")
 */
export function startLevel(thisLevel: () => void, fb: Feedback) {
  DebugToggle.enable();
  const r = RUN.get();
  const layout = LEVELS[r.level % LEVELS.length];
  const speedUp = 1 + 0.12 * r.level;
  stage.backgroundColor = "#140a2a";
  // ANCHOR: state_vars
  let combo = 0, wide = false;
  // ANCHOR_END: state_vars

  // Walls and ceiling make a low "thunk" all by themselves
  const edges = [{ l: -1, t: 0.6, r: 0.2, b: 9.5 }, { l: 15.8, t: 0.6, r: 17, b: 9.5 }, { l: -1, t: 0, r: 17, b: 0.8 }];
  for (const e of edges)
    new Actor({
      appearance: new FilledBox({ width: e.r - e.l, height: e.b - e.t, fillColor: "#2a1a52" }),
      rigidBody: new BoxBody({ cx: (e.l + e.r) / 2, cy: (e.t + e.b) / 2, width: e.r - e.l, height: e.b - e.t }, { elasticity: 1 }),
      behaviors: new SolidBehavior(),
      // ANCHOR: wall_sound_use
      sounds: fb.wallSounds(),
      // ANCHOR_END: wall_sound_use
    });

  // Bricks
  layout.forEach((row, ri) => {
    for (let ci = 0; ci < row.length; ci++) {
      const ch = row[ci];
      if (ch == ".") continue;
      const cx = 1.3 + ci * 1.49, cy = 1.5 + ri * 0.55;
      const metal = ch == "X", tough = ch == "T", gold = ch == "*";
      let hits = tough ? 2 : 1;
      const color = metal ? "#8d99ae" : gold ? "#ffd700" : ROW_COLORS[ri];
      const face = new FilledRoundedBox({ width: 1.4, height: 0.46, radius: 0.08, fillColor: color, lineWidth: tough ? 0.08 : 0.04, lineColor: tough ? "#ffffff" : "#00000055" });
      // ANCHOR: brick_counting
      if (!metal) stage.score.counters.add("bricks", 1);
      // ANCHOR_END: brick_counting
      const brick: Actor = new Actor({
        appearance: face,
        rigidBody: new BoxBody({ cx, cy, width: 1.4, height: 0.46 }, { elasticity: 1 }),
        behaviors: new SolidBehavior({
          onContact: (_self: Actor, other: Actor) => {
            if (other != ball) return;
            if (metal) {
              // ANCHOR: metal_note
              fb.note("low_pitch.ogg", 0.7);
              // ANCHOR_END: metal_note
              return;
            }
            hits -= 1;
            // ANCHOR: brick_note
            // Every brick plays its row's note, a little higher as the combo grows
            fb.note("high_pitch.ogg", SCALE[ri] * (1 + 0.03 * Math.min(combo, 12)));
            // ANCHOR_END: brick_note
            if (hits > 0) { face.lineColor = "#00000055"; face.lineWidth = 0.04; return; }
            brick.remove();
            // ANCHOR: brick_score
            // Each brick in a row, without the ball touching the paddle, is worth more
            combo += 1;
            r.broken += 1;
            const points = 10 * combo;
            r.score += points;
            fb.popText(cx, cy, combo > 1 ? `+${points}  x${combo}` : `+${points}`, color);
            // ANCHOR: say_combo
            if (combo == 8) fb.say("Combo!");
            // ANCHOR_END: say_combo
            // ANCHOR_END: brick_score
            if (gold) capsule(cx, cy);
            // ANCHOR: brick_done
            // One fewer brick to go.  The win condition (below) notices when there are none.
            stage.score.counters.add("bricks", -1);
            // ANCHOR_END: brick_done
          },
        }),
      });
      if (!metal) r.total += 1;
    }
  });

  // The paddle.  Where the ball hits it decides where the ball goes next.
  const paddleLook = new FilledRoundedBox({ width: 2.2, height: 0.3, radius: 0.15, fillColor: "#f1f1f1", lineWidth: 0.05, lineColor: "#9b5de5" });
  const paddle = new Actor({
    appearance: paddleLook,
    rigidBody: new BoxBody({ cx: 8, cy: 8.3, width: 2.2, height: 0.3 }, { kinematic: true, elasticity: 1 }),
    behaviors: new SolidBehavior({
      onContact: (self: Actor, other: Actor) => {
        if (other != ball) return;
        const half = (wide ? 3.4 : 2.2) / 2;
        const offset = Math.max(-1, Math.min(1, (other.rigidBody.getCenter().x - self.rigidBody.getCenter().x) / half));
        const angle = offset * 1.05;
        other.rigidBody.setVelocity(Math.sin(angle) * ballSpeed(), -Math.cos(angle) * ballSpeed());
        // ANCHOR: sad_combo
        if (combo >= 5) fb.note("slow_down.ogg", 1, 0.6);
        // ANCHOR_END: sad_combo
        // ANCHOR: combo_reset
        combo = 0;
        // ANCHOR_END: combo_reset
      },
    }),
    // ANCHOR: paddle_sound
    sounds: new SoundEffectComponent({ collide: "flap_flap.ogg" }),
    // ANCHOR_END: paddle_sound
  });
  const setWide = (on: boolean) => {
    wide = on;
    paddle.resize(on ? 3.4 / 2.2 : 2.2 / 3.4);
    paddleLook.lineColor = on ? "#ffd700" : "#9b5de5";
  };

  // Keyboard or mouse moves the paddle
  const held = { l: false, r: false };
  let mouseX: number | undefined;
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; mouseX = undefined; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => (held.l = false));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; mouseX = undefined; });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => (held.r = false));
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: {
      onMouseHover: (_a: Actor, c: { x: number, y: number }) => { mouseX = c.x; return true; },
      onTap: () => { launch(); return true; },
    },
  });

  // The ball
  let ball: Actor | undefined, launched = false;
  const ballSpeed = () => 8.5 * speedUp;
  const newBall = () => {
    launched = false;
    const p = paddle.rigidBody.getCenter();
    ball = new Actor({
      appearance: new FilledCircle({ radius: 0.18, fillColor: "#ffffff", lineWidth: 0.04, lineColor: "#ffd23f", z: 1 }),
      rigidBody: new CircleBody({ cx: p.x, cy: p.y - 0.4, radius: 0.18 }, { dynamic: true, elasticity: 1 }),
      behaviors: new SolidBehavior(),
      // ANCHOR: ball_sound
      // A lost ball plays its sound automatically, when it's removed
      sounds: new SoundEffectComponent({ disappear: "lose_sound.ogg" }),
      // ANCHOR_END: ball_sound
    });
    ball.rigidBody.body.SetBullet(true);
    ball.rigidBody.body.SetFixedRotation(true);
  };
  const launch = () => {
    if (!ball || launched) return;
    launched = true;
    ball.rigidBody.setVelocity((stage.random.next() - 0.5) * 4, -ballSpeed());
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, launch);
  newBall();

  stage.world.repeatEvents.push(() => {
    // Paddle
    const px = paddle.rigidBody.getCenter().x;
    const target = mouseX ?? (held.r == held.l ? px : held.r ? 15.5 : 0.5);
    const half = (wide ? 3.4 : 2.2) / 2;
    const clamped = Math.max(0.2 + half, Math.min(15.8 - half, target));
    paddle.rigidBody.setVelocity(Math.max(-16, Math.min(16, (clamped - px) * 14)), 0);
    if (!ball) return;
    const b = ball.rigidBody.getCenter();
    if (!launched) { ball.rigidBody.setCenter(px, 7.9); ball.rigidBody.setVelocity(0, 0); return; }
    // Keep the ball at a steady speed, and never too flat
    const v = ball.rigidBody.getVelocity();
    let vx = v.x, vy = v.y;
    const s = Math.hypot(vx, vy) || 1;
    vx = vx / s * ballSpeed(); vy = vy / s * ballSpeed();
    if (Math.abs(vy) < ballSpeed() * 0.3) { vy = Math.sign(vy || -1) * ballSpeed() * 0.3; vx = Math.sign(vx) * Math.sqrt(ballSpeed() ** 2 - vy * vy); }
    ball.rigidBody.setVelocity(vx, vy);
    // Lost ball
    if (b.y > 9.4) {
      ball.remove();
      ball = undefined;
      // ANCHOR: combo_reset
      combo = 0;
      // ANCHOR_END: combo_reset
      if (wide) setWide(false);
      r.lives -= 1;
      // ANCHOR: say_last
      if (r.lives == 1) fb.say("Last ball!");
      // ANCHOR_END: say_last
      if (r.lives > 0) stage.world.timer.addEvent(new TimedEvent(0.8, false, newBall));
      // ANCHOR: lost_else
      // With no balls left, the lose condition (below) ends the level
      // ANCHOR_END: lost_else
    }
  });

  /** A gold brick drops a capsule; catch it for a wider paddle */
  function capsule(cx: number, cy: number) {
    const c = new Actor({
      appearance: [new FilledRoundedBox({ width: 0.7, height: 0.3, radius: 0.15, fillColor: "#ffd700" }), new TextSprite({ center: true, face: "Arimo Regular", size: 12, color: "#3d2a00" }, "WIDE")],
      rigidBody: new BoxBody({ cx, cy, width: 0.7, height: 0.3 }, { collisionsEnabled: false }),
    });
    stage.world.repeatEvents.push(() => {
      if (!c.enabled) return;
      const p = c.rigidBody.getCenter(), q = paddle.rigidBody.getCenter();
      c.rigidBody.setCenter(p.x, p.y + 0.05);
      if (Math.abs(p.y - q.y) < 0.3 && Math.abs(p.x - q.x) < (wide ? 1.9 : 1.3)) {
        c.remove();
        // ANCHOR: capsule_note
        fb.note("high_pitch.ogg", 2.5);
        // ANCHOR_END: capsule_note
        if (!wide) setWide(true);
        stage.world.timer.addEvent(new TimedEvent(12, false, () => { if (wide) setWide(false); }));
      } else if (p.y > 9.5) c.remove();
    });
  }

  /**
   * The level is won: celebrate, and move on to the next one
   *
   * @param scene Which scene's timers to use.  A win overlay freezes the
   *              world's timers, so the overlay has to use its own.
   */
  function levelDone(scene: Scene) {
    // Disabling (rather than removing) the ball skips its "disappear" sound
    if (ball) { ball.enabled = false; ball = undefined; }
    r.level += 1;
    // Say so, on the screen
    new Actor({
      appearance: new TextSprite({ center: true, face: "Roboto Black", size: 56, color: "#ffd23f", strokeColor: "#000000", strokeWidth: 6 }, "Level complete!"),
      rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 0.1, height: 0.1 }, { scene, collisionsEnabled: false }),
    });
    // ANCHOR: fanfare
    // A little fanfare: the whole scale, top to bottom
    SCALE.forEach((rate, i) => scene.timer.addEvent(new TimedEvent(0.1 + i * 0.12, false, () => fb.note("high_pitch.ogg", rate))));
    // ANCHOR_END: fanfare
    // ANCHOR: say_level
    fb.say(`Level ${r.level + 1}!`);
    // ANCHOR_END: say_level
    scene.timer.addEvent(new TimedEvent(1.3, false, () => stage.switchTo(thisLevel)));
  }

  // ANCHOR: game_over
  /** The end: read back what happened */
  function gameOver(overlay: Scene) {
    r.best = Math.max(r.best, r.score);
    endScreen(overlay, {
      title: "GAME OVER",
      detail: `Score: ${r.score}    Best: ${r.best}\nYou reached level ${r.level + 1}, and broke ${r.broken} of the ${r.total} bricks you faced (${Math.round(100 * r.broken / Math.max(1, r.total))}%)`,
      prompt: "Click or press Enter to play again",
      next: () => { const again = new Run(); again.best = r.best; RUN.set(again); stage.switchTo(thisLevel); },
      background: "#140a2a", titleColor: "#ff5d8f", detailColor: "#aab3c5",
    });
    // ANCHOR: say_over
    fb.say("Game over");
    // ANCHOR_END: say_over
  }
  // ANCHOR_END: game_over

  // ANCHOR: yes_no
  // Continuing costs half the score, and starts the level over with three balls
  const yes = () => { stage.clearOverlay(); r.lives = 3; r.score = Math.floor(r.score / 2); stage.switchTo(thisLevel); return true; };
  const no = () => { stage.clearOverlay(); stage.requestOverlay(gameOver); return true; };
  // ANCHOR_END: yes_no

  // ANCHOR: hud_lines
  // The HUD, in a custom font.  Every value is a function, so it's always current.
  fb.hud(0.4, 0.05, 30, "Roboto Black", "#ffd23f", () => `${r.score}`);
  fb.hud(4.0, 0.12, 22, "Arimo Regular", "#ff5d8f", () => "●".repeat(Math.max(0, r.lives)));
  fb.hud(7.0, 0.1, 24, "Roboto Black", "#3bceac", () => (combo > 1 ? `combo x${combo}` : ""));
  fb.hud(12.8, 0.12, 22, "Arimo Regular", "#aab3c5", () => `Level ${r.level + 1}`);
  if (r.level == 0 && r.broken == 0) fb.hud(4.2, 6.2, 22, "Arimo Regular", "#aab3c5", () => (launched || !ball ? "" : "Space or click to launch.  Arrows or mouse to move."));
  // ANCHOR_END: hud_lines

  return { r, levelDone, yes, no };
}
