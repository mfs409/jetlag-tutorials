import { Actor, CircleBody, DebugToggle, GoalBehavior, HazardBehavior, ImageSprite, JetLagGameConfig, JumpBehavior, KeyCodes, ProjectileMovement, SolidBehavior, SoundEffectComponent, ThrowableBehavior, TiltMovement, getBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, drawMuteButton, enableArrowKeyForces, heroBehaviors } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  // Here's where we name all the images/sounds/background music files.
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    soundNames: [
      "flap_flap.ogg",
      "high_pitch.ogg",
      "low_pitch.ogg",
      "lose_sound.ogg",
      "slow_down.ogg",
      "win_sound.ogg",
    ],
    imageNames: ["sprites.json"],
  };
}

/**
 * Build the levels of the game.
 *
 */
function builder() {
  DebugToggle.enable();

  boundingBox();
  enableArrowKeyForces(10, 0);
  stage.world.gravity = { x: 0, y: 10 };

  // First: you always need a gesture before a web page will play audio, so
  // let's put a mute/unmute button on the HUD:
  drawMuteButton({ cx: 15.5, cy: 0.5, width: 1, height: 1, scene: stage.hud });

  // This obstacle is deliberately overloaded: `collide` fires from
  // SoundEffectComponent like any other actor, but `disappear` only fires
  // because onTap calls remove() -- tapping it is what triggers the sound,
  // not the collision.
  let o = new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "purple_ball.png" }),
    rigidBody: new CircleBody({ cx: 2.5, cy: 8.5, radius: 0.5 }),
    behaviors: new SolidBehavior(),
    sounds: new SoundEffectComponent({ collide: "flap_flap.ogg", disappear: "high_pitch.ogg" }),
    gestures: {
      onTap: () => {
        o.remove();
        return true;
      },
    },
  });

  // The hero gets a jump sound.  Its tossed projectile is a completely
  // separate actor with its own SoundEffectComponent, so `toss` plays on
  // *its* creation, not the hero's.
  let h = new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 0.5, cy: 8.5, radius: 0.5 }),
    behaviors: [...heroBehaviors(), new JumpBehavior()],
    movement: new TiltMovement(),
    sounds: new SoundEffectComponent({ jump: "slow_down.ogg" }),
    gestures: {
      onTap: () => {
        let p = new Actor({
          appearance: new ImageSprite({ width: 0.2, height: 0.2, img: "grey_ball.png" }),
          rigidBody: new CircleBody({ cx: h.rigidBody.getCenter().x + 0.2, cy: h.rigidBody.getCenter().y, radius: 0.1 }),
          movement: new ProjectileMovement(),
          behaviors: new ThrowableBehavior(),
          sounds: new SoundEffectComponent({ toss: "low_pitch.ogg" }),
        });
        // "tossFixedDir" throws in a specific direction, starting at a point,
        // such as the hero's center.
        (getBehavior(p, ThrowableBehavior)).tossFixedDir({ actor: h, offset: { dx: 0.2, dy: 0 }, velocity: { x: 5, y: 0 } });
        return false;
      },
    },
  });
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => (getBehavior(h, JumpBehavior)).jump(0, -7.5));

  // A hazard's `defeat` sound and a destination's `arrive` sound both come
  // for free just by naming a file in the `sounds` block -- no extra event
  // wiring, since HazardBehavior and GoalBehavior already know when those
  // moments happen.
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "red_ball.png" }),
    rigidBody: new CircleBody({ cx: 4.5, cy: 8.5, radius: 0.5 }),
    behaviors: new HazardBehavior(),
    sounds: new SoundEffectComponent({ defeat: "lose_sound.ogg" }),
  });
  new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 14.5, cy: 8.5, radius: 0.5 }),
    behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
    sounds: new SoundEffectComponent({ arrive: "win_sound.ogg" }),
  });

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  // Long sounds don't overlap well with fast gameplay -- it's up to you to
  // pace the action to fit your sound files, not the other way around.
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
