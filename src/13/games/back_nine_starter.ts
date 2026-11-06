import { Actor, BoxBody, ImageSprite, initializeAndLaunch, JetLagGameConfig, SolidBehavior, SvgSystem } from "jetlag2d";
import { Hole, startHole, theme } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: [`back_nine_${theme()}.json`],
  };
}

/**
 * STARTER CODE for Crazy Golf: Back Nine.
 *
 * The same mini golf as Chapter 2, except that every hole was drawn as an SVG file instead of being built from boxes, so the walls can curve.  The golf is in
 * `helpers.ts`.  Each wall is a rail, but the Canyon's far bend is supposed to be rubber, and it isn't.  The comments say what it needs.
 */

// ANCHOR: holes
const HOLES: Hole[] = [
  { name: "The Kidney", par: 2, tee: [2.4, 4.6], cup: [13.6, 4.6], svgs: [{ file: "back_nine_h1_green.svg", x: 1.0, y: 2.388 }] },
  {
    name: "Snail Shell", par: 4, tee: [2.0, 4.9], cup: [8.0, 4.9],
    svgs: [{ file: "back_nine_h2_shell.svg", x: 0.6, y: 0.95 }, { file: "back_nine_h2_spiral.svg", x: 4.732, y: 2.381 }],
  },
  // The canyon's outline runs along the top edge (segments 0-35), across the
  // right end (36), back along the bottom edge (37-72), and closes on the
  // left (73).  Segments 40-52 are the far bend's outer wall: rubber.
  { name: "S-Canyon", par: 3, tee: [1.8, 5.7], cup: [14.2, 4.1], svgs: [{ file: "back_nine_h3_canyon.svg", x: 1.0, y: 1.35 }], rubber: [40, 52] },
];
// ANCHOR_END: holes

/** Build one hole.  Which one comes from the current level number. */
function builder() {
  const hole = startHole(builder, HOLES);

  // ANCHOR: svg_walls
  // The walls: every straight segment of every SVG becomes one rotated, skinny box.  SvgSystem calls us once per segment, always in the same
  // order.
  for (const svg of hole.svgs) {
    // TODO (The back nine): Every wall is the same.  The Canyon says which of its segments are rubber (`hole.rubber`: the first and the last).  Count the segments as you are
    // called (a variable outside the function), and make the ones in that range a `bumper.png`, with an elasticity of 1.15, and the rest a `rail.png`, with 0.6.
    SvgSystem.processFile(svg.file, svg.x, svg.y, 1, 1, (cx: number, cy: number, len: number, rot: number) => {
      const w = new Actor({
        appearance: new ImageSprite({ width: len + 0.06, height: 0.16, img: "rail.png" }),
        rigidBody: new BoxBody({ cx, cy, width: len + 0.06, height: 0.16 }, { elasticity: 0.6 }),
        behaviors: new SolidBehavior(),
      });
      w.rigidBody.rotation = rot;
    });
  }
  // ANCHOR_END: svg_walls
}

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
