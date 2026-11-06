import { Actor, ActorPoolSystem, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, findBehavior, getBehavior, HazardBehavior, HealthBehavior, ImageSprite, initializeAndLaunch, JetLagGameConfig, KeyCodes, ParticleComponent, ProjectileMovement, SolidBehavior, stage, TextSprite, ThrowableBehavior, TimedEvent } from "jetlag2d";
import type { b2Joint } from "jetlag2d";
import { currentLevel, endScreen, nextLevel, switchToLevel } from "../common/common";

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
    soundNames: ["high_pitch.ogg", "low_pitch.ogg", "win_sound.ogg", "lose_sound.ogg"],
  };
}
// ANCHOR_END: config

/**
 * Siege of Skull Island: drive your cannon cart along the beach, and knock
 * down the pirates' fort with cannonballs.
 *
 * Left and Right drive the cart.  Up and Down aim.  Hold Space to charge a
 * shot, and let go to fire.  R starts the level over.
 *
 * Every cannonball comes from a pool, and goes back to it.  The fort is
 * crates that are welded together, and a hard hit snaps a crate's welds.  The
 * windmill is a blade on a revolute joint, with a motor.  The cart is a body
 * on two wheels, each with a motor.
 */

// ---------------------------------------------------------------------------
// The levels
// ---------------------------------------------------------------------------

// ANCHOR: level_type
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
// ANCHOR_END: level_type

/** The height of the sand, where everything stands */
const GROUND = 8.2;
/** The most that the cart can drive to the right, and to the left */
const CART_RANGE = { min: 1.4, max: 6.2 };

// ANCHOR: pirate_sprite
/**
 * A pirate's picture
 *
 * @param size How big to draw it
 */
const pirateLook = (size: number) => new ImageSprite({ width: size, height: size, img: "pirate_walk_s_l_0.png", offset: { dx: 0, dy: -0.38 }, z: 1 });
// ANCHOR_END: pirate_sprite

