import { Actor, BoxBody, DebugToggle, KeyCodes, SessionValue, stage, TextSprite } from "jetlag2d";
import { Micro, MICROS, Run } from "./helpers";
import { chooserBuilder, gameOverBuilder, getReadyBuilder, pause, resume } from "./micro_mania_m4_screens";

/**
 * The rules of the cabinet: how a run is played, and how one screen leads to
 * the next.  This file and the screens file import each other.  That's fine,
 * because neither one uses the other's functions until some function runs,
 * long after both files have loaded.
 */

// ANCHOR: run_state
/**
 * Where the current run is kept.  `RUN.get()` always gives back a `Run`, and
 * never needs a cast.  The first read, before any run has begun, makes a run
 * of the first microgame.
 */
export const RUN = new SessionValue<Run>("run", () => new Run([0], 0));
// ANCHOR_END: run_state

// ANCHOR: play_micro
/**
 * Play one microgame.  The microgame is built fresh by `stage.switchTo`, and
 * it tells `microOver` how it ended.  Its instruction is shown in the corner.
 *
 * @param m     The microgame to play
 * @param speed How fast to play it (2 is twice as fast)
 */
export function playMicro(m: Micro, speed: number) {
  stage.switchTo(() => {
    DebugToggle.enable();
    m.build(speed, microOver);
    new Actor({
      appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 22, color: "#ffffff", strokeColor: "#000000", strokeWidth: 3 }, m.instruction),
      rigidBody: new BoxBody({ cx: 0.3, cy: 0.4, width: 0.1, height: 0.1 }, { scene: stage.hud }),
    });
    // ANCHOR: pause_keys
    // P pauses and resumes, Q quits to the menu from the pause screen, and
    // losing the window's focus pauses by itself
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_P, () => (stage.overlay ? resume() : pause()));
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_Q, () => { if (stage.overlay) { resume(); stage.switchTo(chooserBuilder); } });
    stage.visibility.onLoseVisibility = async () => pause();
    // ANCHOR_END: pause_keys
  });
}
// ANCHOR_END: play_micro

// ANCHOR: run_logic
/**
 * Start a run: the full cabinet, or endless practice of one microgame
 *
 * @param practice The microgame to practice, if it's not the full cabinet
 */
export function startRun(practice?: number) {
  // ANCHOR: pool_choice
  const pool = practice !== undefined ? [practice] : unlocked();
  // ANCHOR_END: pool_choice
  RUN.set(new Run(pool, pick(pool, -1)));
  stage.switchTo(getReadyBuilder);
}

/**
 * Called by a microgame when it's won or lost
 *
 * @param won Did the player win?
 */
export function microOver(won: boolean) {
  const r = RUN.get();
  r.last = won ? "won" : "lost";
  if (won) {
    r.score += 1;
    // Every fifth win, everything gets faster
    if (r.score % 5 == 0) r.speed = Math.min(2.2, r.speed * 1.18);
  } else {
    r.lives -= 1;
  }
  r.next = pick(r.pool, r.next);
  stage.switchTo(r.lives > 0 ? getReadyBuilder : gameOverBuilder);
}

/**
 * Choose a microgame, trying not to repeat the last one
 *
 * @param pool The numbers of the microgames to choose from
 * @param last The number of the one that was just played
 * @returns    The number of the next one
 */
function pick(pool: number[], last: number) {
  if (pool.length == 1) return pool[0];
  let n = last;
  while (n == last) {
    n = pool[Math.floor(stage.random.next() * pool.length)];
  }
  return n;
}
// ANCHOR_END: run_logic

// ANCHOR: best_score
/**
 * What the cabinet remembers from one visit to the next.  Persistent storage can
 * only hold plain data, so this is a class with nothing but fields.
 */
class Progress {
  /** The best score ever */
  best = 0;
}

/**
 * The cabinet's progress.  The first time that it is read, which is at the start,
 * it is loaded from persistent storage.  After that, the game only works with
 * this copy, and saves it when there's something worth saving.
 */
const PROGRESS = new SessionValue<Progress>("progress", () => stage.storage.loadPersistent("micro_mania", new Progress()));

/** The best score ever */
export function bestScore() {
  return PROGRESS.get().best;
}

/**
 * Record a finished run, and report any microgames it unlocked
 *
 * @param score The score of the run that just ended
 * @returns     The numbers of the microgames that are newly unlocked
 */
export function recordScore(score: number) {
  const before = unlocked().length;
  if (score > bestScore()) {
    PROGRESS.get().best = score;
    stage.storage.savePersistent("micro_mania", PROGRESS.get());
  }
  return unlocked().slice(before);
}

/**
 * Which microgames are unlocked, based on the best score so far
 *
 * @returns The numbers of the unlocked microgames
 */
export function unlocked() {
  const best = bestScore();
  return MICROS.map((m, i) => ({ m, i })).filter(({ m }) => best >= m.unlockAt).map(({ i }) => i);
}
// ANCHOR_END: best_score
