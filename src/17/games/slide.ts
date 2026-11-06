import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, KeyCodes, SolidBehavior, findBehavior, stage } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/** How fast the hero slides from one square to the next, in meters per second */
const SLIDE_SPEED = 8;

/**
 * Grid movement that looks smooth.  The hero still lives on a grid, and a key
 * press still means "go one square".  But instead of jumping there, the hero
 * slides, a little every frame, and ignores keys until it arrives.
 */
function builder() {
  DebugToggle.enable();
  stage.backgroundColor = "#e0cf9f";

  // A border, and a few walls
  const walls = ["################", "#              #", "#   ##    #    #", "#         #    #", "#    #         #", "#              #", "#     ###      #", "#              #", "################"];
  walls.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch != "#") return;
    new Actor({
      appearance: new FilledBox({ width: 1, height: 1, fillColor: "#4d5c70" }),
      rigidBody: new BoxBody({ cx: c + 0.5, cy: r + 0.5, width: 1, height: 1 }),
      behaviors: new SolidBehavior(),
    });
  }));

  const hero = new Actor({
    appearance: new FilledCircle({ radius: 0.4, fillColor: "#ffd35a", lineWidth: 0.05, lineColor: "#8a6d1a", z: 1 }),
    rigidBody: new CircleBody({ cx: 1.5, cy: 1.5, radius: 0.35 }, { collisionsEnabled: false }),
  });

  // Where the hero is going, if it's in the middle of a slide
  let target: { x: number, y: number } | undefined;

  /**
   * Start a slide, if the square is free and no slide is going on
   *
   * @param dx The step in columns
   * @param dy The step in rows
   */
  const slide = (dx: number, dy: number) => {
    if (target) return;
    const c = hero.rigidBody.getCenter(), next = { x: c.x + dx, y: c.y + dy };
    if ([...stage.world.physics.actorsAt(next)].some(a => findBehavior(a, SolidBehavior))) return;
    target = next;
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => slide(0, -1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => slide(0, 1));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => slide(-1, 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => slide(1, 0));

  // Every frame, move a little closer to the target, without going past it
  stage.world.repeatEvents.push((dt: number) => {
    if (!target) return;
    const c = hero.rigidBody.getCenter();
    const dx = target.x - c.x, dy = target.y - c.y, dist = Math.hypot(dx, dy), step = SLIDE_SPEED * dt;
    if (dist <= step) { hero.rigidBody.setCenter(target.x, target.y); target = undefined; }
    else hero.rigidBody.setCenter(c.x + dx / dist * step, c.y + dy / dist * step);
  });
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
