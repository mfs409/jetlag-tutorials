import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CollectableBehavior, CrawlBehavior, DebugToggle, DIRECTION, FilledBox, FilledCircle, FilledPolygon, getAppearance, getBehavior, HazardBehavior, HealthBehavior, JumpBehavior, KeyCodes, LevelValue, Scene, SolidBehavior, stage, TextSprite, TimedEvent } from "jetlag2d";
import { endScreen, heroBehaviors, hudText } from "../common/common";

/**
 * HELPERS for Pirate Cove.
 *
 * Everything in this file is provided, and you don't have to edit it.  It builds the
 * island, the crew (with their hearts, and their controls), the HUD, and the end screens.
 * The things to find, and the things to fear, are what you write.
 */

const WORLD_W = 64;
export const GROUND = 8.3;

/** How tall the captain is when he stands */
export const CAPTAIN_HEIGHT = 1.0;

/** How much of that is left when he crawls */
export const CRAWL_SCALE = 0.5;

/** How far above the middle of the captain's body his picture is drawn, so that his feet are on the ground */
export const CAPTAIN_PICTURE_DY = -0.28;

/** Colors for this game's end screens */
const END_STYLE = { background: "#0d2a3fdd", titleColor: "#f2c14e", detailColor: "#ffffff" };

/**
 * Build the island and its crew: the sky and the sea, the ground, the ledges and rocks, the ship's
 * sails, the captain and the parrot, their controls, the HUD, and the end screens.
 *
 * @param thisLevel The builder function for this level, so that the end screens can start it over
 * @param crawl     The function that makes the captain crawl or stand up (see `crawl`)
 *
 * @returns The captain, the parrot, and a function that hands control to a crew member
 */
