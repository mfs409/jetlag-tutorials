import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CollectableBehavior, CrawlBehavior, DIRECTION, FilledBox, FilledCircle, FilledPolygon, getBehavior, GoalBehavior, HazardBehavior, HealthBehavior, initializeAndLaunch, JetLagGameConfig, JumpBehavior, Path, PathMovement, stage, TextSprite, TimedEvent } from "jetlag2d";
import { hudText } from "../common/common";
import { GROUND, startIsland, mapPiece, pickup, block, say } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json", "pirate.json", "pirate_crawl.json"],
  };
}

/**
 * MILESTONE 4 for Pirate Cove: crabs work.  The comments say what each remaining piece needs.
 */

/** Build the one and only level of the game */
function builder() {
  // The island and its crew come from `helpers.ts`.  It needs `crawl` (below) to make the captain crawl.
  const { captain, parrot, swapTo } = startIsland(builder, crawl);

  // TODO (Flap): The parrot can flap (jump again) as often as it likes, even in mid-air.  A `JumpBehavior` has an
  // `allowMultiJump` property.

  // Treasure: coins everywhere, three map pieces, and the chest
  // ANCHOR: coins
  const coinSpots = [{ x: 4, y: 7.6 }, { x: 5, y: 7.6 }, { x: 6, y: 5.3 }, { x: 8, y: 7.6 }, { x: 14.5, y: 7.6 }, { x: 15.5, y: 7.6 }, { x: 20, y: 5.6 }, { x: 25.5, y: 6.0 }, { x: 30, y: 4.0 }, { x: 38, y: 7.6 }, { x: 39, y: 7.6 }, { x: 46, y: 6.0 }, { x: 55.5, y: 7.6 }, { x: 4.8, y: 2.3 }, { x: 5.6, y: 2.3 }, { x: 6.4, y: 2.3 }];
  for (const spot of coinSpots) coin(spot.x, spot.y);
  // ANCHOR_END: coins
  // ANCHOR: map_pieces
  mapPiece(17.5, 7.7);
  mapPiece(31.0, 4.1);
  // Up near the top of the screen, over the sea: only the parrot can flap that high
  mapPiece(46.0, 0.7);
  // ANCHOR_END: map_pieces
  // ANCHOR: chest
  new Actor({
    appearance: [
      new FilledBox({ width: 0.9, height: 0.6, fillColor: "#8a5a2b", lineWidth: 0.05, lineColor: "#4d3217" }),
      new FilledBox({ width: 0.9, height: 0.1, fillColor: "#f2c14e" }),
      new TextSprite({ center: true, face: "Arimo Regular", size: 16, color: "#d62828" }, "X"),
    ],
    rigidBody: new BoxBody({ cx: 54.5, cy: GROUND - 0.3, width: 0.9, height: 0.6 }),
    behaviors: new CollectableBehavior({
      onCollect: (_chest: Actor, who: Actor) => {
        if (who != captain) return false;
        if (stage.score.counters.get("map") < 3) { say(54.5, 6.8, "The map is incomplete..."); return false; }
        // The ship and the HUD read this counter
        stage.score.counters.set("treasure", 1);
        say(54.5, 6.8, "Treasure!  Now get it to the ship!");
        return true;
      },
    }),
  });
  // ANCHOR_END: chest

  // Help, and trouble
  // ANCHOR: grog_feather
  pickup(49.5, 5.7, "#c2185b", "grog", (_who: Actor) => {
    // TODO (Grog): Grog restores a heart (the `HealthBehavior`'s `hitPoints`), but never above three.
    // (Rename `_who` to `who` once you use it.)
  });
  pickup(43, 7.6, "#ffd700", "feather", (who: Actor) => { getBehavior(who, HealthBehavior).invincibleRemaining = 8; });
  // ANCHOR_END: grog_feather
  // ANCHOR: boots_pickup
  pickup(40, 7.7, "#5d4037", "boots", (who: Actor) => {
    if (who != captain) return false;
    stage.score.counters.set("boots", 1);
    getBehavior(captain, JumpBehavior).numJumpsAllowed = 2;
    say(40, 6.9, "Double-jump boots!");
    return true;
  });
  // ANCHOR_END: boots_pickup
  // ANCHOR: crabs
  crab(15, 22, 1.5);
  crab(16.5, 23, 2.2);
  crab(37, 43, 1.8);
  crab(52.5, 57.5, 2.0);
  // ANCHOR_END: crabs
  // ANCHOR: cannon_usage
  cannon(33.4, 4.6);
  // ANCHOR_END: cannon_usage
  // ANCHOR: urchins
  urchin(24.2, 27.6, 1.2, captain);
  urchin(48.4, 50.1, 0.9, captain);
  // ANCHOR_END: urchins

  // ANCHOR: ship
  // The ship takes whoever is allowed aboard, and the level is won once everyone
  // who is alive is aboard, and the captain is one of them
  let captainAboard = false;
  new Actor({
    appearance: new FilledBox({ width: 3.6, height: 1.2, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 61.5, cy: 7.5, width: 3.6, height: 1.2 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({
      capacity: 2,
      onArrival: (who: Actor) => {
        if (who == captain && stage.score.counters.get("treasure") == 0) { say(61.5, 5.5, "No treasure, no sailing!"); return false; }
        if (who == captain) captainAboard = true;
        stage.score.counters.add("aboard", 1);
        swapTo(who == captain ? parrot : captain);
        return true;
      },
    }),
  });
  /** How many of the crew are still alive */
  const crewAlive = () => 2 - stage.score.counters.get("heroesDefeated");
  stage.score.addWinCondition(() => captainAboard && stage.score.counters.get("aboard") >= crewAlive());
  // ANCHOR_END: ship
  hudText(13.0, 0.55, 20, "#5a3a00", () => parrot.enabled || captainAboard ? "" : "Parrot lost!");
}

// ANCHOR: coin
/**
 * A spinning gold coin
 *
 * @param cx The x coordinate of the center of the coin
 * @param cy The y coordinate of the center of the coin
 */
function coin(cx: number, cy: number) {
  const frames = [0, 1, 2, 3, 4, 5, 6, 7].map(i => `coin${i}.png`);
  new Actor({
    appearance: new AnimatedSprite({ width: 0.45, height: 0.45, animations: new Map([[AnimationState.IDLE_E, AnimationSequence.makeSimple({ timePerFrame: 90, repeat: true, images: frames })]]) }),
    rigidBody: new CircleBody({ cx, cy, radius: 0.22 }),
    behaviors: new CollectableBehavior({ onCollect: "gold" }),
  });
}
// ANCHOR_END: coin

// ANCHOR: crab
/**
 * A crab that scuttles back and forth.  Stomp it from above to defeat it.
 *
 * @param left  The x coordinate of the left end of the crab's route
 * @param right The x coordinate of the right end of the crab's route
 * @param speed How fast the crab scuttles
 */
function crab(left: number, right: number, speed: number) {
  new Actor({
    appearance: [
      new FilledCircle({ radius: 0.35, fillColor: "#e4572e", lineWidth: 0.04, lineColor: "#8c2a12" }),
      new FilledCircle({ radius: 0.12, fillColor: "#e4572e", lineWidth: 0.03, lineColor: "#8c2a12", offset: { dx: -0.38, dy: -0.15 } }),
      new FilledCircle({ radius: 0.12, fillColor: "#e4572e", lineWidth: 0.03, lineColor: "#8c2a12", offset: { dx: 0.38, dy: -0.15 } }),
      new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: -0.1, dy: -0.2 } }),
      new FilledCircle({ radius: 0.05, fillColor: "#111111", offset: { dx: 0.1, dy: -0.2 } }),
    ],
    rigidBody: new CircleBody({ cx: left, cy: GROUND - 0.35, radius: 0.35 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(left, GROUND - 0.35).to(right, GROUND - 0.35).to(left, GROUND - 0.35), velocity: speed, loop: true }),
    behaviors: new HazardBehavior({
      damage: 1,
      // A stomp from above defeats the crab; anything else hurts you
      onContact: (zone: DIRECTION) => (zone == DIRECTION.N ? -1 : 1),
      onDefeated: (self: Actor, by?: Actor) => {
        by?.rigidBody.setVelocity(by.rigidBody.getVelocity().x, -8);
        const c = self.rigidBody.getCenter();
        coin(c.x - 0.3, c.y - 0.6);
        coin(c.x + 0.3, c.y - 0.6);
      },
    }),
  });
}
// ANCHOR_END: crab

