import { DebugToggle, KeyCodes, MusicComponent, stage, TimedEvent } from "jetlag2d";
import { drawMuteButton, requireWelcomeClick } from "../common/common";
import { bestScore, playMicro, recordScore, RUN, startRun, unlocked } from "./micro_mania_m4_flow";
import { MICROS, title, label, button } from "./helpers";

/**
 * The screens that aren't microgames.  None of them have any gameplay; they
 * exist to move the player from one place to the next.
 */

// ANCHOR: start_music
/**
 * Start the cabinet's music, if it isn't going already.  `gameMusic` keeps
 * playing across every `switchTo`, so it never skips a beat between screens.
 */
function startMusic() {
  // Only microgames pause when the window loses focus
  stage.visibility.onLoseVisibility = async () => { };
  if (!stage.gameMusic.get("main"))
    stage.gameMusic.set("main", new MusicComponent(stage.musicLibrary.getMusic("tune2.ogg")));
  stage.gameMusic.get("main")?.play();
}
// ANCHOR_END: start_music

// ANCHOR: splash
/** The very first screen */
export function splashBuilder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1b1035";
  // Browsers won't play any sound until the player has clicked something
  requireWelcomeClick(() => {
    // ANCHOR: use_music
    startMusic();
    // ANCHOR_END: use_music
    stage.switchTo(chooserBuilder);
  });
}
// ANCHOR_END: splash

// ANCHOR: chooser
/**
 * The main menu: play the cabinet, practice one microgame, or read the help
 *
 * @param page Which page of the practice menu to show
 */
// ANCHOR: chooser_sig
export function chooserBuilder(page = 0) {
// ANCHOR_END: chooser_sig
  DebugToggle.enable();
  stage.backgroundColor = "#1b1035";
  // ANCHOR: use_music
  startMusic();
  // ANCHOR_END: use_music
  title("MICRO MANIA", 1.4, 64, "#ffd23f");
  // ANCHOR: chooser_best
  label(`Best score: ${bestScore()}`, 2.4, 24, "#ffffff");
  // ANCHOR_END: chooser_best
  button(8, 3.7, 6, 1.1, "#ee4266", "Play the cabinet  (Enter)", () => startRun(), KeyCodes.KEY_ENTER);
  // ANCHOR: chooser_help
  button(8, 5.0, 6, 0.9, "#3bceac", "How to play  (H)", () => stage.switchTo(helpBuilder), KeyCodes.KEY_H);
  // ANCHOR_END: chooser_help

  // ANCHOR: chooser_practice
  // Practice: a paginated grid of microgames, locked until your best score
  // is high enough
  label("Practice one microgame:", 6.1, 20, "#aab3c5");
  const open = unlocked();
  const perPage = 4;
  const pages = Math.ceil(MICROS.length / perPage);
  MICROS.slice(page * perPage, page * perPage + perPage).forEach((m, j) => {
    const i = page * perPage + j;
    const ok = open.includes(i);
    button(2.9 + j * 3.4, 7.0, 3.1, 0.8, ok ? "#540d6e" : "#333044", ok ? `${i + 1}. ${m.name}` : `locked (${m.unlockAt})`, ok ? () => startRun(i) : undefined, ok ? [KeyCodes.KEY_DIGIT1, KeyCodes.KEY_DIGIT2, KeyCodes.KEY_DIGIT3, KeyCodes.KEY_DIGIT4][j] : undefined);
  });
  if (pages > 1) {
    button(8, 8.2, 3, 0.6, "#333044", `page ${page + 1} of ${pages}  (Tab)`, () => stage.switchTo(() => chooserBuilder((page + 1) % pages)), KeyCodes.KEY_TAB);
  }
  // ANCHOR_END: chooser_practice
  // ANCHOR: mute_button
  drawMuteButton({ cx: 15.3, cy: 0.7, width: 0.8, height: 0.8, scene: stage.world });
  // ANCHOR_END: mute_button
}
// ANCHOR_END: chooser