export function startIsland(thisLevel: () => void, crawl: (captain: Actor, on: boolean) => void) {
  DebugToggle.enable();
  stage.backgroundColor = "#8fd3f4";
  stage.world.gravity = { x: 0, y: 20 };
  stage.world.camera.setBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: 9 });

  // Sky, far-off sea, and the world's edges
  deco(WORLD_W / 2, 6.8, WORLD_W, 1.2, "#3d8fc4", -2);
  block(-1, 0, 0, 9, "#00000000");
  block(WORLD_W, 0, WORLD_W + 1, 9, "#00000000");

  // The ground, with the sea in the gaps
  const groundSpans = [{ l: 0, r: 10 }, { l: 13, r: 44 }, { l: 48, r: WORLD_W }];
  for (const span of groundSpans) block(span.l, GROUND, span.r, 9.5, "#e8cf8f");
  const seaSpans = [{ l: 10, r: 13 }, { l: 44, r: 48 }];
  for (const span of seaSpans) sea(span.l, span.r);

  // Ledges, the cannon plateau, the cave, and the tall rock by the treasure
  ledge(5, 7, 5.9);
  ledge(4.8, 6.4, 2.9);
  ledge(19, 21, 6.2);
  ledge(24.5, 26.5, 6.6);
  ledge(26.3, 28, 5.0);
  block(28, 4.6, 34, GROUND, "#b59a63");
  block(36, 5.9, 44, 6.6, "#8c7650");
  ledge(48.8, 50.3, 6.0);
  block(50.5, 3.2, 51.5, GROUND, "#b59a63");

  // The crew
  const captain = makeCaptain(2, 7.5);
  const parrot = makeParrot(3.2, 7.2);
  let active = captain;
  stage.world.camera.setCameraFocus(captain);

  // The ship: room for two, but it only takes the captain if he has the treasure
  deco(61.5, 7.6, 4.4, 1.4, "#6d4c2f", -1);
  deco(61.5, 4.6, 0.2, 5, "#4d3217", -1);
  new Actor({
    appearance: new FilledPolygon({ vertices: [{ x: 0, y: -1.2 }, { x: 1.6, y: 0.8 }, { x: 0, y: 0.8 }], fillColor: "#f5f0e1", lineWidth: 0.04, lineColor: "#9e9a8c", z: -1 }),
    rigidBody: new BoxBody({ cx: 61.6, cy: 4.4, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });

  // ANCHOR: controls
  // Controls.  Whenever a key goes down or up, `walk` decides how fast the
  // active crew member walks.  A key that stays down keeps going down, so
  // nothing about walking needs to run on every frame.
  const held = { l: false, r: false };
  const walk = () => {
    let speed = active == parrot ? 4 : 5;
    // ANCHOR: crawl_speed
    if (active == captain && captain.state.current.crawling) speed = 1.8;
    // ANCHOR_END: crawl_speed
    if (held.l != held.r) active.rigidBody.xVelocity = held.r ? speed : -speed;
  };
  const swapTo = (who: Actor) => {
    if (!who.enabled) return;
    active.rigidBody.xVelocity = 0;
    active = who;
    stage.world.camera.setCameraFocus(active);
    walk();
  };
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], () => { held.l = false; });
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = true; walk(); });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], () => { held.r = false; });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_TAB, () => swapTo(active == captain ? parrot : captain));
  // ANCHOR_END: controls

  // ANCHOR: crawl_keys
  // Hold Down to crawl, and let go to stand up again
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => {
    if (active != captain) return;
    crawl(captain, true);
    walk();
  });
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], () => {
    crawl(captain, false);
    walk();
  });
  // ANCHOR_END: crawl_keys

  // ANCHOR: jump_keys
  stage.keyboard.setKeyDownHandler([KeyCodes.KEY_UP, KeyCodes.KEY_W, KeyCodes.KEY_SPACE], () => {
    const jb = getBehavior(active, JumpBehavior);
    // ANCHOR: flap
    // The parrot can flap as often as it likes: cancel its fall, and jump again
    if (active == parrot) {
      parrot.rigidBody.yVelocity = 0;
      jb.jump(0, -6);
      return;
    }
    // ANCHOR_END: flap
    // ANCHOR: crawl_jump
    // (A `JumpBehavior` ignores jumps while its actor is crawling)
    // ANCHOR_END: crawl_jump
    // ANCHOR: boots_jump
    // The boots raise the captain's `numJumpsAllowed` to 2, so he can jump once more in mid-air.
    // That second jump is weaker, and it cancels his fall.
    if (active == captain && jb.currentJumps > 0 && jb.currentJumps < jb.numJumpsAllowed) {
      captain.rigidBody.yVelocity = 0;
      jb.jump(0, -9);
      return;
    }
    // ANCHOR_END: boots_jump
    // An ordinary jump, which does nothing if the jump has already been used
    jb.jump(0, active == parrot ? -8 : -12);
  });
  // ANCHOR_END: jump_keys

  // Some jobs really do happen on every frame: a crew member who isn't being
  // walked skids to a stop, a dead active crew member hands over to the other
  // one, and the captain's invincibility glow blinks.
  stage.world.repeatEvents.push(() => {
    if (!active.enabled) swapTo(active == captain ? parrot : captain);
    if (held.l == held.r) active.rigidBody.xVelocity = active.rigidBody.xVelocity * 0.7;
    const other = active == captain ? parrot : captain;
    if (other.enabled) other.rigidBody.xVelocity = other.rigidBody.xVelocity * 0.7;
    // ANCHOR: boots_ready
    // (Nothing to do: the `JumpBehavior` counts the captain's jumps)
    // ANCHOR_END: boots_ready
    // ANCHOR: glow
    // While the captain is invincible, a golden glow blinks around him
    //
    // [mfs] This is just because we're not using animatedsprite, right?  If we
    // had an animatedsprite, would it all "just work"?
    const glow = getAppearance(captain, FilledCircle);
    const inv = getBehavior(captain, HealthBehavior).invincibleRemaining;
    glow.fillColor = inv > 0 && Math.floor(inv * 6) % 2 == 0 ? "#ffd70088" : "#00000000";
    // ANCHOR_END: glow
  });

  // The HUD
  hudText(9.5, 0.15, 20, "#5a3a00", () => `Playing: ${active == captain ? "Captain" : "Parrot"} (Tab)`);
  // ANCHOR: hud_gold
  hudText(2.3, 0.15, 24, "#5a3a00", () => `Gold: ${stage.score.counters.get("gold")}`);
  // ANCHOR_END: hud_gold
  // ANCHOR: hud_map
  hudText(5.0, 0.15, 24, "#5a3a00", () => `Map pieces: ${stage.score.counters.get("map")} / 3`);
  // ANCHOR_END: hud_map
  // ANCHOR: hud_treasure
  hudText(5.0, 0.55, 24, "#5a3a00", () => stage.score.counters.get("treasure") > 0 ? "Treasure: carried!" : "");
  // ANCHOR_END: hud_treasure
  // ANCHOR: hud_hearts
  const hp = (a: Actor) => a.enabled ? getBehavior(a, HealthBehavior).hitPoints : 0;
  hudText(0.3, 0.15, 26, "#d62828", () => "♥".repeat(Math.max(0, hp(captain))) + "♡".repeat(Math.max(0, 3 - hp(captain))));
  // ANCHOR_END: hud_hearts
  // ANCHOR: hud_boots
  hudText(13.0, 0.15, 20, "#5a3a00", () => stage.score.counters.get("boots") > 0 ? "Boots!" : "");
  // ANCHOR_END: hud_boots

  stage.score.winSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "Anchors aweigh!", detail: `Treasure plus ${stage.score.counters.get("gold")} gold${stage.score.counters.get("heroesDefeated") == 0 ? ", and the parrot made it too!" : ", but the parrot didn't make it."}`, prompt: "Click or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });
  stage.score.loseSceneBuilder = (overlay: Scene) =>
    endScreen(overlay, { title: "Davy Jones' locker...", detail: "The captain is lost.  The treasure stays buried.", prompt: "Click or press Enter to play again", next: () => stage.switchTo(thisLevel), ...END_STYLE });

  return { captain, parrot, swapTo };
}

