import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, DebugToggle, FilledBox, findBehavior, HealthBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, SolidBehavior, stage } from "jetlag2d";
import { boundingBox, heroBehaviors, hudText } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "pirate.json"],
  };
}

/**
 * STARTER CODE for Cove Brawl.
 *
 * The captain can walk around the beach.  There's no one else here.  The
 * comments below say what each stage adds: creatures on teams, and the rules
 * about who hurts whom.
 *
 * TODO (Two teams): crabs and pirates, each on a team, and a table that says who hurts whom, so that crabs pinch you and your cutlass hurts them, and the cove has to be held until sunset.
 *
 * TODO (Friendly fire): your mate, who follows you around, and who the crabs go after, but your cutlass never hurts.
 *
 * TODO (Gulls): a third team, whose gulls hunt crabs and pirates both.
 *
 * TODO (Claws): crabs whose claws turn a cutlass away, unless you swing from above or below.
 *
 * TODO (Bribes): coins that you can drop, which turn a gull to your side.
 *
 * TODO (The team table): every team's rules in one table, and a fourth team, rival pirates, that is added with data alone.
 */

/** The teams.  They're only numbers.  Zero is the default for every actor, and it means "no team". */
const PIRATES = 1;

/** The four directions that the art faces */
type Face = "r" | "l" | "u" | "d";
/** What a pirate can be doing */
type Mode = "idle" | "walk" | "slash";

/** The animation state for each thing that a pirate can do, in each of the four directions */
const STATES: { [mode in Mode]: { [face in Face]: AnimationState } } = {
  idle: { r: AnimationState.IDLE_E, l: AnimationState.IDLE_W, u: AnimationState.IDLE_N, d: AnimationState.IDLE_S },
  walk: { r: AnimationState.WALK_E, l: AnimationState.WALK_W, u: AnimationState.WALK_N, d: AnimationState.WALK_S },
  // A pirate never tosses anything, so the "toss" states are free to mean "swinging a cutlass"
  slash: { r: AnimationState.TOSS_IDLE_E, l: AnimationState.TOSS_IDLE_W, u: AnimationState.TOSS_IDLE_N, d: AnimationState.TOSS_IDLE_S },
};

/**
 * A pirate who walks, and, if there's a cutlass in the art, swings it
 *
 * @param sword Use the art with the cutlass?
 * @param size  How big to draw it, in meters
 * @param now   A function that says what the pirate is doing, and which way it faces,
 *              which JetLag calls when the pirate's state changes
 * @returns     The sprite
 */
function pirateSprite(sword: boolean, size: number, now: () => { face: Face, mode: Mode }) {
  const art = sword ? "walk_s" : "walk";
  const animations = new Map<AnimationState, AnimationSequence>();
  const faces: Face[] = ["r", "l", "u", "d"];
  for (const f of faces) {
    animations.set(STATES.walk[f], AnimationSequence.makeSimple({ timePerFrame: 70, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_${art}_${f}_${i}.png`) }));
    animations.set(STATES.idle[f], AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_${art}_${f}_0.png`] }));
    if (sword) animations.set(STATES.slash[f], AnimationSequence.makeSimple({ timePerFrame: 50, repeat: false, images: [0, 1, 2, 3, 4, 5].map(i => `pirate_slash_s_${f}_${i}.png`) }));
  }
  const sprite = new AnimatedSprite({ width: size, height: size, z: 1, animations, offset: { dx: 0, dy: -0.25 } });
  // JetLag asks which animation to use whenever the actor's state changes (it
  // starts or stops moving, or changes direction), and when `restartCurrentAnimation` is called
  sprite.stateSelector = () => {
    const { face, mode } = now();
    return STATES[mode][face];
  };
  return sprite;
}

/**
 * Which of the four directions a velocity points mostly toward
 *
 * @param v The velocity
 * @param was The direction to keep if the velocity is zero
 */
const faceOf = (v: { x: number, y: number }, was: Face): Face => (Math.hypot(v.x, v.y) < 0.2 ? was : Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? "r" : "l") : (v.y > 0 ? "d" : "u"));

/** Build the cove, and everything in it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#8fd3f4";
  boundingBox();
  // The beach
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#e8cf8f", z: -2 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { collisionsEnabled: false }),
  });
  // A few rocks to get around
  const rocks = [{ cx: 5.5, cy: 3, w: 1.4, h: 1.2 }, { cx: 9.5, cy: 6.3, w: 1.6, h: 1.1 }, { cx: 12.5, cy: 2.5, w: 1.1, h: 1.4 }];
  for (const rock of rocks) {
    new Actor({
      appearance: new FilledBox({ width: rock.w, height: rock.h, fillColor: "#8c7650", lineWidth: 0.05, lineColor: "#5e4e30" }),
      rigidBody: new BoxBody({ cx: rock.cx, cy: rock.cy, width: rock.w, height: rock.h }),
      behaviors: new SolidBehavior(),
    });
  }

  // --- The captain -----------------------------------------------------------
  /** Which of the four direction keys (arrows or WASD) are down right now */
  const held = { l: false, r: false, u: false, d: false };
  /** When the captain's cutlass swing ends (in `stage.renderer.now` time) */
  let slashUntil = 0;
  /** When the captain is done being knocked back by a hit */
  let stunUntil = 0;
  let facing: Face = "d";
  const captainSprite = pirateSprite(true, 2.6, () => ({
    face: facing,
    mode: stage.renderer.now < slashUntil ? "slash" : held.l || held.r || held.u || held.d ? "walk" : "idle",
  }));
  const captain: Actor = new Actor({
    appearance: captainSprite,
    rigidBody: new CircleBody({ cx: 3, cy: 6.5, radius: 0.35 }, { disableRotation: true }),
    // The captain is on the pirates' team.  Six hearts, and the level is lost if he falls.
    behaviors: heroBehaviors({ hitPoints: 6, mustSurvive: true, team: PIRATES }),
  });
  const bind = (keys: KeyCodes[], k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
  };
  bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
  bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
  stage.world.repeatEvents.push(() => {
    if (stage.renderer.now < stunUntil) return;
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    captain.rigidBody.setVelocity(dx / len * 4, dy / len * 4);
    facing = faceOf({ x: dx, y: dy }, facing);
  });

  // --- Everyone else ---------------------------------------------------------

  // --- The cutlass -----------------------------------------------------------------

  // --- Who's here --------------------------------------------------------------------

  // --- Winning and losing ------------------------------------------------------------

  // --- The HUD -----------------------------------------------------------------------
  const hearts = (a: Actor) => (a.enabled ? "♥".repeat(Math.max(0, findBehavior(a, HealthBehavior)?.hitPoints ?? 0)) : "");
  hudText(0.3, 0.1, 22, "#ff6b6b", () => `Captain ${hearts(captain)}`, { outline: "#000000" });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
