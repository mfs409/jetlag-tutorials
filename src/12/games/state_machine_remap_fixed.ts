import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, DebugToggle, JetLagGameConfig, KeyCodes, PlayerControlBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox } from "../common/common";

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
    imageNames: ["alien.json"],
  };
}

/**
 * Build the levels of the game.
 *
 * @param level Which level should be displayed
 */
function builder() {
  DebugToggle.enable();

  boundingBox();

  let animations = new Map();
  animations.set(AnimationState.WALK_N, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_u_0.png", "alien_walk_u_1.png", "alien_walk_u_2.png", "alien_walk_u_3.png", "alien_walk_u_4.png", "alien_walk_u_5.png", "alien_walk_u_6.png", "alien_walk_u_7.png", "alien_walk_u_8.png"] }));
  animations.set(AnimationState.WALK_W, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_l_0.png", "alien_walk_l_1.png", "alien_walk_l_2.png", "alien_walk_l_3.png", "alien_walk_l_4.png", "alien_walk_l_5.png", "alien_walk_l_6.png", "alien_walk_l_7.png", "alien_walk_l_8.png"] }));
  animations.set(AnimationState.WALK_S, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_d_0.png", "alien_walk_d_1.png", "alien_walk_d_2.png", "alien_walk_d_3.png", "alien_walk_d_4.png", "alien_walk_d_5.png", "alien_walk_d_6.png", "alien_walk_d_7.png", "alien_walk_d_8.png"] }));
  animations.set(AnimationState.WALK_E, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_r_0.png", "alien_walk_r_1.png", "alien_walk_r_2.png", "alien_walk_r_3.png", "alien_walk_r_4.png", "alien_walk_r_5.png", "alien_walk_r_6.png", "alien_walk_r_7.png", "alien_walk_r_8.png"] }));

  animations.set(AnimationState.IDLE_N, new AnimationSequence(true).to("alien_thrust_u_0.png", 750).to("alien_thrust_u_1.png", 75));
  animations.set(AnimationState.IDLE_W, new AnimationSequence(true).to("alien_thrust_l_0.png", 750).to("alien_thrust_l_1.png", 75));
  animations.set(AnimationState.IDLE_S, new AnimationSequence(true).to("alien_thrust_d_0.png", 750).to("alien_thrust_d_1.png", 75));
  animations.set(AnimationState.IDLE_E, new AnimationSequence(true).to("alien_thrust_r_0.png", 750).to("alien_thrust_r_1.png", 75));

  // Instead of drawing (and animating) new diagonal states, we re-map each
  // diagonal to the animation of its nearest cardinal direction. Now
  // walking NE literally *is* the WALK_E animation -- not a fresh copy of
  // it -- so switching between them never restarts the animation, and the
  // stutter from the previous example is gone.
  let remap = new Map();
  remap.set(AnimationState.WALK_NE, AnimationState.WALK_E);
  remap.set(AnimationState.WALK_SE, AnimationState.WALK_E);
  remap.set(AnimationState.WALK_NW, AnimationState.WALK_W);
  remap.set(AnimationState.WALK_SW, AnimationState.WALK_W);

  remap.set(AnimationState.IDLE_NE, AnimationState.IDLE_E);
  remap.set(AnimationState.IDLE_SE, AnimationState.IDLE_E);
  remap.set(AnimationState.IDLE_NW, AnimationState.IDLE_W);
  remap.set(AnimationState.IDLE_SW, AnimationState.IDLE_W);

  // Pass `remap` alongside `animations` when building the AnimatedSprite,
  // and JetLag will consult it whenever the state machine lands on a state
  // that isn't in the `animations` map.
  const hero = new Actor({
    rigidBody: new BoxBody({ cx: 3, cy: 4, width: 1, height: 2 }, { dynamic: true }),
    appearance: new AnimatedSprite({ width: 2, height: 2, animations, remap }),
    behaviors: new PlayerControlBehavior(),
  });

  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (hero.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT], () => (hero.rigidBody.xVelocity = 0));

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = -5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = 5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = -5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 5));

  // Be sure to check out the platformer chapter and the overhead fighting
  // and farming chapter for more examples of animations
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