/**
 * The captain: a walking, jumping, crawling pirate who must survive
 *
 * @param cx The x coordinate of the center of the captain
 * @param cy The y coordinate of the center of the captain
 * @returns  The captain
 */
function makeCaptain(cx: number, cy: number) {
  const walk = (dir: string) => AnimationSequence.makeSimple({ timePerFrame: 70, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_walk_${dir}_${i}.png`) });
  const still = (dir: string, i: number) => AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_walk_${dir}_${i}.png`] });
  const crawlWalk = (dir: string) => AnimationSequence.makeSimple({ timePerFrame: 110, repeat: true, images: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `pirate_crawl_${dir}_${i}.png`) });
  const crawlStill = (dir: string) => AnimationSequence.makeSimple({ timePerFrame: 1000, repeat: true, images: [`pirate_crawl_${dir}_0.png`] });
  const animations = new Map([
    [AnimationState.IDLE_E, still("r", 0)], [AnimationState.IDLE_W, still("l", 0)],
    [AnimationState.WALK_E, walk("r")], [AnimationState.WALK_W, walk("l")],
    [AnimationState.JUMP_E, still("r", 3)], [AnimationState.JUMP_W, still("l", 3)],
    // ANCHOR: crawl_art
    // The crawl is a crouch: a squashed pirate, on its own sheet of pictures
    [AnimationState.CRAWL_E, crawlWalk("r")], [AnimationState.CRAWL_W, crawlWalk("l")],
    [AnimationState.CRAWL_IDLE_E, crawlStill("r")], [AnimationState.CRAWL_IDLE_W, crawlStill("l")],
    // ANCHOR_END: crawl_art
  ]);
  const remap = new Map([
    [AnimationState.JUMP_IDLE_E, AnimationState.JUMP_E], [AnimationState.JUMP_IDLE_W, AnimationState.JUMP_W],
    [AnimationState.INV_E, AnimationState.WALK_E], [AnimationState.INV_W, AnimationState.WALK_W],
    [AnimationState.INV_IDLE_E, AnimationState.IDLE_E], [AnimationState.INV_IDLE_W, AnimationState.IDLE_W],
  ]);
  const sprite = new AnimatedSprite({ width: 1.7, height: 1.7, animations, remap, offset: { dx: 0, dy: CAPTAIN_PICTURE_DY } });
  sprite.stateSelector = AnimatedSprite.sideViewAnimationTransitions;
  const captain: Actor = new Actor({
    appearance: [new FilledCircle({ radius: 0.8, fillColor: "#00000000" }), sprite],
    rigidBody: new BoxBody({ cx, cy, width: 0.5, height: CAPTAIN_HEIGHT }, { disableRotation: true }),
    behaviors: [
      ...heroBehaviors({
        // ANCHOR: captain_health
        // Three hearts, and the level is lost if the captain is defeated.  Getting
        // hurt knocks him back, away from whichever way he was going.
        hitPoints: 3,
        mustSurvive: true,
        onHitPointsChange: (a: Actor) => {
          const knockDir = a.rigidBody.getVelocity().x > 0 ? -1 : 1;
          a.rigidBody.setVelocity(knockDir * 5, -6);
        },
        // ANCHOR_END: captain_health
      }),
      new JumpBehavior(),
      // ANCHOR: crawl_behavior
      new CrawlBehavior(),
      // ANCHOR_END: crawl_behavior
    ],
  });
  return captain;
}

