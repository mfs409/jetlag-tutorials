import { Actor, AppearanceComponent, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, FilledPolygon, FilledRoundedBox, JetLagGameConfig, KeyCodes, ParticleComponent, PlayerControlBehavior, Scene, SolidBehavior, TextSprite, initializeAndLaunch, SessionValue, stage } from "jetlag2d";
import { endScreen } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["pirate.json", "lizard.json"],
    soundNames: ["footstep_outside.mp3"],
  };
}

/**
 * STARTER CODE for Moonlight Harvest.
 *
 * A farm, drawn in plain, labeled boxes (press G to see them), with a hero
 * who is a purple box that can walk around.  There's a house, a pond, a
 * market, and a field, and none of them do anything yet.  The comments below
 * say what each stage adds.
 *
 * TODO (The hero): a pirate who walks in eight directions, with art for four, and footsteps that match the feet.
 *
 * TODO (Plots): plots that go from empty, to seeds, to a sprout, to ripe, and a way to plant and harvest them with E.
 *
 * TODO (Water): a pond to refill your can, and water that you throw, from a pool of droplets, to water the plots.
 *
 * TODO (Day and night): a clock, a darkening screen, and a dawn when watered crops grow.
 *
 * TODO (Lizards): lizards that come out at night and trample crops, a punch to stop them, and hearts.
 *
 * TODO (The market): an overlay to sell what you grow, buy seeds and upgrades, and pay off the deed.
 */

const WORLD = { w: 32, h: 18 };
export const DAY_LEN = 45, NIGHT_LEN = 35, LAST_DAY = 7, DEED = 150;
const HEARTS = 5;
export const PRICES = { crop: 8, seeds: 10, can: 25, sword: 30 };

/** The stages a plot goes through.  Watered seeds and sprouts grow overnight. */
export const enum Plot { EMPTY, SEED, SEED_WET, SPROUT, SPROUT_WET, RIPE }
export const PLOT_NAMES = ["empty", "seeds", "seeds (wet)", "sprout", "sprout (wet)", "RIPE!"];
const PLOT_SPOTS = [0, 1, 2].flatMap(r => [0, 1, 2, 3].map(c => ({ x: 12.5 + 1.7 * c, y: 6.5 + 1.7 * r })));

/** Places in the world */
const HOUSE = { x: 4.5, y: 4 }, POND = { x: 4.8, y: 13.2 }, STALL = { x: 25.5, y: 5 };

/** Everything that has to survive from one day to the next, and across a G toggle */
class Farm {
  day = 1; clock = 0; coins = 10; seeds = 6; produce = 0;
  water = 8; waterMax = 8; sword = 1; hearts = HEARTS; kills = 0;
  plots: Plot[] = PLOT_SPOTS.map(() => Plot.EMPTY);
  lizardsLeft = 0; graybox = false; hero = { x: 9, y: 5 };
}

/** The farm, in session storage.  The first time that it is read, it is made with the starting values. */
const FARM = new SessionValue<Farm>("farm", () => new Farm());
/** Throw away the farm, and start over */
function newGame() { FARM.clear(); stage.switchTo(builder); }