// ANCHOR: crawl_fn
/**
 * Start or stop the captain's crawl.  `CrawlBehavior` keeps track of whether he
 * is crawling, and chooses the crawling pictures.  It can also turn his body on
 * its side, but a pirate lying on his side looks wrong in a side view, so we
 * pass 0, and make the body shorter instead.  That is all that it takes to fit
 * under a cannonball.
 *
 * @param captain The captain
 * @param on      True to start crawling, and false to stand up
 */
function crawl(captain: Actor, on: boolean) {
  if (on == captain.state.current.crawling) return;
  const behavior = getBehavior(captain, CrawlBehavior);
  // TODO (Crawl): Crawling should make the captain shorter.  Right now, `CrawlBehavior` changes his
  // pictures, but his rigid body stays tall.  When he starts to crawl, shrink his body (`resize(CRAWL_SCALE)`),
  // and move its center down by half of the height that he loses, so that his feet stay on the ground (his
  // picture's `offset` has to move too).  When he stands up, do the opposite (`resize(1 / CRAWL_SCALE)`).
  if (on) behavior.crawlOn(0);
  else behavior.crawlOff(0);
}
// ANCHOR_END: crawl_fn

// ANCHOR: urchin
/**
 * A spiny urchin that patrols the ground.  Its spikes are on top, so stomping it
 * hurts, and so does walking into it.  A crawling captain slides in under the
 * spikes and defeats it.
 *
 * @param left    The x coordinate of the left end of its patrol
 * @param right   The x coordinate of the right end of its patrol
 * @param speed   How fast it patrols
 * @param captain The captain, who is the only one that can defeat it
 */