/**
 * The parrot: light, fragile, and able to flap as much as it likes
 *
 * @param cx The x coordinate of the center of the parrot
 * @param cy The y coordinate of the center of the parrot
 * @returns  The parrot
 */
function makeParrot(cx: number, cy: number) {
  const parrot = new Actor({
    appearance: [
      new FilledCircle({ radius: 0.28, fillColor: "#2e9e3e", lineWidth: 0.04, lineColor: "#16561f" }),
      new FilledPolygon({ vertices: [{ x: 0, y: -0.06 }, { x: 0.18, y: 0.02 }, { x: 0, y: 0.1 }], fillColor: "#f2a31b", offset: { dx: 0.22, dy: -0.05 } }),
      new FilledPolygon({ vertices: [{ x: -0.3, y: 0 }, { x: 0.05, y: -0.15 }, { x: 0.05, y: 0.12 }], fillColor: "#d62828", offset: { dx: -0.2, dy: 0.08 } }),
      new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: 0.1, dy: -0.1 } }),
    ],
    rigidBody: new CircleBody({ cx, cy, radius: 0.28 }, { disableRotation: true }),
    behaviors: [
      ...heroBehaviors({ hitPoints: 1 }),
      new JumpBehavior(),
    ],
  });
  parrot.rigidBody.body.SetGravityScale(0.45);
  return parrot;
}

/**
 * A strip of sea.  Falling in is instantly fatal, invincible or not.
 *
 * @param l The x coordinate of the left edge of the sea
 * @param r The x coordinate of the right edge of the sea
 */
function sea(l: number, r: number) {
  deco((l + r) / 2, 8.9, r - l, 1.2, "#1e6fa8", 1);
  new Actor({
    appearance: new FilledBox({ width: r - l, height: 0.2, fillColor: "#5fb3e6", z: 1 }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: 8.8, width: r - l, height: 0.6 }, { collisionsEnabled: false }),
    behaviors: new HazardBehavior({
      // ANCHOR: sea_defeat
      instantDefeat: true,
      // ANCHOR_END: sea_defeat
      // ANCHOR: sea_immune
      immuneToInvincibility: true,
      // ANCHOR_END: sea_immune
    }),
  });
}

// ANCHOR: map_piece
/**
 * A piece of the treasure map
 *
 * @param cx The x coordinate of the center of the piece
 * @param cy The y coordinate of the center of the piece
 */
