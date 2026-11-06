import { Actor, BoxBody, ChaseMovement, CircleBody, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, stage } from "jetlag2d";
import { BugData, Plant, TRAPS, isBug, isPlant, startGarden, elapsed, killBug, nearestPlant, splat, canPlaceTrap, placeTrap, flickSeed } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * The pad receives HUD coordinates, but the bugs and plants live in the world,
 * so convert: HUD meters to screen pixels, and then screen pixels to world
 * meters
 *
 * @param hud A position, in HUD meters
 *
 * @returns The same spot, in world meters
 */
function toWorldCoordinates(hud: { x: number, y: number }) {
  return stage.world.camera.screenToMeters(stage.hud.camera.metersToScreen(hud));
}

/**
 * MILESTONE 5 for Garden Defense: squishing, traps, stones, seeds, and watering all work.  The comments in the
 * builder say what each remaining piece needs.
 */
function builder() {
  // The garden, and the bugs that attack it, come from `helpers.ts`.  It needs
  // `spawnBug` (below) to make each new bug.
  const { stones, pouch, watering } = startGarden(builder, spawnBug);

  // A tap goes to the HUD first, unless we say otherwise.  The bugs are in the
  // world, so give the world the first chance.
  stage.gestures.gestureHudFirst = false;

  // The stone that is being dragged right now, if any
  let dragging: Actor | undefined;

  // All touch input goes through one invisible pad that covers the HUD.  It
  // looks at what's in the world under the pointer to decide what to do.
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: {
      // Tap on bare ground: drop a trap.  (A tap on a bug never gets this far,
      // because the bug handles it first.)
      onTap: (_a: Actor, hudCoords: { x: number, y: number }) => {
        const p = toWorldCoordinates(hudCoords);
        if (canPlaceTrap(p)) {
          stage.score.counters.add(TRAPS, -1);
          placeTrap(p.x, p.y);
        }
        return true;
      },

      // Drag a stone: the pan starts on a stone, follows the pointer, and stops
      onPanStart: (_a: Actor, hudCoords: { x: number, y: number }) => {
        const p = toWorldCoordinates(hudCoords);
        dragging = stones.find(s => stage.world.physics.actorsAt(p).includes(s));
        if (dragging) dragging.rigidBody.bodyType = "kinematic";
        // A press that turns into a drag isn't watering any more
        watering.plant = undefined;
        return true;
      },
      onPanMove: (_a: Actor, hudCoords: { x: number, y: number }) => {
        const p = toWorldCoordinates(hudCoords);
        if (dragging) dragging.rigidBody.setCenter(Math.max(0.5, Math.min(15.5, p.x)), Math.max(1, Math.min(8.5, p.y)));
        return true;
      },
      onPanStop: () => {
        if (dragging) dragging.rigidBody.bodyType = "static";
        dragging = undefined;
        return true;
      },

      // Flick a seed out of the pouch.  A swipe is reported once, after it ends.
      onSwipe: (_a: Actor, hudStart: { x: number, y: number }, hudEnd: { x: number, y: number }, ms: number) => {
        const s = toWorldCoordinates(hudStart), e = toWorldCoordinates(hudEnd);
        // Only a swipe that starts on the pouch counts
        if (!stage.world.physics.actorsAt(s).includes(pouch)) return false;
        // Distance over time is speed (in the right direction), scaled until it felt right
        let vx = (e.x - s.x) / Math.max(ms, 30) * 600, vy = (e.y - s.y) / Math.max(ms, 30) * 600;
        const speed = Math.hypot(vx, vy);
        if (speed > 18) { vx *= 18 / speed; vy *= 18 / speed; }
        flickSeed(vx, vy);
        return true;
      },

      // Press and hold on a plant to water it.  Touching down picks the plant,
      // and letting go puts the watering can down.
      onTouchDown: (_a: Actor, hudCoords: { x: number, y: number }) => {
        watering.plant = stage.world.physics.actorsAt(toWorldCoordinates(hudCoords)).find(isPlant);
        return true;
      },
      onTouchUp: () => { watering.plant = undefined; return true; },

      // TODO (Hover): Hover (mouse only): show a faint circle where a trap would go, in yellow if it can go
      // there and red if it can't, and hide it when the mouse leaves.  (`preview.show` and
      // `preview.hide` do the drawing.)
    },
  });
}

/**
 * Send a new bug in from a random edge, toward the nearest living plant
 *
 * @param plants All of the plants
 *
 * @returns The new bug, or nothing if every plant has been eaten
 */
function spawnBug(plants: Plant[]) {
  const beetle = stage.random.next() < Math.min(0.35, elapsed() / 150);
  const side = Math.floor(stage.random.next() * 4);
  const t = stage.random.next();
  const [x, y] = side == 0 ? [t * 16, -0.3] : side == 1 ? [16.3, t * 9] : side == 2 ? [t * 16, 9.3] : [-0.3, t * 9];
  const target = nearestPlant(plants, x, y);
  if (!target) return undefined;
  const r = beetle ? 0.3 : 0.18;
  const speed = beetle ? 0.75 : 1.15;
  return new Actor({
    appearance: beetle
      ? [new FilledCircle({ radius: r, fillColor: "#3a2f6b", lineWidth: 0.05, lineColor: "#1a1433" }), new FilledBox({ width: 0.04, height: r * 1.8, fillColor: "#1a1433" })]
      : [new FilledCircle({ radius: r, fillColor: "#b3261e", lineWidth: 0.04, lineColor: "#5c120e" })],
    // Fingers are fat and bugs are small, so a bug's body is never smaller than a fingertip
    rigidBody: new CircleBody({ cx: x, cy: y, radius: Math.max(r, 0.3) }, { dynamic: true }),
    movement: new ChaseMovement({ speed, target }),
    // Tap a bug to squish it.  Beetles take three taps.
    gestures: {
      onTap: (self: Actor) => {
        if (!isBug(self)) return false;
        self.data.hp -= 1;
        if (self.data.hp <= 0) killBug(self, true);
        else {
          const c = self.rigidBody.getCenter();
          splat(c.x, c.y, "#ffffff", 0.15);
        }
        return true;
      },
    },
    // Everything that this bug needs to remember
    data: new BugData(beetle ? 3 : 1, speed),
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