/** Build the farm, as it is right now.  The whole game is one builder, because the farm is kept in `f`, which survives a rebuild. */
function builder() {
  DebugToggle.enable();
  const f = FARM.get();
  stage.backgroundColor = f.graybox ? "#e4e6ea" : "#6ab04c";
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: WORLD.w, maxY: WORLD.h });

  /**
   * Every visible thing goes through `look`: in gray-box mode it becomes a
   * labeled box of the same size, and nothing else about it changes.
   */
  const look = (label: string | (() => string), w: number, h: number, art: () => AppearanceComponent[]): AppearanceComponent[] =>
    f.graybox
      ? [new FilledBox({ width: w, height: h, fillColor: "#c9ccd1", lineWidth: 0.04, lineColor: "#6b7078" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#222222" }, typeof label == "string" ? label : () => label())]
      : art();

  // --- The farm -------------------------------------------------------------
  const borders = [{ l: -1, t: -1, r: 33, b: 0 }, { l: -1, t: 18, r: 33, b: 19 }, { l: -1, t: 0, r: 0, b: 18 }, { l: 32, t: 0, r: 33, b: 18 }];
  for (const border of borders) solid(border.l, border.t, border.r, border.b);
  if (!f.graybox) grass();
  // The house
  const windowGlow = [new FilledBox({ width: 0.7, height: 0.6, fillColor: "#8fc7e8", offset: { dx: -1.4, dy: 0.2 } }), new FilledBox({ width: 0.7, height: 0.6, fillColor: "#8fc7e8", offset: { dx: 1.4, dy: 0.2 } })];
  new Actor({
    appearance: look("house", 5, 3.2, () => [
      new FilledBox({ width: 5, height: 2.4, fillColor: "#e8d8b8", lineWidth: 0.05, lineColor: "#8a7a5c", offset: { dx: 0, dy: 0.4 } }),
      new FilledPolygon({ vertices: [{ x: -2.9, y: -0.8 }, { x: 0, y: -2.4 }, { x: 2.9, y: -0.8 }], fillColor: "#b5462f", lineWidth: 0.05, lineColor: "#6e2a1c" }),
      new FilledBox({ width: 0.4, height: 0.9, fillColor: "#6e4b2a", offset: { dx: 1.6, dy: -1.9 } }),
      new FilledBox({ width: 0.9, height: 1.3, fillColor: "#7a5634", lineWidth: 0.04, lineColor: "#4d3620", offset: { dx: 0, dy: 0.95 } }),
      ...windowGlow,
    ]),
    rigidBody: new BoxBody({ cx: HOUSE.x, cy: HOUSE.y, width: 5, height: 3.2 }),
    behaviors: new SolidBehavior(),
  });
  // The pond
  new Actor({
    appearance: look("pond (E: refill)", 3.6, 3.6, () => [
      new FilledCircle({ radius: 2.0, fillColor: "#3f8fd2", lineWidth: 0.12, lineColor: "#c9b27a" }),
      new FilledCircle({ radius: 0.35, fillColor: "#3f9e4a", offset: { dx: -0.7, dy: 0.5 } }),
      new FilledCircle({ radius: 0.25, fillColor: "#3f9e4a", offset: { dx: 0.8, dy: -0.4 } }),
      new FilledCircle({ radius: 0.12, fillColor: "#f5a3c7", offset: { dx: -0.6, dy: 0.4 } }),
    ]),
    rigidBody: new CircleBody({ cx: POND.x, cy: POND.y, radius: 1.8 }),
    behaviors: new SolidBehavior(),
  });
  // The market stall, with a striped awning
  new Actor({
    appearance: look("market (E)", 3.4, 2, () => [
      new FilledBox({ width: 3.4, height: 1.2, fillColor: "#a8773f", lineWidth: 0.05, lineColor: "#5e3f1c", offset: { dx: 0, dy: 0.4 } }),
      ...[0, 1, 2, 3, 4, 5].map(i => new FilledBox({ width: 0.62, height: 0.7, fillColor: i % 2 ? "#ffffff" : "#e0463c", offset: { dx: -1.55 + i * 0.62, dy: -0.55 } })),
      new FilledCircle({ radius: 0.22, fillColor: "#f28c28", offset: { dx: -0.9, dy: 0.2 } }),
      new FilledCircle({ radius: 0.22, fillColor: "#f28c28", offset: { dx: -0.5, dy: 0.25 } }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#fff5d6", offset: { dx: 0.6, dy: 0.45 } }, "MARKET"),
    ]),
    rigidBody: new BoxBody({ cx: STALL.x, cy: STALL.y, width: 3.4, height: 2 }),
    behaviors: new SolidBehavior(),
  });
  // The field
  new Actor({
    appearance: look("", 7.4, 5.6, () => [new FilledRoundedBox({ width: 7.4, height: 5.6, radius: 0.4, fillColor: "#8b6b43", z: -1 })]),
    rigidBody: new BoxBody({ cx: 15.05, cy: 8.2, width: 7.4, height: 5.6 }, { collisionsEnabled: false }),
  });
  // The woods around the edges
  const trees = [{ x: 1.2, y: 8 }, { x: 1, y: 10 }, { x: 8, y: 16.9 }, { x: 10.5, y: 17 }, { x: 13, y: 16.8 }, { x: 18, y: 17 }, { x: 22, y: 16.8 }, { x: 26.5, y: 17.1 }, { x: 30.8, y: 15.5 }, { x: 31, y: 12 }, { x: 30.9, y: 9 }, { x: 31.1, y: 2.5 }, { x: 29.5, y: 1 }, { x: 21, y: 1 }, { x: 17.5, y: 0.9 }, { x: 13, y: 1 }, { x: 9.5, y: 1.2 }, { x: 23.5, y: 11.5 }, { x: 9, y: 9.5 }];
  for (const tree of trees) {
    new Actor({
      appearance: look("tree", 1.6, 1.6, () => [
        new FilledCircle({ radius: 0.9, fillColor: "#2e7d32", lineWidth: 0.05, lineColor: "#1b5e20" }),
        new FilledCircle({ radius: 0.45, fillColor: "#43a047", offset: { dx: -0.25, dy: -0.25 } }),
      ]),
      rigidBody: new CircleBody({ cx: tree.x, cy: tree.y, radius: 0.7 }),
      behaviors: new SolidBehavior(),
    });
  }
  // A torch by the stall, so the market is easy to find at night
  const flame = new ParticleComponent({ colors: ["#ff7043", "#ffca28", "#ff5252"], angle: -Math.PI / 2, spread: Math.PI / 7, speed: { min: 0.4, max: 1 }, lifetime: { min: 0.3, max: 0.7 }, size: { min: 0.05, max: 0.12 }, offset: { dx: 0, dy: -0.6 }, fade: true });
  new Actor({
    appearance: look("torch", 0.3, 1.2, () => [new FilledBox({ width: 0.15, height: 1.2, fillColor: "#5b3a29" }), flame]),
    rigidBody: new BoxBody({ cx: STALL.x - 2.2, cy: STALL.y + 0.3, width: 0.2, height: 1.2 }),
    behaviors: new SolidBehavior(),
  });
  if (!f.graybox) flame.startEmitting(20);

  // --- Particles ------------------------------------------------------------

  // --- The hero ----------------------------------------------------------------
  const hero = new Actor({
    appearance: look("you", 0.8, 1.2, () => [new FilledBox({ width: 0.8, height: 1.2, fillColor: "#7a5cc9" })]),
    rigidBody: new CircleBody({ cx: f.hero.x, cy: f.hero.y, radius: 0.35 }, { dynamic: true, disableRotation: true, passThroughId: [1] }),
    behaviors: new PlayerControlBehavior(),
  });
  stage.world.camera.setCameraFocus(hero);

  // --- The clock: day, dusk, night, dawn --------------------------------------------

  // --- Interacting (E): plots, the pond, and the market ------------------------------

  // --- Controls -------------------------------------------------------------------------
  const held = { l: false, r: false, u: false, d: false };
  const bindMain = () => {
    stage.keyboard.clearHandlers();
    held.l = held.r = held.u = held.d = false;
    const bind = (keys: KeyCodes[], k: keyof typeof held) => {
      stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
      stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
    };
    bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
    bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
    // Gray-box mode: same game, same state, just labeled boxes instead of art
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_G, () => { f.graybox = !f.graybox; const c = hero.rigidBody.getCenter(); f.hero = { x: c.x, y: c.y }; stage.switchTo(builder); });
  };
  bindMain();
  stage.world.repeatEvents.push(() => {
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    hero.rigidBody.setVelocity(dx / len * 4.5, dy / len * 4.5);
  });

  // --- The HUD --------------------------------------------------------------------------
  new Actor({
    appearance: new FilledBox({ width: 16, height: 0.62, fillColor: "#00000088" }),
    rigidBody: new BoxBody({ cx: 8, cy: 0.31, width: 16, height: 0.62 }, { scene: stage.hud, collisionsEnabled: false }),
  });

  stage.score.winSceneBuilder = (overlay: Scene) => endScreen(overlay, {
    title: "The farm is yours!",
    detail: `You paid off the deed on day ${f.day}, with ${f.coins} coins to spare.\nLizards defeated: ${f.kills}`,
    prompt: "Click or press Enter to start a new farm", next: newGame, background: "#1d2b14ee", titleColor: "#ffd23f",
  });
  stage.score.loseSceneBuilder = (overlay: Scene) => endScreen(overlay, {
    title: "The bank took the farm",
    detail: `The deed was due after day ${LAST_DAY}, and you had ${f.coins} of ${DEED} coins.`,
    prompt: "Click or press Enter to try again", next: newGame, background: "#1a1022ee", titleColor: "#e0463c",
  });

  /** A solid, invisible wall */
  function solid(l: number, t: number, r: number, b: number) {
    new Actor({
      appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#00000000" }),
      rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
      behaviors: new SolidBehavior(),
    });
  }
}

/** Tufts of grass, scattered the same way every time */
function grass() {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 90; n++) {
    new Actor({
      appearance: new FilledPolygon({ vertices: [{ x: -0.15, y: 0.1 }, { x: 0, y: -0.15 }, { x: 0.15, y: 0.1 }], fillColor: rand() < 0.5 ? "#5a9e40" : "#7cc05a", z: -2 }),
      rigidBody: new CircleBody({ cx: rand() * WORLD.w, cy: rand() * WORLD.h, radius: 0.01 }, { collisionsEnabled: false }),
    });
  }
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