/** Build the beach, and everything on it */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#8fd3f4";
  stage.world.gravity = { x: 0, y: 10 };
  // ANCHOR: pick_level
  const levelNum = currentLevel();
  // ANCHOR_END: pick_level
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
  const sand = new Actor({
    appearance: new FilledBox({ width: 17, height: 1.6, fillColor: "#e8cf8f", lineWidth: 0.04, lineColor: "#b59a63" }),
    rigidBody: new BoxBody({ cx: 8, cy: GROUND + 0.8, width: 17, height: 1.6 }, { friction: 1 }),
    behaviors: new SolidBehavior(),
  });
  // Walls at the edges, which only the cart and the crates meet, and a ceiling, for the balls that go too high
  const wallXs = [-0.5, 16.5];
  for (const x of wallXs) new Actor({ appearance: new FilledBox({ width: 1, height: 12, fillColor: "#00000000" }), rigidBody: new BoxBody({ cx: x, cy: 3, width: 1, height: 12 }), behaviors: new SolidBehavior({ absorbsProjectiles: false }) });

  // --- The cannonballs ---------------------------------------------------------------------------
  // ANCHOR: pool
  /** The balls, which are used again and again */
  const balls = new ActorPoolSystem();
  /** All of the balls, whether or not they're in the pool, so that we can tell which are flying */
  const allBalls: Actor[] = [];
  /** When each ball was fired */
  const firedAt = new Map<Actor, number>();
  for (let i = 0; i < 6; i++) {
    // ANCHOR: ball_actor
    const ball: Actor = new Actor({
      appearance: [new FilledCircle({ radius: 0.22, fillColor: "#2b2f38", lineWidth: 0.04, lineColor: "#000000", z: 2 }), new FilledCircle({ radius: 0.07, fillColor: "#7a808c", offset: { dx: -0.07, dy: -0.07 }, z: 2 })],
      // The cart, its wheels, and the balls all have the same pass-through number, so a ball never hits the cart that fired it
      rigidBody: new CircleBody({ cx: -10, cy: -10, radius: 0.22 }, { density: 6, passThroughId: [7] }),
      movement: new ProjectileMovement(),
      behaviors: new ThrowableBehavior({ damage: 1, disappearOnCollide: true, reclaimer: (a: Actor) => balls.put(a) }),
    });
    // ANCHOR_END: ball_actor
    // ANCHOR: reclaim
    // A ball that has been flying too long, or has left the screen, goes back in the pool
    ball.prerenderTasks.push(() => {
      if (!ball.enabled) return;
      const c = ball.rigidBody.getCenter();
      if (stage.renderer.now - (firedAt.get(ball) ?? 0) > 4500 || c.y > 9.6 || c.x > 16.3 || c.x < -0.3) balls.put(ball);
    });
    // ANCHOR_END: reclaim
    allBalls.push(ball);
    balls.put(ball);
  }
  // ANCHOR: shot_limit
  // You only get so many shots, even though a ball can be reused
  balls.limit = level.shots;
  // ANCHOR_END: shot_limit
  // ANCHOR_END: pool

  // --- The cart ------------------------------------------------------------------------------------
  // ANCHOR: cart
  // ANCHOR: cart_body
  /** The body of the cart.  It's a dynamic body, so that the wheels can push it along. */
  const car = new Actor({
    appearance: [new FilledBox({ width: 2.2, height: 0.5, fillColor: "#7a5632", lineWidth: 0.05, lineColor: "#4a2f18" }), new FilledBox({ width: 1.4, height: 0.3, fillColor: "#9b6a3c", offset: { dx: -0.2, dy: -0.35 } })],
    rigidBody: new BoxBody({ cx: 2.5, cy: GROUND - 0.55, width: 2.2, height: 0.5 }, { dynamic: true, density: 1.2, passThroughId: [7] }),
    behaviors: new SolidBehavior(),
  });
  // ANCHOR_END: cart_body
  // ANCHOR: wheels
  /** The joint of each wheel to the cart, each with its own motor */
  const wheelJoints = [-0.8, 0.8].map(dx => {
    const w = new Actor({
      appearance: [new FilledCircle({ radius: 0.32, fillColor: "#3a2a1a", lineWidth: 0.05, lineColor: "#000000" }), new FilledBox({ width: 0.5, height: 0.07, fillColor: "#c9a96a", z: 1 })],
      rigidBody: new CircleBody({ cx: 2.5 + dx, cy: GROUND - 0.32, radius: 0.32 }, { density: 3, friction: 1, passThroughId: [7] }),
      behaviors: new SolidBehavior(),
    });
    // The joint is made from the wheel's side: the cart is the anchor, and the point is on the cart where the axle is
    return w.rigidBody.addRevoluteJoint({ anchor: car, anchorPoint: { x: dx, y: 0.23 }, localPoint: { x: 0, y: 0 }, motor: { speed: 0, torque: 25 } });
  });
  // ANCHOR_END: wheels
  // ANCHOR: drive
  /** Which way the cart is being driven: -1, 0, or 1 */
  let driving = 0;
  /**
   * Set the motors of both wheels.  It's only done when the direction changes.
   *
   * @param dir -1 to drive left, 1 to drive right, 0 to stop
   */
  const drive = (dir: number) => {
    if (dir == driving) return;
    driving = dir;
    for (const j of wheelJoints) { j.SetMotorSpeed(dir * 7); j.SetMaxMotorTorque(dir == 0 ? 40 : 25); }
  };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => drive(-1));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => drive(1));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A, KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => drive(0));
  // The cart can't leave its part of the beach
  stage.world.repeatEvents.push(() => {
    const x = car.rigidBody.getCenter().x;
    if ((x > CART_RANGE.max && driving > 0) || (x < CART_RANGE.min && driving < 0)) drive(0);
  });
  // ANCHOR_END: drive
  // ANCHOR_END: cart

  // --- The cannon ----------------------------------------------------------------------------------
  // ANCHOR: aiming
  /** How high the barrel points, in radians, and how hard the shot will be, from 0 to 1 */
  let angle = 0.7, power = 0, charging = false, chargeStart = 0;
  /** Where the barrel turns, which is a little above the middle of the cart */
  const pivot = () => { const c = car.rigidBody.getCenter(); return { x: c.x - 0.2, y: c.y - 0.45 }; };
  /** The barrel: it has no collisions, and is turned to match the angle */
  const barrel = new Actor({
    appearance: [new FilledBox({ width: 1.5, height: 0.38, fillColor: "#3a3f4a", lineWidth: 0.05, lineColor: "#111111" }), new FilledBox({ width: 0.3, height: 0.5, fillColor: "#6b7280", offset: { dx: 0.7, dy: 0 } })],
    rigidBody: new BoxBody({ cx: 2, cy: 7, width: 1.5, height: 0.38 }, { collisionsEnabled: false }),
  });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => (held.up = true));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W], () => (held.up = false));
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => (held.down = true));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => (held.down = false));
  /** Which of the aiming keys are held */
  const held = { up: false, down: false };
  stage.world.repeatEvents.push((dt: number) => {
    angle = Math.max(0.1, Math.min(1.35, angle + ((held.up ? 1 : 0) - (held.down ? 1 : 0)) * 1.1 * dt));
    const p = pivot();
    barrel.rigidBody.setCenter(p.x + Math.cos(angle) * 0.7, p.y - Math.sin(angle) * 0.7);
    barrel.rigidBody.rotation = -angle;
    if (charging) power = Math.min(1, (stage.renderer.now - chargeStart) / 1100);
  });
  // ANCHOR_END: aiming

  // ANCHOR: firing
  /** How many shots have been fired */
  let fired = 0;
  /** Fire a ball from the end of the barrel, as hard as the power says */
  const fire = () => {
    const ball = balls.get();
    if (!ball) { sfx("low_pitch.ogg", 0.6, 0.6); return; }
    fired += 1;
    firedAt.set(ball, stage.renderer.now);
    const speed = 6 + 10 * power;
    const p = pivot();
    ball.rigidBody.body.SetAwake(true);
    getBehavior(ball, ThrowableBehavior).tossFixedDir({
      actor: car,
      offset: { dx: p.x + Math.cos(angle) * 1.5 - car.rigidBody.getCenter().x, dy: p.y - Math.sin(angle) * 1.5 - car.rigidBody.getCenter().y },
      velocity: { x: Math.cos(angle) * speed, y: -Math.sin(angle) * speed },
    });
    // ANCHOR: fire_fx
    const tip = { x: p.x + Math.cos(angle) * 1.5, y: p.y - Math.sin(angle) * 1.5 };
    burst(tip.x, tip.y, ["#ffcc33", "#ff8c1a", "#ffffff"], 14);
    sfx("low_pitch.ogg", 0.7 + 0.5 * power);
    // ANCHOR_END: fire_fx
    // The cart is pushed back, a little
    car.rigidBody.body.SetAwake(true);
    car.rigidBody.setVelocity(car.rigidBody.getVelocity().x - Math.cos(angle) * 0.8, car.rigidBody.getVelocity().y);
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => { if (!charging) { charging = true; chargeStart = stage.renderer.now; power = 0; } });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_SPACE, () => { if (charging) { charging = false; fire(); power = 0; } });
  // ANCHOR_END: firing

  // --- The pirates ---------------------------------------------------------------------------------
  // ANCHOR: pirates
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
  // ANCHOR_END: pirates

  // --- The fort ---------------------------------------------------------------------------------------
  // ANCHOR: fort
  if (level.fort) {
    const { x, cols, rows, crew: onTop } = level.fort;
    /** The joints that hold each crate in place, so that they can be snapped */
    const welds = new Map<Actor, b2Joint[]>();
    /** The crates, by row and column, so that each can be welded to its neighbors */
    const crates: Actor[][] = [];
    // ANCHOR: snap_fn
    /**
     * Snap every weld that holds a crate, so that it comes loose
     *
     * @param crate The crate
     */
    const snap = (crate: Actor) => {
      const joints = welds.get(crate);
      if (!joints || joints.length == 0) return;
      for (const j of joints) crate.rigidBody.body.GetWorld().DestroyJoint(j);
      welds.set(crate, []);
      const c = crate.rigidBody.getCenter();
      burst(c.x, c.y, ["#c9a96a", "#ffffff", "#7a5632"], 16);
      sfx("low_pitch.ogg", 0.8, 0.8);
    };
    // ANCHOR_END: snap_fn
    for (let r = 0; r < rows; r++) {
      crates.push([]);
      for (let c = 0; c < cols; c++) {
        // ANCHOR: crate_actor
        const crate: Actor = new Actor({
          appearance: [new FilledBox({ width: 0.98, height: 0.98, fillColor: "#9b6a3c", lineWidth: 0.05, lineColor: "#5e3d1c" }), new FilledBox({ width: 0.5, height: 0.5, fillColor: "#b98550", lineWidth: 0.03, lineColor: "#5e3d1c" })],
          rigidBody: new BoxBody({ cx: x + c + 0.5, cy: GROUND - r - 0.5, width: 0.98, height: 0.98 }, { density: 1.5, friction: 0.6 }),
          behaviors: new SolidBehavior({
            // A ball bounces off a crate, and stays in play, so it can keep knocking things over
            absorbsProjectiles: false,
            onContact: (self: Actor, other: Actor) => {
              const speed = other.rigidBody.getVelocity().Length();
              // ANCHOR: snap_rule
              // A hard hit from a cannonball snaps a crate's welds
              if (findBehavior(other, ThrowableBehavior) && speed > 5) snap(self);
              // ANCHOR_END: snap_rule
              // A crate that is moving fast hurts a pirate that it hits
              const hazard = findBehavior(other, HazardBehavior);
              if (hazard && self.rigidBody.getVelocity().Length() > 3) hazard.takeDamage(1, self);
            },
          }),
        });
        // ANCHOR_END: crate_actor
        crates[r].push(crate);
        // ANCHOR: weld_crate
        // Each crate is welded to what's below it (the sand, for the bottom row), and to the crate to its left
        const joints: b2Joint[] = [];
        const below = r == 0 ? sand : crates[r - 1][c];
        joints.push(crate.rigidBody.addWeldJoint(r == 0
          ? { other: sand, otherPoint: { x: x + c + 0.5 - 8, y: -0.8 }, localPoint: { x: 0, y: 0.49 }, angle: 0 }
          : { other: below, otherPoint: { x: 0, y: -0.49 }, localPoint: { x: 0, y: 0.49 }, angle: 0 }));
        if (c > 0) joints.push(crate.rigidBody.addWeldJoint({ other: crates[r][c - 1], otherPoint: { x: 0.49, y: 0 }, localPoint: { x: -0.49, y: 0 }, angle: 0 }));
        welds.set(crate, joints);
        // ANCHOR_END: weld_crate
      }
    }
    // The crew stands on top
    for (let i = 0; i < onTop; i++) pirate(x + (cols * (i + 0.5)) / onTop, GROUND - rows - 0.36);
  }
  // ANCHOR_END: fort

  // --- The windmills ---------------------------------------------------------------------------------
  // ANCHOR: windmills
  for (const w of level.windmills) {
    // ANCHOR: hub
    // The hub is a post that doesn't move, with a ball on top that you can see
    const hub = new Actor({
      appearance: [new FilledBox({ width: 0.2, height: GROUND - w.y, fillColor: "#6b4a2b", offset: { dx: 0, dy: (GROUND - w.y) / 2 }, z: -1 }), new FilledCircle({ radius: 0.25, fillColor: "#c9a227", lineWidth: 0.05, lineColor: "#6b4a2b", z: 2 })],
      rigidBody: new CircleBody({ cx: w.x, cy: w.y, radius: 0.2 }, { collisionsEnabled: false }),
    });
    // ANCHOR_END: hub
    // ANCHOR: blade
    // The blade is a dynamic body, joined to the hub, which a motor keeps turning
    const blade = new Actor({
      appearance: [new FilledBox({ width: 3.0, height: 0.22, fillColor: "#e8e0d0", lineWidth: 0.05, lineColor: "#8a7a5a" }), new FilledBox({ width: 0.22, height: 3.0, fillColor: "#e8e0d0", lineWidth: 0.05, lineColor: "#8a7a5a" })],
      rigidBody: new BoxBody({ cx: w.x, cy: w.y, width: 3.0, height: 0.22 }, { density: 3 }),
      behaviors: new SolidBehavior({ absorbsProjectiles: false }),
    });
    blade.rigidBody.addRevoluteJoint({ anchor: hub, anchorPoint: { x: 0, y: 0 }, localPoint: { x: 0, y: 0 }, motor: { speed: 1.6, torque: Number.POSITIVE_INFINITY } });
    // ANCHOR_END: blade
  }
  // ANCHOR_END: windmills

  // --- Winning and losing ------------------------------------------------------------------------------
  // ANCHOR: rules
  /** How many pirates have been defeated */
  const defeated = () => stage.score.counters.get(HazardBehavior.ENEMIES_DEFEATED);
  stage.score.addWinCondition(() => defeated() >= crew);
  // ANCHOR: out_of_shots
  // Out of cannonballs, with none still flying, and pirates still standing, is a loss
  stage.score.addLoseCondition(() => balls.remaining == 0 && allBalls.every(b => !b.enabled || stage.renderer.now - (firedAt.get(b) ?? 0) > 4400) && defeated() < crew);
  // ANCHOR_END: out_of_shots
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_R, () => stage.switchTo(builder));
  // ANCHOR: stars
  stage.score.winSceneBuilder = (overlay) => {
    const stars = fired <= level.par ? 3 : fired <= level.par + 2 ? 2 : 1;
    const last = levelNum == LEVELS.length;
    endScreen(overlay, {
      title: last ? "The island is yours!" : "Fort taken!",
      detail: `${"★".repeat(stars)}${"☆".repeat(3 - stars)}\n${fired} cannonballs (par ${level.par})`,
      prompt: last ? "Click or press Enter to start over" : "Click or press Enter for the next level",
      next: () => (last ? switchToLevel(builder, 1) : nextLevel(builder)),
      background: "#0d2a3fdd", titleColor: "#ffd35a",
    });
  };
  // ANCHOR_END: stars
  stage.score.loseSceneBuilder = (overlay) => endScreen(overlay, { title: "Out of cannonballs", detail: `${crew - defeated()} pirates left standing`, prompt: "Click or press Enter to try again", next: () => stage.switchTo(builder), background: "#0d2a3fdd", titleColor: "#ff8a8a" });
  // ANCHOR_END: rules

  // --- The HUD -----------------------------------------------------------------------------------------------
  // ANCHOR: hud_fn
  hud(0.3, 0.1, 26, "#ffffff", () => `${levelNum}. ${level.name}`);
  hud(0.3, 0.55, 20, "#ffd35a", () => `Cannonballs: ${balls.remaining}   Pirates: ${crew - defeated()}`);
  // ANCHOR_END: hud_fn
  // ANCHOR: power_bar
  const powerFill = new FilledBox({ width: 2.4, height: 0.22, fillColor: "#ff8c1a", z: 1 });
  new Actor({ appearance: [new FilledBox({ width: 2.5, height: 0.32, fillColor: "#000000aa" }), powerFill], rigidBody: new BoxBody({ cx: 14.4, cy: 0.5, width: 2.5, height: 0.32 }, { scene: stage.hud, collisionsEnabled: false }) });
  hud(12.2, 0.0, 16, "#ffffff", () => "Power");
  stage.world.repeatEvents.push(() => { const w = Math.max(0.001, 2.4 * power); powerFill.width = w; powerFill.offset = { dx: -(2.4 - w) / 2, dy: 0 }; });
  // ANCHOR_END: power_bar
  hud(0.3, 8.55, 16, "#ffffff", () => "Left/Right: drive   Up/Down: aim   Space: hold, then let go to fire   R: restart");
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
