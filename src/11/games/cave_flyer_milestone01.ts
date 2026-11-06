import { Actor, ActorPoolSystem, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, KeyCodes, Scene, SessionValue, SolidBehavior, stage, TextSprite } from "jetlag2d";
import { endScreen, hudText } from "../common/common";
import { today, Save, SAVE_KEY, SESSION_STARS, SHIELD_READY, FLIGHT_STARS, SKINS, text, button, makeCave, makePool, makeWall, makeShip } from "./helpers";

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  // ANCHOR: storage_key
  storageKey = "com.github.mfs409.cave-flyer/";
  // ANCHOR_END: storage_key
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
  };
}
// ANCHOR_END: config

/**
 * MILESTONE 1 for Cave Flyer: the camera follows the ship.  The comments say what each remaining piece needs.
 */

// ANCHOR: save_load
/**
 * The saved data.  The first time that it is read, it's loaded from persistent
 * storage (or it's a new `Save`, if nothing has been saved yet).  After that,
 * the game works with this copy, and saves it again only when something worth
 * keeping has happened.
 */
// TODO (Memory): Nothing is remembered once the page is reloaded.  The first time that `SAVE` is read, load it from persistent storage (`stage.storage.loadPersistent(SAVE_KEY, new Save())`), and
// when a flight ends, save it (`stage.storage.savePersistent`).
const SAVE = new SessionValue<Save>("save", () => new Save());
// ANCHOR_END: save_load

