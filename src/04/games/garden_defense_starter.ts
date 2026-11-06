import { Actor, BoxBody, ChaseMovement, CircleBody, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, stage } from "jetlag2d";
import { BugData, Plant, startGarden, elapsed, nearestPlant } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

// TODO (Convert): Write `toWorldCoordinates(hud)`, which turns a HUD position into a world position
// (`stage.hud.camera.metersToScreen`, then `stage.world.camera.screenToMeters`).

/**
 * STARTER CODE for Garden Defense.
 *
 * Bugs crawl in from every side and eat your plants, and you can't do
 * anything about it yet: there's no way to squish them, trap them, block
 * them, or grow anything back.  Play it, and watch the garden get eaten.
 *
 * The garden is built for you, in `helpers.ts`: the bed, the plants, the stones,
 * the seed pouch, the HUD (which already counts your traps), and the end screens.
 * Bugs and plants are actors that
 * carry their own `data` (see `PlantData` and `BugData`).  Taps on bugs go
 * straight to the bugs, and every other gesture goes through the invisible pad
 * that covers the HUD (JetLag only delivers pans, press/release, and swipes to
 * the HUD).  The comments say what each missing piece needs.
 */
function builder() {
  // The garden, and the bugs that attack it, come from `helpers.ts`.  It needs
  // `spawnBug` (below) to make each new bug.
  startGarden(builder, spawnBug);

  // TODO (Squish): Tap: a tap goes to the HUD first, so give the world the first chance, with
  // `stage.gestures.gestureHudFirst = false`.  (This goes at the top of the builder, after `startGarden`.)

  // All touch input goes through one invisible pad that covers the HUD.  It
  // looks at what's in the world under the pointer to decide what to do.
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: {
      // TODO (Traps): Tapping bare ground drops a trap right where you tapped: if `canPlaceTrap(p)`,
      // use up a trap (the `TRAPS` counter), and call `placeTrap`.  (`p` is in world coordinates.)

      // TODO (Stones): Pan: dragging a stone moves it, so you can wall off an approach.  Remember which stone
      // the pan started on, move it while the pointer moves, and let go when the pan stops.
      // A stone should be kinematic while it's dragged, and static again when it's dropped.

      // TODO (Seeds): Swipe: a quick flick that starts on the seed pouch launches a seed in that direction,
      // faster for a faster flick.  Work out the velocity from the swipe's start, end, and time, and
      // give it to `flickSeed`.

      // TODO (Watering): Touch down and touch up: touching down on a plant starts watering it (look at what's
      // under the pointer with `actorsAt`, and set `watering.plant`), and letting go stops.

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
    // TODO (Squish): Tap: tapping a bug squishes it.  Give the bug's actor a tap handler that takes one hit
    // point off its `data.hp`, and squishes it with `killBug` when none are left.  Beetles take three taps.
    // Everything that this bug needs to remember
    data: new BugData(beetle ? 3 : 1, speed),
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
