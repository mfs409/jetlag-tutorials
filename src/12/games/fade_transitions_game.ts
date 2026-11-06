import { Actor, BoxBody, CircleBody, ColorOverlayFilter, DebugToggle, FilledBox, FilterComponent, ImageSprite, JetLagGameConfig, PlayerControlBehavior, SpriteLocation, TextSprite, TiltMovement, TimedEvent, TouchPlateBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, currentLevel, enableArrowKeyForces, switchToLevel } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["green_ball.png", "mustard_ball.png"],
  };
}

/**
 * A full-screen black overlay that eases in or out over `durationMs`. This
 * is the whole trick behind a fade transition: no special "transition"
 * concept exists in JetLag, just a `FilterComponent` (the same mechanism the
 * Filters chapter uses for blur/grayscale/etc.) applied to the whole WORLD,
 * animated over time, and cleared for free the moment `stage.switchTo` resets
 * the renderer for the next level.
 */
class FadeFilterComponent implements FilterComponent {
  private overlay: ColorOverlayFilter;
  public enabled = true;

  constructor(
    private direction: "in" | "out",
    private durationMs: number,
  ) {
    this.overlay = new ColorOverlayFilter([0, 0, 0], direction === "out" ? 0 : 1);
  }

  getFilters() {
    return [this.overlay];
  }

  preRender(elapsedMs: number) {
    if (!this.enabled) return false;
    const delta = elapsedMs / this.durationMs;
    if (this.direction === "out") {
      this.overlay.alpha = Math.min(1, this.overlay.alpha + delta);
    } else {
      this.overlay.alpha = Math.max(0, this.overlay.alpha - delta);
      if (this.overlay.alpha <= 0) this.enabled = false;
    }
    return true;
  }
}

/** Start a fade-to-black, then switch to `nextLevel` once it finishes */
function fadeToLevel(nextLevel: number) {
  stage.renderer.addFilter(new FadeFilterComponent("out", 600), SpriteLocation.WORLD);
  stage.world.timer.addEvent(new TimedEvent(0.6, false, () => switchToLevel(builder, nextLevel)));
}

/**
 * Build the levels of the game. Both rooms use the same fade-in-on-load,
 * fade-out-on-exit pattern -- it's a technique layered on top of ordinary
 * `stage.switchTo`, not a special kind of level.
 */
function builder() {
  DebugToggle.enable();

  const level = currentLevel();
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Every level fades in from black as soon as it's built.
  stage.renderer.addFilter(new FadeFilterComponent("in", 600), SpriteLocation.WORLD);

  enableArrowKeyForces(10, 10);
  boundingBox();
  stage.backgroundColor = level === 1 ? "#b3cde0" : "#cde0b3";

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 2, cy: 4.5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // A door that fades out, then loads the other room -- rooms 1 and 2 just
  // point at each other.
  new Actor({
    appearance: new FilledBox({ width: 1, height: 1.6, fillColor: "#5b3a29" }),
    rigidBody: new BoxBody({ cx: 15, cy: 4.5, width: 1, height: 1.6 }),
    behaviors: new TouchPlateBehavior({
      onEnter: () => fadeToLevel(level === 1 ? 2 : 1),
    }),
  });

  new Actor({
    appearance: new ImageSprite({ width: 0.5, height: 0.5, img: "mustard_ball.png" }),
    rigidBody: new BoxBody({ cx: 15, cy: 3.4, width: 0.5, height: 0.5 }),
  });

  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 24, color: "#000000" }, `Room ${level}`),
    rigidBody: new BoxBody({ cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