function urchin(left: number, right: number, speed: number, captain: Actor) {
  const y = GROUND - 0.35;
  const look: (FilledCircle | FilledPolygon)[] = [new FilledCircle({ radius: 0.32, fillColor: "#3b2a5a", lineWidth: 0.04, lineColor: "#1c1230" })];
  for (let i = 0; i < 8; ++i) {
    const a = i * Math.PI / 4;
    const tip = { x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62 };
    const side = { x: Math.cos(a + 0.28) * 0.3, y: Math.sin(a + 0.28) * 0.3 };
    const other = { x: Math.cos(a - 0.28) * 0.3, y: Math.sin(a - 0.28) * 0.3 };
    look.push(new FilledPolygon({ vertices: [side, tip, other], fillColor: "#6a4c93", lineWidth: 0.03, lineColor: "#1c1230" }));
  }
  look.push(new FilledCircle({ radius: 0.06, fillColor: "#ffffff", offset: { dx: -0.1, dy: -0.04 } }), new FilledCircle({ radius: 0.06, fillColor: "#ffffff", offset: { dx: 0.1, dy: -0.04 } }));
  new Actor({
    appearance: look,
    rigidBody: new CircleBody({ cx: left, cy: y, radius: 0.35 }, { kinematic: true }),
    movement: new PathMovement({ path: new Path().to(left, y).to(right, y).to(left, y), velocity: speed, loop: true }),
    behaviors: new HazardBehavior({
      damage: 1,
      // Only a crawling captain is low enough to get under the spikes
      onContact: () => (captain.state.current.crawling ? -1 : 1),
      onDefeated: (self: Actor) => {
        const c = self.rigidBody.getCenter();
        coin(c.x - 0.3, c.y - 0.6);
        coin(c.x, c.y - 0.8);
        coin(c.x + 0.3, c.y - 0.6);
      },
    }),
  });
}
// ANCHOR_END: urchin

// ANCHOR: cannon
/**
 * A cannon that fires a cannonball to the left every couple of seconds
 *
 * @param cx      The x coordinate of the center of the cannon
 * @param surface The y coordinate of the top of whatever the cannon sits on
 */
function cannon(cx: number, surface: number) {
  block(cx - 0.5, surface - 0.8, cx + 0.5, surface, "#333333");
  stage.world.timer.addEvent(new TimedEvent(1.7, true, () => {
    const ball = new Actor({
      appearance: new FilledCircle({ radius: 0.22, fillColor: "#222222" }),
      rigidBody: new CircleBody({ cx: cx - 0.8, cy: surface - 0.85, radius: 0.22 }, { kinematic: true, collisionsEnabled: false }),
      behaviors: new HazardBehavior({ damage: 1 }),
    });
    ball.rigidBody.setVelocity(-5, 0);
    stage.world.timer.addEvent(new TimedEvent(1.6, false, () => ball.remove()));
  }));
}
// ANCHOR_END: cannon

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