export function mapPiece(cx: number, cy: number) {
  new Actor({
    appearance: [
      new FilledPolygon({ vertices: [{ x: -0.3, y: -0.22 }, { x: 0.25, y: -0.28 }, { x: 0.3, y: 0.22 }, { x: -0.25, y: 0.26 }], fillColor: "#f3e2b3", lineWidth: 0.04, lineColor: "#8a6a2b" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 14, color: "#d62828" }, "X"),
    ],
    rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
    behaviors: new CollectableBehavior({ onCollect: "map" }),
  });
}
// ANCHOR_END: map_piece

// ANCHOR: pickup
/**
 * A labeled pickup whose effect is given by `effect`
 *
 * @param cx     The x coordinate of the center of the pickup
 * @param cy     The y coordinate of the center of the pickup
 * @param color  The HTML hex color of the pickup
 * @param label  The word to show above the pickup
 * @param effect Code to run when a crew member touches it.  Returning `false`
 *               means that it wasn't picked up.
 */
export function pickup(cx: number, cy: number, color: string, label: string, effect: (who: Actor) => boolean | void) {
  new Actor({
    appearance: [
      new FilledCircle({ radius: 0.3, fillColor: color, lineWidth: 0.05, lineColor: "#ffffff" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 12, color: "#ffffff", strokeColor: "#000000", strokeWidth: 2, offset: { dx: 0, dy: -0.5 } }, label),
    ],
    rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
    behaviors: new CollectableBehavior({ onCollect: (_g: Actor, who: Actor) => effect(who) !== false }),
  });
}
// ANCHOR_END: pickup

/**
 * Solid ground or rock.  Only the top counts as ground for jumping.
 *
 * @param l     The x coordinate of the left side
 * @param t     The y coordinate of the top
 * @param r     The x coordinate of the right side
 * @param b     The y coordinate of the bottom
 * @param color The HTML hex color of the block
 */
export function block(l: number, t: number, r: number, b: number, color: string) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: color }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}

/**
 * A wooden ledge you can jump up through
 *
 * @param l   The x coordinate of the left end
 * @param r   The x coordinate of the right end
 * @param top The y coordinate of the top of the ledge
 */
function ledge(l: number, r: number, top: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: 0.25, fillColor: "#8d6e46", lineWidth: 0.04, lineColor: "#5a4428" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: top + 0.125, width: r - l, height: 0.25 }, { singleRigidSide: DIRECTION.N }),
    behaviors: new SolidBehavior({ jumpReEnableSides: [DIRECTION.N] }),
  });
}

/**
 * Scenery that nothing collides with
 *
 * @param cx    The x coordinate of the center
 * @param cy    The y coordinate of the center
 * @param w     The width
 * @param h     The height
 * @param color The HTML hex color
 * @param z     Which layer to draw it on
 */
function deco(cx: number, cy: number, w: number, h: number, color: string, z: -2 | -1 | 0 | 1 | 2) {
  new Actor({
    appearance: new FilledBox({ width: w, height: h, fillColor: color, z }),
    rigidBody: new BoxBody({ cx, cy, width: w, height: h }, { collisionsEnabled: false }),
  });
}

/** When the last message was said (in renderer time), so that it does not repeat.  Level storage is forgotten when the level restarts. */
const LAST_SAY = new LevelValue<number>("lastSay", () => 0);

/**
 * A message that floats in the world for a moment.  To keep a message from
 * repeating on every frame, it won't say anything if it spoke recently.
 *
 * @param cx   The x coordinate of the center of the message
 * @param cy   The y coordinate of the center of the message
 * @param text The message
 */
export function say(cx: number, cy: number, text: string) {
  if (stage.renderer.now - LAST_SAY.get() < 1500) return;
  LAST_SAY.set(stage.renderer.now);
  const t = new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 22, color: "#ffffff", strokeColor: "#000000", strokeWidth: 4, z: 2 }, text),
    rigidBody: new BoxBody({ cx, cy, width: 0.1, height: 0.1 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(1.6, false, () => t.remove()));
}

