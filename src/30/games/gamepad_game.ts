import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, GamepadButton, ImageSprite, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, TextSprite, TiltMovement, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// [mfs] Do we need *this* demo?

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["green_ball.png"],
  };
}

/** Ignore small stick drift, so an idle controller doesn't cause tiny jitter */
const STICK_DEADZONE = 0.15;

/**
 * Build the levels of the game.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Tilt (and its keyboard fallback) still work here, same as any other
  // chapter -- the gamepad is an *additional* input source, not a
  // replacement.
  enableArrowKeyForces(10, 10);
  boundingBox();

  const hero = new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 8, cy: 4.5, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // The gamepad is `stage.gamepads[0]` -- the first slot -- always present
  // even if nothing's connected yet (check `.connected`). Every render
  // tick, if the left stick is being pushed, let it drive the hero; a
  // resting stick reports (0,0) and stops this from fighting with tilt or
  // the keyboard fallback when the gamepad isn't actually in use.
  // ANCHOR: stick
  stage.world.repeatEvents.push(() => {
    const pad = stage.gamepads[0];
    const { x, y } = pad.leftStick;
    if (Math.abs(x) > STICK_DEADZONE || Math.abs(y) > STICK_DEADZONE) {
      hero.rigidBody.setVelocity(x * 10, y * 10);
    }
  });
  // ANCHOR_END: stick

  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 22, color: "#000000" },
      () => `Gamepad: ${stage.gamepads[0].connected ? "connected" : "not connected -- use arrow keys or tilt"}`,
    ),
    rigidBody: new BoxBody({ cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  /**
   * The pause overlay. This is the same overlay-freezes-the-world mechanism
   * as the Pause Menu chapter -- the interesting part here is the gamepad
   * handler registered on it below: `stage.pollGamepads()` runs every tick
   * regardless of whether an overlay is showing (see `Stage.pollGamepads`),
   * so a button handler registered *inside* this overlay still fires even
   * though the world itself is completely frozen.
   */
  function renderPauseMenu(overlay: Scene) {
    new Actor({
      appearance: new FilledBox({ width: 16, height: 9, fillColor: "#000000aa" }),
      rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: overlay }),
    });
    new Actor({
      appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 36, color: "#FFFFFF" }, "Paused"),
      rigidBody: new BoxBody({ cx: 8, cy: 3, width: 6, height: 1.2 }, { scene: overlay }),
    });
    new Actor({
      appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 20, color: "#FFFFFF" }, "Tap, press Escape, or press A on a gamepad to resume"),
      rigidBody: new BoxBody({ cx: 8, cy: 5, width: 10, height: 1 }, { scene: overlay }),
      gestures: {
        onTap: () => {
          stage.clearOverlay();
          return true;
        },
      },
    });

    // ANCHOR: pause_pad
    // A gamepad handler, registered *while the world is paused*. Without
    // `pollGamepads()` running unconditionally every tick, this would never
    // fire.
    stage.gamepads[0].setButtonPressHandler(GamepadButton.A, () => stage.clearOverlay());
    // ANCHOR_END: pause_pad
  }

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_ESCAPE, () => stage.requestOverlay(renderPauseMenu, false));
  stage.gamepads[0].setButtonPressHandler(GamepadButton.START, () => stage.requestOverlay(renderPauseMenu, false));
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
