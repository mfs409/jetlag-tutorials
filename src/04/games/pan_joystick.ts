import { Actor, CircleBody, DebugToggle, GoalBehavior, ImageSprite, JetLagGameConfig, PlayerControlBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox } from "../common/common";

// [mfs] Does this demo provide value?

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
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  // There will be winning and losing in these chapters, and we'll always want
  // to restart
  stage.score.onLose = builder;
  stage.score.onWin = builder;

  boundingBox();

  // A dynamic hero, so that the joystick can control it
  let hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 1, cy: 1.5, radius: 0.4 }, { dynamic: true }),
    behaviors: new PlayerControlBehavior(),
  });

  // A destination to reach
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 11, cy: 6, radius: 0.4 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
  });

  // A pan is reported in three parts (start, move, stop), which is exactly
  // what's needed for an on-screen joystick: compute a vector from the
  // joystick's center to wherever the touch currently is, and use that
  // vector as the hero's velocity.
  let jcx = 1,
    jcy = 8; // center of joystick
  let scale = 2;
  function doMove(_actor: Actor, hudCoords: { x: number; y: number }) {
    hero.rigidBody.setVelocity(scale * (hudCoords.x - jcx), scale * (hudCoords.y - jcy));
    return true;
  }
  function doStop() {
    hero.rigidBody.setVelocity(0, 0);
    hero.rigidBody.clearRotation(); // be sure to try without this
    return true;
  }

  // Make a joystick
  new Actor({
    appearance: new ImageSprite({ width: 2, height: 2, img: "grey_ball.png" }),
    rigidBody: new CircleBody({ cx: jcx, cy: jcy, radius: 1 }, { scene: stage.hud }),
    gestures: { onPanStart: doMove, onPanMove: doMove, onPanStop: doStop },
  });

  // Notice that if you glide your finger off the joystick, panStop never
  // fires. That's a real limitation worth knowing about; it's fixable, but
  // this example doesn't bother.
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
