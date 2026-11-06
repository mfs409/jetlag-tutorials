import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, HazardBehavior, HealthBehavior, ImageSprite, initializeAndLaunch, JetLagGameConfig, ParticleComponent, SolidBehavior, stage, TextSprite, TimedEvent } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
    imageNames: ["pirate.json"],
    soundNames: ["high_pitch.ogg", "low_pitch.ogg", "win_sound.ogg", "lose_sound.ogg"],
  };
}

/**
 * STARTER CODE for Siege of Skull Island.
 *
 * A beach, a cart that can't move, and some pirates who don't care.  The
 * levels are in a table, and the beach, the pirates, and their art are built.
 * Nothing can be fired yet.  The comments below say what each stage adds.
 *
 * TODO (The cannon): a cannon that aims and charges, and fires cannonballs that come from a pool, and go back to it, and a way to win and to lose.
 *
 * TODO (The fort): a fort of crates that are welded together, which a hard hit snaps apart.
 *
 * TODO (The windmill): a windmill, a blade on a revolute joint with a motor, guarding a pirate.
 *
 * TODO (The cart): a cart that drives, on two wheels that each have a joint and a motor.
 *
 * TODO (The campaign): four levels, a par for each, and stars.
 */

// ---------------------------------------------------------------------------
// The levels
// ---------------------------------------------------------------------------

/** Everything that makes one level different from another */
interface Level {
  /** What the level is called */
  name: string;
  /** How many cannonballs you get, and how many it takes to get three stars */
  shots: number; par: number;
  /** Pirates who stand on the sand */
  sand: number[];
  /** A fort, if any: where its left edge is, how many crates wide and tall it is, and how many pirates are on top */
  fort?: { x: number, cols: number, rows: number, crew: number };
  /** Windmills: where the hub is */
  windmills: { x: number, y: number }[];
}

/** The levels, from the easiest to the hardest */
const LEVELS: Level[] = [
  { name: "Sandy Beach", shots: 8, par: 4, sand: [11, 13.5], windmills: [] },
  { name: "The Little Fort", shots: 8, par: 5, sand: [], fort: { x: 11, cols: 2, rows: 3, crew: 2 }, windmills: [] },
  { name: "Windmill Bay", shots: 9, par: 6, sand: [9.2], fort: { x: 12, cols: 2, rows: 4, crew: 2 }, windmills: [{ x: 9.8, y: 5.6 }] },
  { name: "Skull Fortress", shots: 10, par: 8, sand: [8.8], fort: { x: 11, cols: 3, rows: 4, crew: 3 }, windmills: [{ x: 9.2, y: 6.2 }, { x: 14.4, y: 3.0 }] },
];

/** The height of the sand, where everything stands */
const GROUND = 8.2;
/** The most that the cart can drive to the right, and to the left */
export const CART_RANGE = { min: 1.4, max: 6.2 };

/**
 * A pirate's picture
 *
 * @param size How big to draw it
 */
const pirateLook = (size: number) => new ImageSprite({ width: size, height: size, img: "pirate_walk_s_l_0.png", offset: { dx: 0, dy: -0.38 }, z: 1 });

