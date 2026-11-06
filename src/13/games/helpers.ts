import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, GoalBehavior, ImageSprite, KeyCodes, PlayerControlBehavior, Scene, SessionValue, stage, TextSprite } from "jetlag2d";
import { currentLevel, endScreen, floatingText, nextLevel, switchToLevel } from "../common/common";

/**
 * HELPERS for the Back Nine.
 *
 * Everything in this file is provided, and you don't have to edit it.  It is the golf: the turf, the tee, the cup, the ball, aiming
 * and putting, the card, the HUD, and the end screens, which are the same as the front nine's.  What the walls are made of, and which
 * of them are rubber, is what you write.
 */

// ANCHOR: theme_fn
/**
 * Which theme pack to load.  Both sprite sheets use exactly the same frame
 * names ("ball.png", "cup.png", "rail.png", ...), so the game's code never
 * has to know which one it's using.
 */
export function theme() {
  try { return localStorage.getItem("back_nine_theme") ?? "classic"; } catch { return "classic"; }
}
// ANCHOR_END: theme_fn

// ANCHOR: hole_type
/** Everything that makes one hole different from another */
export interface Hole {
  name: string; par: number; tee: [number, number]; cup: [number, number];
  /** Each SVG file, and where its top-left corner goes */
  svgs: { file: string, x: number, y: number }[];
  /** Which segments (in the order SvgSystem reports them) are rubber */
  rubber?: [number, number];
}
// ANCHOR_END: hole_type

/** The strokes taken on each hole so far, kept in session storage so that it survives moving between holes */
const CARD = new SessionValue<number[]>("card9", () => []);

const LIP_OUT_SPEED = 5, MAX_POWER = 16;

/**
 * Build one hole, except for its walls: the turf, the tee, the cup, the ball, aiming and putting, the HUD, and the end screens.  Which hole
 * comes from the current level number.
 *
 * @param thisHole The builder function for a hole, so that R and the end screens can start a hole
 * @param holes    All of the holes
 *
 * @returns The hole that was built, so that the caller can make its walls
 */