// ANCHOR: menu_screen
/** The menu: pick a kind of flight, see how you're doing, and shop */
function menu() {
  DebugToggle.enable();
  stage.backgroundColor = "#0e0b1f";
  // ANCHOR: menu_load
  const s = SAVE.get();
  // ANCHOR_END: menu_load
  text(8, 1.2, 64, "Roboto Black", "#ffd23f", "CAVE FLYER", true);
  // ANCHOR: menu_stats
  text(8, 2.3, 22, "Arimo Regular", "#ffffff", `Best: ${s.best} m     Today's daily best: ${s.dailyDate == today() ? s.dailyBest : 0} m     Lifetime stars: ${s.lifetime}`, true);
  // ANCHOR: first_and_new
  // On a player's very first day, "the first time ever" and "the first time
  // today" are both true.  Ask about the bigger one first.
  const firstEver = !s.played;
  const firstToday = s.dailyDate != today();
  text(8, 3.0, 20, "Arimo Regular", "#3bceac", firstEver ? "Welcome to Cave Flyer!  Hold Space to thrust, and stay out of the walls." : firstToday ? "A new Daily Cave is waiting for you today!" : "You've flown today's Daily Cave.  Beat your score?", true);
  // ANCHOR_END: first_and_new
  // ANCHOR_END: menu_stats
  button(5, 4.4, "D: Daily Cave", "#ee4266", KeyCodes.KEY_D, () => stage.switchTo(() => flight(true)));
  button(11, 4.4, "F: Free Flight", "#1fa2ff", KeyCodes.KEY_F, () => stage.switchTo(() => flight(false)));
  // ANCHOR: menu_skins
  // Ship colors are bought with lifetime (persistent) stars
  text(8, 5.6, 20, "Arimo Regular", "#aab3c5", "C: change ship color (unlock more with lifetime stars)", true);
  SKINS.forEach((k, i) => {
    new Actor({
      appearance: [
        new FilledCircle({ radius: 0.35, fillColor: s.skins.includes(i) ? k.color : "#333044", lineWidth: 0.06, lineColor: s.skin == i ? "#ffffff" : "#00000000" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#ffffff", offset: { dx: 0, dy: 0.6 } }, s.skins.includes(i) ? "" : `${k.cost}★`),
      ],
      rigidBody: new CircleBody({ cx: 6.5 + i, cy: 6.4, radius: 0.35 }),
    });
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_C, () => {
    // Pick the next color, buying it if you can afford it
    const next = (s.skin + 1) % SKINS.length;
    if (!s.skins.includes(next)) {
      if (s.lifetime >= SKINS[next].cost) { s.lifetime -= SKINS[next].cost; s.skins.push(next); s.skin = next; }
      else s.skin = 0;
    } else s.skin = next;
    stage.storage.savePersistent(SAVE_KEY, s);
    stage.switchTo(menu);
  });
  // ANCHOR_END: menu_skins
  // ANCHOR: menu_shield
  // Shields are bought with this session's stars
  const shield = () => SHIELD_READY.get();
  text(8, 7.7, 20, "Arimo Regular", shield() ? "#3bceac" : "#aab3c5",
    shield() ? "Shield ready for your next flight!" : `S: buy a one-flight shield for 15 stars (this session: ${SESSION_STARS.get()}★)`, true);
  // TODO (The shop): Pressing S should buy the shield: nothing happens if there is already one, or if this session's stars (`SESSION_STARS`) are fewer than 15.  Otherwise, spend 15 of them,
  // set `SHIELD_READY` to true, and show the menu again (`stage.switchTo(menu)`).
  // ANCHOR_END: menu_shield
}
// ANCHOR_END: menu_screen

// ANCHOR: flight_sig
/**
 * One flight through the cave
 *
 * @param daily Fly the Daily Cave (the same cave for everyone today)?  If not,
 *              this is a Free Flight, in a cave nobody has seen before.
 */
function flight(daily = false) {
// ANCHOR_END: flight_sig
  DebugToggle.enable();
  stage.backgroundColor = "#0e0b1f";
  // ANCHOR: load_save
  const s = SAVE.get();
  // ANCHOR_END: load_save
  // ANCHOR: shield_state
  // A shield bought in the menu is used up by this flight
  const hasShield = SHIELD_READY.get();
  SHIELD_READY.set(false);
  let shield = hasShield;
  // ANCHOR_END: shield_state

  // ANCHOR: reseed
  // All randomness comes from one seeded generator, so that the same seed
  // always makes the same cave.  A Free Flight is seeded from the clock.
  // TODO (The Daily Cave): Every cave is different, even the Daily Cave.  A seeded generator makes the same numbers from the same seed: for the Daily Cave, reseed it with today's date as a number
  // (`parseInt(today().replace(/-/g, ""))`), and for a Free Flight, keep using the clock.
  stage.random.reseed(Date.now());
  // ANCHOR_END: reseed
  // ANCHOR: slice_gen
  const sliceAt = makeCave();
  // ANCHOR_END: slice_gen

  // ANCHOR: ship
  // The ship
  const skin = SKINS[s.skin].color;
  const { ship, flame, shieldRing } = makeShip(skin, hasShield);
  // ANCHOR_END: ship
  stage.world.gravity = { x: 0, y: 14 };
  // ANCHOR: camera
  // No `maxX`, because the cave never ends.  The camera also looks 5 meters
  // ahead of the ship, so you can see what's coming.
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxY: 9 });
  stage.world.camera.setCameraFocus(ship, { dx: 5, dy: 0 });
  // ANCHOR_END: camera

  // ANCHOR: crash
  // Crashing: the shield absorbs one crash, and then keeps you safe for a
  // moment while you get out of the wall
  let crashed = false, safeUntil = 0;
  const crash = () => {
    if (crashed || stage.renderer.now < safeUntil) return;
    if (shield) {
      shield = false;
      shieldRing.lineColor = "#00000000";
      safeUntil = stage.renderer.now + 1200;
      ship.rigidBody.yVelocity = ship.rigidBody.getCenter().y > 4.5 ? -5 : 5;
      return;
    }
    crashed = true;
    stage.score.loseLevel();
  };
  // ANCHOR_END: crash

  const wall = (cx: number, cy: number, color: string) => makeWall(cx, cy, color, ship, crash);

  // ANCHOR: ring_buffer
  // The cave walls are a ring buffer: 22 slices' worth of blocks, a ceiling
  // and a floor for each.  When a slice falls behind the camera, its blocks
  // jump 22 slices ahead and take on the shape of the slice that's there.
  const SLICES = 22;
  for (let i = 0; i < SLICES; i++) {
    let index = i;
    const place = (ceil: Actor, floor: Actor) => {
      const sl = sliceAt(index);
      ceil.rigidBody.setCenter(index + 0.5, sl.top - 4.5);
      floor.rigidBody.setCenter(index + 0.5, sl.bottom + 4.5);
    };
    const ceil = wall(-10, -10, "#3a2d63"), floor = wall(-10, -10, "#2d2350");
    place(ceil, floor);
    // TODO (The endless cave): After 22 meters, the cave runs out.  Each pair of blocks should jump to 22 slices ahead, and take on the shape of the slice that is there, as soon
    // as its slice falls behind the camera (`stage.world.camera.getLeft()`).  `prerenderTasks` is a list of functions that an actor runs before every frame.
  }
  // ANCHOR_END: ring_buffer

  // ANCHOR: pools
  const ROCKS = 8, STARS = 10;
  const rocks = makePool(ROCKS, () => new Actor({
    appearance: new FilledPolygon({ vertices: [{ x: -0.4, y: 0.1 }, { x: -0.1, y: -0.4 }, { x: 0.35, y: -0.25 }, { x: 0.45, y: 0.2 }, { x: 0, y: 0.42 }], fillColor: "#7a6aa8", lineWidth: 0.04, lineColor: "#4d4170" }),
    rigidBody: new CircleBody({ cx: -20, cy: -20, radius: 0.4 }),
    behaviors: new SolidBehavior({ onContact: (_a: Actor, o: Actor) => { if (o == ship) crash(); } }),
  }));
  // ANCHOR: star_pool
  const stars: ActorPoolSystem = makePool(STARS, () => new Actor({
    appearance: new FilledPolygon({ vertices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => ({ x: Math.cos(k * Math.PI / 5 - Math.PI / 2) * (k % 2 ? 0.12 : 0.28), y: Math.sin(k * Math.PI / 5 - Math.PI / 2) * (k % 2 ? 0.12 : 0.28) })), fillColor: "#ffd23f" }),
    rigidBody: new CircleBody({ cx: -20, cy: -20, radius: 0.28 }),
    behaviors: new CollectableBehavior({
      // Collecting a star would normally remove it for good.  We want it
      // back in its pool instead, so we put it there, and say "don't remove it"
      onCollect: (star: Actor) => {
        FLIGHT_STARS.set(FLIGHT_STARS.get() + 1);
        stars.put(star);
        return false;
      },
    }),
  }));
  // ANCHOR_END: star_pool
  // ANCHOR_END: pools

  // ANCHOR: fill_fn
  const CHUNK = 8;
  /**
   * Put the rocks and stars of one 8-meter chunk of cave into the cave, by
   * taking actors out of their pools
   *
   * @param chunk Which chunk (chunk 1 is slices 8 through 15)
   */
  const fill = (chunk: number) => {
    for (let i = chunk * CHUNK; i < (chunk + 1) * CHUNK; i++) {
      const sl = sliceAt(i);
      // TODO (Rocks and stars): There are stars, but no rocks.  A slice with a rock (`sl.rock`) should take a rock out of the `rocks` pool, put it where the rock is, and turn it on.  Do
      // it the way that the star does it.
      if (sl.star !== undefined) { const st = stars.get(); st?.rigidBody.setCenter(i + 0.5, sl.star); if (st) st.enabled = true; }
    }
  };
  fill(1); fill(2);
  // ANCHOR_END: fill_fn

  // TODO (Chunks): Only the first three chunks of the cave have rocks and stars in them.  Make a trigger, which is an actor with a `TouchPlateBehavior` that is tall enough to be touched
  // by the ship, that calls `fill` for the next chunk when the ship touches it, and then moves itself (`self.rigidBody.setCenter`) 8 meters ahead, ready to do it again.

  // Controls: hold to thrust.  The ship waits in place until the first thrust.
  let thrust = false, started = false;
  ship.rigidBody.body.SetGravityScale(0);
  const go = () => { thrust = true; if (!started) { started = true; ship.rigidBody.body.SetGravityScale(1); } };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_SPACE, KeyCodes.KEY_UP], go);
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_SPACE, KeyCodes.KEY_UP], () => (thrust = false));
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: { onTouchDown: () => { go(); return true; }, onTouchUp: () => { thrust = false; return true; } },
  });
  /** How far the ship has flown, in whole meters */
  const distance = () => Math.max(0, Math.floor(ship.rigidBody.getCenter().x - 2));
  stage.world.repeatEvents.push((dt: number) => {
    if (!started) { ship.rigidBody.setVelocity(0, Math.sin(stage.renderer.now / 300) * 0.4); return; }
    const v = ship.rigidBody.getVelocity();
    // ANCHOR: speed_def
    // The ship goes faster the further it gets, up to a limit
    const speed = Math.min(11, 5 + distance() / 90);
    // ANCHOR_END: speed_def
    ship.rigidBody.setVelocity(speed, thrust ? Math.max(-6.5, v.y - 32 * dt) : Math.min(9, v.y));
    flame.fillColor = thrust ? "#ff9f1c" : "#00000000";
    // ANCHOR: shield_tick
    shieldRing.fillColor = stage.renderer.now < safeUntil ? "#3bceac44" : "#00000000";
    // ANCHOR_END: shield_tick
    const c = ship.rigidBody.getCenter();
    if (c.y < -0.5 || c.y > 9.5) crash();
  });

  // The HUD
  hudText(0.3, 0.1, 30, "#ffffff", () => `${distance()} m`, { face: "Roboto Black" });
  // ANCHOR: star_hud
  hudText(3.3, 0.18, 22, "#ffd23f", () => `★ ${FLIGHT_STARS.get()}`, { face: "Arimo Regular" });
  // ANCHOR_END: star_hud
  // ANCHOR: mode_hud
  hudText(5.2, 0.2, 18, "#aab3c5", () => (daily ? `Daily Cave ${today()}` : "Free Flight"), { face: "Arimo Regular" });
  // ANCHOR_END: mode_hud
  // ANCHOR: shield_hud
  hudText(5.2, 0.55, 18, "#3bceac", () => (shield ? "shield: ready" : ""), { face: "Arimo Regular" });
  // ANCHOR_END: shield_hud
  // ANCHOR: pool_hud
  hudText(11.4, 0.2, 16, "#6f6a8a", () => `pools: rocks ${ROCKS - rocks.size}/${ROCKS} out, stars ${STARS - stars.size}/${STARS} out`, { face: "Arimo Regular" });
  // ANCHOR_END: pool_hud
  hudText(4.5, 8.3, 20, "#aab3c5", () => (distance() < 6 ? "Hold Space (or the mouse button) to thrust" : ""), { face: "Arimo Regular" });

  // ANCHOR: lose_scene
  // When the flight ends, the stars move up through the storage scopes
  stage.score.loseSceneBuilder = (overlay: Scene) => {
    const d = distance(), got = FLIGHT_STARS.get();
    // ANCHOR: bank_stars
    const sv = SAVE.get();
    const newBest = d > sv.best;
    sv.best = Math.max(sv.best, d);
    if (daily) {
      if (sv.dailyDate != today()) { sv.dailyDate = today(); sv.dailyBest = 0; }
      sv.dailyBest = Math.max(sv.dailyBest, d);
    }
    sv.lifetime += got;
    sv.played = true;
    SESSION_STARS.set(SESSION_STARS.get() + got);
    // ANCHOR_END: bank_stars
    endScreen(overlay, {
      title: "CRASH!",
      detail: `${d} m${newBest ? "   New best!" : ""}\n+${got}★ this flight   (session: ${SESSION_STARS.get()}★   lifetime: ${sv.lifetime}★)`,
      prompt: "Enter or click: fly again     M: menu",
      next: () => stage.switchTo(() => flight(daily)),
      background: "#0e0b1fee", titleColor: "#ff5d8f",
    });
    // A second way out, besides the one endScreen provides
    stage.keyboard.setKeyDownHandler(KeyCodes.KEY_M, () => { stage.clearOverlay(); stage.switchTo(menu); });
  };
  // ANCHOR_END: lose_scene
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
// ANCHOR: launch_call
initializeAndLaunch("game-player", new Config(), menu);
// ANCHOR_END: launch_call