/** Build the beach, and everything on it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#8fd3f4";
  stage.world.gravity = { x: 0, y: 10 };
  const levelNum = 1;
  const level = LEVELS[levelNum - 1];

  // --- Small helpers -----------------------------------------------------------------------
  /**
   * Run some code after a delay
   *
   * @param seconds How long to wait
   * @param fn      What to do
   */
  const later = (seconds: number, fn: () => void) => stage.world.timer.addEvent(new TimedEvent(Math.max(0.0001, seconds), false, fn));
  /**
   * Some text on the HUD
   *
   * @param x     The x coordinate of the left edge
   * @param y     The y coordinate of the top
   * @param size  The font size
   * @param color The HTML hex color
   * @param t     A function that makes the words, every frame
   */
  const hud = (x: number, y: number, size: number, color: string, t: () => string) => new Actor({
    appearance: new TextSprite({ center: false, face: "Roboto Black", size, color, strokeColor: "#000000", strokeWidth: 3 }, t),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  /**
   * Play a sound, at a pitch
   *
   * @param file   The sound file
   * @param rate   How fast to play it
   * @param volume How loud
   */
  const sfx = (file: string, rate = 1, volume = 1) => {
    const s = stage.musicLibrary.getSound(file);
    if (!s) return;
    const id = s.play();
    s.rate(rate, id);
    s.volume(volume, id);
  };
  /**
   * A burst of particles
   *
   * @param x      The x coordinate
   * @param y      The y coordinate
   * @param colors The HTML hex colors to pick from
   * @param count  How many
   */
  const burst = (x: number, y: number, colors: string[], count: number) => {
    const p = new ParticleComponent({ colors, speed: { min: 1, max: 4 }, lifetime: { min: 0.3, max: 0.8 }, size: { min: 0.06, max: 0.16 }, fade: true, z: 2 });
    const a = new Actor({ appearance: p, rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }) });
    p.burst(count);
    later(1, () => a.remove());
  };

  // --- The beach ---------------------------------------------------------------------------------
  new Actor({ appearance: new FilledBox({ width: 16, height: 1.4, fillColor: "#3a8fc4", z: -2 }), rigidBody: new BoxBody({ cx: 8, cy: 6.9, width: 16, height: 1.4 }, { collisionsEnabled: false }) });
  new Actor({
    appearance: new FilledBox({ width: 17, height: 1.6, fillColor: "#e8cf8f", lineWidth: 0.04, lineColor: "#b59a63" }),
    rigidBody: new BoxBody({ cx: 8, cy: GROUND + 0.8, width: 17, height: 1.6 }, { friction: 1 }),
    behaviors: new SolidBehavior(),
  });
  // Walls at the edges, which only the cart and the crates meet, and a ceiling, for the balls that go too high
  const wallXs = [-0.5, 16.5];
  for (const x of wallXs) new Actor({ appearance: new FilledBox({ width: 1, height: 12, fillColor: "#00000000" }), rigidBody: new BoxBody({ cx: x, cy: 3, width: 1, height: 12 }), behaviors: new SolidBehavior({ absorbsProjectiles: false }) });

  // --- The cannonballs ---------------------------------------------------------------------------

  // --- The cart ------------------------------------------------------------------------------------

  // --- The cannon ----------------------------------------------------------------------------------

  // --- The pirates ---------------------------------------------------------------------------------
  /** How many pirates there are, and how many are still standing */
  let crew = 0;
  /**
   * A pirate.  A hazard with some health: a cannonball hurts it, and so does
   * a crate that is moving fast.
   *
   * @param cx The x coordinate of the pirate
   * @param cy The y coordinate of its center
   */
  const pirate = (cx: number, cy: number) => {
    crew += 1;
    const p: Actor = new Actor({
      appearance: pirateLook(1.9),
      rigidBody: new CircleBody({ cx, cy, radius: 0.34 }, { dynamic: true, disableRotation: true, density: 3 }),
      behaviors: [
        new HazardBehavior({
          // Pirates don't hurt anyone: there's nobody on their side of the screen to hurt
          eligible: () => false,
          onDefeated: (self: Actor) => {
            const c = self.rigidBody.getCenter();
            burst(c.x, c.y, ["#ffd35a", "#ff6b6b", "#ffffff"], 30);
            sfx("win_sound.ogg", 1.5, 0.7);
          },
        }),
        new HealthBehavior({ hitPoints: 1 }),
      ],
    });
    return p;
  };
  for (const x of level.sand) pirate(x, GROUND - 0.35);

  // --- The fort ---------------------------------------------------------------------------------------

  // --- The windmills ---------------------------------------------------------------------------------

  // --- Winning and losing ------------------------------------------------------------------------------

  // --- The HUD -----------------------------------------------------------------------------------------------
  hud(0.3, 0.1, 26, "#ffffff", () => `${levelNum}. ${level.name}`);
  hud(0.3, 8.55, 16, "#ffffff", () => "Left/Right: drive   Up/Down: aim   Space: hold, then let go to fire   R: restart");
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