// ANCHOR: help_screen
/** A content-free screen, with instructions.  It has no win or lose condition, so it never ends by itself. */
export function helpBuilder() {
  DebugToggle.enable();
  stage.backgroundColor = "#1b1035";
  // TODO (Help): This screen should have a song of its own, "tune.ogg".  The cabinet's music steps aside (`pause()`), and `stage.levelMusic` plays
  // for this screen only, and stops at the next `switchTo`.
  title("How to play", 1.2, 48, "#ffd23f");
  [
    "Each microgame lasts about five seconds, and tells you what to do as it starts.",
    "Win, and you move on.  Lose, and you lose a life.  You have four.",
    "Every five wins, everything speeds up.",
    "Arrow keys move, Space acts, and some games use the mouse.",
    "P pauses.  Beat your best score to unlock more microgames.",
  ].forEach((line, i) => label(line, 2.5 + i * 0.8, 22, "#ffffff"));
  button(8, 7.4, 4, 0.9, "#3bceac", "Back  (Enter)", () => stage.switchTo(chooserBuilder), KeyCodes.KEY_ENTER);
}
// ANCHOR_END: help_screen

// ANCHOR: get_ready
/** Between microgames: show how it went, and what's next */
export function getReadyBuilder() {
  DebugToggle.enable();
  const r = RUN.get();
  stage.backgroundColor = r.last == "won" ? "#0f5e46" : r.last == "lost" ? "#6b1025" : "#1b1035";
  // ANCHOR: use_music
  startMusic();
  // ANCHOR_END: use_music
  // ANCHOR: result_sound
  if (r.last != "start") stage.musicLibrary.getSound(r.last == "won" ? "win_sound.ogg" : "lose_sound.ogg")?.play();
  // ANCHOR_END: result_sound
  label(r.last == "won" ? "Nice!" : r.last == "lost" ? "Missed!" : "Get ready!", 1.6, 40, "#ffffff");
  label("♥".repeat(r.lives) + "♡".repeat(4 - r.lives), 2.8, 48, "#ff6b8b");
  label(`Score: ${r.score}${r.speed > 1 ? `      Speed x${r.speed.toFixed(1)}` : ""}`, 3.9, 26, "#ffd23f");
  const m = MICROS[r.next];
  title(m.instruction, 5.6, 72, "#ffffff");
  // The card is only shown for a moment (less, as things speed up), and then the microgame starts
  stage.world.timer.addEvent(new TimedEvent(1.4 / r.speed, false, () => playMicro(m, r.speed)));
}
// ANCHOR_END: get_ready

// ANCHOR: game_over
/** The end of a run */
export function gameOverBuilder() {
  DebugToggle.enable();
  const r = RUN.get();
  // ANCHOR: use_music
  startMusic();
  // ANCHOR_END: use_music
  stage.backgroundColor = "#1b1035";
  title("GAME OVER", 1.8, 64, "#ee4266");
  // ANCHOR: over_labels
  // Record the score (it may unlock something), and show how it compares
  const newlyUnlocked = recordScore(r.score);
  label(`Score: ${r.score}      Best: ${bestScore()}`, 3.2, 30, "#ffffff");
  newlyUnlocked.forEach((i, j) => label(`Unlocked: ${MICROS[i].name}!`, 4.2 + j * 0.6, 24, "#3bceac"));
  // ANCHOR_END: over_labels
  button(5.5, 7, 4.2, 1, "#ee4266", "Again  (Enter)", () => startRun(r.pool.length == 1 ? r.pool[0] : undefined), KeyCodes.KEY_ENTER);
  button(10.5, 7, 4.2, 1, "#540d6e", "Menu  (M)", () => stage.switchTo(chooserBuilder), KeyCodes.KEY_M);
}
// ANCHOR_END: game_over

// ANCHOR: pause_screen
/**
 * Pause a microgame, with an overlay that shows a picture of the game as it
 * was.  The overlay freezes the world's physics and timers, and the music is
 * paused by hand.
 */
export function pause() {
  if (stage.overlay) return;
  stage.gameMusic.get("main")?.pause();
  // TODO (Pause): Pausing only stops the music.  Ask for an overlay, which freezes the world's physics and timers
  // (`stage.requestOverlay`, and its second argument, `true`, asks for a screenshot of the game, which is passed to the overlay's builder, after the
  // overlay's scene).  Show the screenshot, dimmed by a dark box, with "Paused" on top.  A tap on the text resumes.
}

/** Close the pause overlay, and let the world and the music carry on */
export function resume() {
  stage.clearOverlay();
  stage.gameMusic.get("main")?.play();
}
// ANCHOR_END: pause_screen
