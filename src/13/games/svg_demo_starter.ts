import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, PlayerControlBehavior, SolidBehavior, SvgSystem, TiltMovement, initializeAndLaunch } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json"],
  };
}

/**
 * STARTER CODE for drawing a shape from an SVG file.
 */
function builder() {
  DebugToggle.enable();

  enableArrowKeyForces(10, 10);
  boundingBox();

  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.25, cy: 5.25, radius: 0.4 }, { density: 5, friction: 0.6 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // Draw an obstacle from SVG instead of drawing it by hand.  We stretch it
  // in the X and Y dimensions (2, 2 -> 1.5, 1.5), and offset it from the
  // origin, so it doesn't have to be re-drawn to fit each new level.
  //
  // Notice that "shape.svg" is not in `resources.imageNames` -- SvgSystem
  // fetches it on its own the moment we call processFile().
  SvgSystem.processFile(
    "shape.svg",
    2,
    2,
    1.5,
    1.5,
    (centerX: number, centerY: number, width: number, _rotation: number) => {
      // processFile() turns every line segment of the shape into a call to
      // this function, giving us the segment's center, length, and angle.
      // We're free to draw each segment however we want; here, thin
      // rotated boxes stitch together into the outline of the shape.
      let a = new Actor({
        appearance: new FilledBox({ width, height: 0.05, fillColor: "#FF0000" }),
        rigidBody: new BoxBody({ cx: centerX, cy: centerY, width, height: 0.05 }),
        behaviors: new SolidBehavior(),
      });
      // TODO (A first shape): Every piece of the shape lies flat.  `processFile` also tells the function how much the segment is turned (`rotation`).
      // Give it to the rigid body (`a.rigidBody.rotation`).  (Rename `_rotation` when you use it.)
      a.rigidBody.setPhysics({ density: 1, elasticity: 0.2, friction: 0.4 });
    },
  );
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