export function startHole(thisHole: () => void, holes: Hole[]) {
  DebugToggle.enable();
  const holeNum = currentLevel();
  const hole = holes[holeNum - 1];
  stage.backgroundColor = "#1b2a1e";

  // The turf comes from the theme pack, like everything else we draw
  new Actor({
    appearance: new ImageSprite({ width: 16, height: 9, img: "turf.png", z: -2 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { collisionsEnabled: false }),
  });

  // The tee, the cup, and the ball
  new Actor({
    appearance: new ImageSprite({ width: 0.7, height: 0.7, img: "tee.png", z: -1 }),
    rigidBody: new BoxBody({ cx: hole.tee[0], cy: hole.tee[1], width: 0.7, height: 0.7 }, { collisionsEnabled: false }),
  });
  new Actor({
    appearance: [new ImageSprite({ width: 0.6, height: 0.6, img: "cup.png" }), new ImageSprite({ width: 0.9, height: 0.9, img: "flag.png", offset: { dx: 0.25, dy: -0.55 }, z: 2 })],
    rigidBody: new CircleBody({ cx: hole.cup[0], cy: hole.cup[1], radius: 0.3 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({
      onArrival: (b: Actor) => {
        if (b.rigidBody.getVelocity().Length() > LIP_OUT_SPEED) { floatingText(hole.cup[0], hole.cup[1] - 0.8, "Too fast!"); return false; }
        stage.score.counters.add("sunk", 1);
        return true;
      },
    }),
  });
  const ball = new Actor({
    appearance: new ImageSprite({ width: 0.4, height: 0.4, img: "ball.png", z: 1 }),
    rigidBody: new CircleBody({ cx: hole.tee[0], cy: hole.tee[1], radius: 0.2 }, { density: 3, elasticity: 0 }),
    behaviors: new PlayerControlBehavior(),
  });
  ball.rigidBody.setDamping(0.9);
  ball.rigidBody.setAngularDamping(2);
  ball.rigidBody.body.SetBullet(true);

  // Aiming and putting, just like the front nine
  let angle = Math.atan2(hole.cup[1] - hole.tee[1], hole.cup[0] - hole.tee[0]);
  let turn = 0, charging = false, chargeStart = 0, power = 0, strokes = 0;
  const aim = new FilledBox({ width: 1, height: 0.07, fillColor: "#ffffff", z: 2 });
  const aimLine = new Actor({ appearance: aim, rigidBody: new BoxBody({ cx: -5, cy: -5, width: 0.05, height: 0.05 }, { collisionsEnabled: false }) });
  const resting = () => ball.rigidBody.getVelocity().Length() < 0.12;
  const maxStrokes = hole.par + 3;
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (turn = -2.2));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (turn = 2.2));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (turn = -0.35));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (turn = 0.35));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (turn = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => { if (!charging && resting() && strokes < maxStrokes) { charging = true; chargeStart = stage.renderer.now; } });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_SPACE, () => {
    if (!charging) return;
    charging = false;
    strokes += 1;
    ball.rigidBody.setVelocity(Math.cos(angle) * power * MAX_POWER, Math.sin(angle) * power * MAX_POWER);
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(thisHole));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_T, () => {
    try { localStorage.setItem("back_nine_theme", theme() == "classic" ? "candy" : "classic"); } catch { }
    location.reload();
  });
  stage.world.repeatEvents.push((dt: number) => {
    const now = stage.renderer.now;
    angle += turn * dt;
    if (charging) { const t = ((now - chargeStart) / 900) % 2; power = 0.08 + 0.92 * (t < 1 ? t : 2 - t); } else power = 0;
    const v = ball.rigidBody.getVelocity();
    if (v.Length() < 0.8) ball.rigidBody.setVelocity(v.x * 0.94, v.y * 0.94);
    if (resting()) { ball.rigidBody.setVelocity(0, 0); ball.rigidBody.clearRotation(); }
    const len = 0.6 + 2.8 * power, c = ball.rigidBody.getCenter();
    aim.width = len;
    aim.fillColor = !resting() || strokes >= maxStrokes ? "#00000000" : charging ? "#ff5555" : "#ffffffaa";
    aimLine.rigidBody.setCenter(c.x + Math.cos(angle) * (0.2 + len / 2), c.y + Math.sin(angle) * (0.2 + len / 2));
    aimLine.rigidBody.rotation = angle;
  });
  stage.score.addWinCondition(() => stage.score.counters.get("sunk") > 0);
  stage.score.addLoseCondition(() => strokes >= maxStrokes && resting());

  // HUD
  const card = () => CARD.get();
  const toPar = () => card().reduce((s, n, i) => s + n - holes[i].par, 0);
  const fmt = (n: number) => (n == 0 ? "E" : n > 0 ? `+${n}` : `${n}`);
  hud(0.3, 0.12, `Back Nine, hole ${holeNum}: ${hole.name}`, () => `     Par ${hole.par}     Stroke ${strokes + (resting() ? 1 : 0)}`);
  hud(11.2, 0.12, "", () => `Total: ${fmt(toPar())}     T: theme (${theme()})`);

  const finish = (overlay: Scene, score: number, headline: string) => {
    const c = card();
    c.push(score);
    const next = holeNum < holes.length;
    endScreen(overlay, {
      title: next ? headline : `Round over: ${fmt(toPar())}`,
      detail: next ? `${score} strokes on a par ${hole.par}.  Total: ${fmt(toPar())}` : `Card: ${c.join(" · ")}`,
      prompt: `Click or press Enter: ${next ? "next hole" : "play again"}`,
      next: () => {
        if (next) nextLevel(thisHole);
        else { CARD.clear(); switchToLevel(thisHole, 1); }
      },
      titleColor: "#ffe066",
    });
  };
  const names: { [k: number]: string } = { [-3]: "Albatross!", [-2]: "Eagle!", [-1]: "Birdie!", 0: "Par", 1: "Bogey", 2: "Double bogey", 3: "Triple bogey" };
  stage.score.winSceneBuilder = (overlay: Scene) => finish(overlay, strokes, strokes == 1 ? "Hole in one!" : names[strokes - hole.par] ?? "Holed out");
  stage.score.loseSceneBuilder = (overlay: Scene) => finish(overlay, maxStrokes + 1, "Picked up!");

  return hole;
}

/**
 * Some text on the HUD, which keeps asking for new words
 *
 * @param x     The x coordinate of the left edge of the text
 * @param y     The y coordinate of the top of the text
 * @param fixed Words that never change
 * @param t     A function that makes the rest of the words, every frame
 */
function hud(x: number, y: number, fixed: string, t: () => string) {
  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 22, color: "#ffffff", strokeColor: "#000000", strokeWidth: 3 }, () => fixed + t()),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}
