import { Actor, BoxBody, ColorOverlayFilter, FilledBox, FilterComponent, GrayscaleFilter, SolidBehavior } from "jetlag2d";

/**
 * HELPERS for Lights Out.
 *
 * Everything in this file is provided, and you don't have to edit it.  It has the size of the house, how far the flashlight
 * reaches, the colors of the end screens, the two kinds of filter (a `Fade`, and a `Gray`), and the pieces that the house is
 * made of (`wall` and `floor`).  The animations, the particles, the camera shake, the flashlight, and the filters are what you write.
 */

/** How big the house is, in meters */
export const WORLD = { w: 32, h: 18 };
// ANCHOR: light_radius
/** How far the flashlight reaches, in meters */
export const LIGHT_RADIUS = 3.4;
// ANCHOR_END: light_radius

// ANCHOR: filter_classes
// ANCHOR: fade_class
/**
 * A fade to (or from) black.  It's a filter that changes its own opacity a
 * little more every frame.
 */
export class Fade implements FilterComponent {
  /** The Pixi filter that does the work: a layer of black */
  private filter = new ColorOverlayFilter({ color: 0x000000, alpha: 1 });
  /** Is the filter on?  (`preRender` reports this to JetLag) */
  public enabled = true;
  /** How many milliseconds of the fade have gone by */
  private elapsed = 0;

  /**
   * Make a fade
   *
   * @param from How opaque the black is at the start (0 to 1)
   * @param to   How opaque the black is at the end (0 to 1)
   * @param ms   How many milliseconds the fade takes
   */
  constructor(private from: number, private to: number, private ms: number) { this.filter.alpha = from; }

  /** JetLag asks for the Pixi filters to attach */
  getFilters() { return [this.filter]; }

  /**
   * JetLag calls this before every frame is drawn
   *
   * @param elapsedMs The time since the last frame
   * @returns         True if the filter should be drawn
   */
  preRender(elapsedMs: number) {
    this.elapsed = Math.min(this.ms, this.elapsed + elapsedMs);
    this.filter.alpha = this.from + (this.to - this.from) * (this.elapsed / this.ms);
    return this.enabled;
  }
}
// ANCHOR_END: fade_class

// ANCHOR: gray_class
/** Grayscale, which creeps in when you're down to your last heart */
export class Gray implements FilterComponent {
  /** The Pixi filter that does the work */
  private filter = new GrayscaleFilter();
  /** Is the filter on?  It starts off. */
  public enabled = false;

  /** JetLag asks for the Pixi filters to attach */
  getFilters() { return [this.filter]; }

  /** JetLag calls this before every frame is drawn.  The answer is "only when enabled". */
  preRender() { return this.enabled; }
}
// ANCHOR_END: gray_class
// ANCHOR_END: filter_classes

/** Colors for this game's end screens */
export const END_STYLE = { background: "#0b0810", titleColor: "#d8cfe8", detailColor: "#8a7fa0" };

/**
 * A wall, which is solid
 *
 * @param l The x coordinate of the left edge
 * @param t The y coordinate of the top edge
 * @param r The x coordinate of the right edge
 * @param b The y coordinate of the bottom edge
 */
export function wall(l: number, t: number, r: number, b: number) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: "#4a3b57", lineWidth: 0.04, lineColor: "#2a2033" }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }),
    behaviors: new SolidBehavior(),
  });
}

/**
 * A floor, which is only for looking at
 *
 * @param l     The x coordinate of the left edge
 * @param t     The y coordinate of the top edge
 * @param r     The x coordinate of the right edge
 * @param b     The y coordinate of the bottom edge
 * @param color The HTML hex color of the floor
 */
export function floor(l: number, t: number, r: number, b: number, color: string) {
  new Actor({
    appearance: new FilledBox({ width: r - l, height: b - t, fillColor: color, z: -2 }),
    rigidBody: new BoxBody({ cx: (l + r) / 2, cy: (t + b) / 2, width: r - l, height: b - t }, { collisionsEnabled: false }),
  });
}
