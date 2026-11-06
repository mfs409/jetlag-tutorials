import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, GridSystem, JetLagGameConfig, JumpBehavior, KeyCodes, PlayerControlBehavior, SolidBehavior, TextSprite, TimedEvent, getBehavior, initializeAndLaunch, stage } from "jetlag2d";

// [mfs] Does this demo provide value?

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

// Tuning constants for the two jump styles.
const CHARGE_MIN_MS = 50; // holding less than this still counts as a full tap
const CHARGE_MAX_MS = 500; // holding longer than this adds no more charge
const CHARGE_MIN_V = 4; // upward velocity for a bare tap
const CHARGE_MAX_V = 12; // upward velocity for a fully-charged hold

const BOOST_BASE_V = 6; // upward velocity the instant the key goes down
const BOOST_SUSTAIN_V = 9; // upward velocity maintained while boosting
const BOOST_MAX_MS = 300; // how long holding the key can keep boosting

/**
 * Two ways to make "how long you held the button" change how high a jump
 * goes.  Neither one is a feature JetLag provides directly -- `JumpBehavior`
 * only knows how to apply a single velocity when `jump()` is called.
 * Everything variable-height about either hero comes from application code
 * deciding *what velocity* to pass, and *when* to call `jump()`.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Both jump styles rely on gravity pulling the hero back down after
  // `jump()` sets an upward velocity -- without it, the hero would just
  // keep rising forever.
  stage.world.gravity = { x: 0, y: 10 };

  GridSystem.makeGrid(stage.world, { x: 0, y: 0 }, { x: 16, y: 9 });

  // A shared floor. Landing on it resets both heroes' jump count, the same
  // way any SolidBehavior does for any JumpBehavior.
  new Actor({
    appearance: new FilledBox({ width: 16, height: 1, fillColor: "#444444" }),
    rigidBody: new BoxBody({ cx: 8, cy: 8.5, width: 16, height: 1 }),
    behaviors: new SolidBehavior(),
  });

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 22, color: "#3399ff" },
      "Blue: hold ARROW-UP, then release -- height depends on how long you held it",
    ),
    rigidBody: new BoxBody(
      { cx: 0.2, cy: 0.2, width: 15, height: 0.5 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 22, color: "#ff3333" },
      "Red: press SPACE and keep holding -- height depends on how long you hold it",
    ),
    rigidBody: new BoxBody(
      { cx: 0.2, cy: 0.7, width: 15, height: 0.5 },
      { scene: stage.hud },
    ),
  });

  // --- Blue hero: charge while held, jump fires on release -------------

  let charging = false;
  let chargeStart = 0;

  let blueHero = new Actor({
    appearance: new FilledCircle({
      radius: 0.4,
      fillColor: "#3399ff",
      lineWidth: 0.04,
      lineColor: "#003366",
    }),
    rigidBody: new CircleBody({ cx: 4, cy: 7.6, radius: 0.4 }),
    behaviors: [new PlayerControlBehavior(), new JumpBehavior()],
  });

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#3399ff" },
      () =>
        charging
          ? "charging: " +
            Math.min(Date.now() - chargeStart, CHARGE_MAX_MS) +
            "ms"
          : "release to jump",
    ),
    rigidBody: new BoxBody(
      { cx: 0.5, cy: 1.4, width: 4, height: 0.5 },
      { scene: stage.hud },
    ),
  });

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => {
    // The browser re-fires `keydown` every time the OS's key-repeat kicks
    // in, not just once on the initial press. Without this guard, each of
    // those repeats would reset `chargeStart` back to "now", so the charge
    // could never build past the repeat interval -- it would keep
    // snapping back down instead of climbing toward `CHARGE_MAX_MS`.
    if (charging) return;
    charging = true;
    chargeStart = Date.now();
  });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_UP, () => {
    if (!charging) return;
    charging = false;
    let held = Math.max(
      CHARGE_MIN_MS,
      Math.min(Date.now() - chargeStart, CHARGE_MAX_MS),
    );
    let frac = (held - CHARGE_MIN_MS) / (CHARGE_MAX_MS - CHARGE_MIN_MS);
    let v = CHARGE_MIN_V + frac * (CHARGE_MAX_V - CHARGE_MIN_V);
    (getBehavior(blueHero, JumpBehavior)).jump(0, -v);
  });

  // --- Red hero: jump fires immediately, holding extends it ------------

  let boosting = false;
  let boostStart = 0;

  let redHero = new Actor({
    appearance: new FilledCircle({
      radius: 0.4,
      fillColor: "#ff3333",
      lineWidth: 0.04,
      lineColor: "#660000",
    }),
    rigidBody: new CircleBody({ cx: 12, cy: 7.6, radius: 0.4 }),
    behaviors: [new PlayerControlBehavior(), new JumpBehavior()],
  });

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 20, color: "#ff3333" },
      () =>
        boosting
          ? "boosting: " +
            Math.min(Date.now() - boostStart, BOOST_MAX_MS) +
            "ms"
          : "press SPACE to jump",
    ),
    rigidBody: new BoxBody(
      { cx: 8.5, cy: 1.4, width: 4, height: 0.5 },
      { scene: stage.hud },
    ),
  });

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    // Same OS key-repeat issue as the blue hero: without this guard, every
    // repeated `keydown` while the key is held would call `jump()` again,
    // and `jump()` adds to the actor's existing velocity rather than
    // replacing it -- so the hero would keep accelerating upward instead
    // of jumping once and boosting smoothly.
    if (boosting) return;
    boosting = true;
    boostStart = Date.now();
    (getBehavior(redHero, JumpBehavior)).jump(
      0,
      -BOOST_BASE_V,
    );
  });
  stage.keyboard.setKeyUpHandler(KeyCodes.KEY_SPACE, () => {
    boosting = false;
  });

  // While the boost window is open and the red hero is still rising, keep
  // refreshing its upward velocity instead of letting gravity slow it down.
  // This is what turns "held the key longer" into "jumped higher", even
  // though the actual jump already happened the moment the key went down.
  stage.world.timer.addEvent(
    new TimedEvent(0.01, true, () => {
      if (!boosting) return;
      if (Date.now() - boostStart > BOOST_MAX_MS) {
        boosting = false;
        return;
      }
      if (redHero.rigidBody.yVelocity >= 0) {
        boosting = false;
        return;
      }
      redHero.rigidBody.yVelocity = -BOOST_SUSTAIN_V;
    }),
  );
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
