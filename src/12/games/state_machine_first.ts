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

  // In overhead mode, it usually makes sense to have animations for 8
  // directions: N, NE, E, SE, S, SW, W, and NW.  Here we're only doing 4
  // (N/S/E/W), just to see how a state machine works -- it won't look right
  // when the hero moves diagonally, but we'll deal with that later.
  boundingBox();

  // Walking animations: one flipbook sequence per direction, all sharing
  // the same timing.  Each gets mapped to the WALK_* state for that
  // direction, so JetLag knows which animation to play once the state
  // machine decides the hero is walking that way.
  let animations = new Map();
  animations.set(AnimationState.WALK_N, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_u_0.png", "alien_walk_u_1.png", "alien_walk_u_2.png", "alien_walk_u_3.png", "alien_walk_u_4.png", "alien_walk_u_5.png", "alien_walk_u_6.png", "alien_walk_u_7.png", "alien_walk_u_8.png"] }));
  animations.set(AnimationState.WALK_W, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_l_0.png", "alien_walk_l_1.png", "alien_walk_l_2.png", "alien_walk_l_3.png", "alien_walk_l_4.png", "alien_walk_l_5.png", "alien_walk_l_6.png", "alien_walk_l_7.png", "alien_walk_l_8.png"] }));
  animations.set(AnimationState.WALK_S, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_d_0.png", "alien_walk_d_1.png", "alien_walk_d_2.png", "alien_walk_d_3.png", "alien_walk_d_4.png", "alien_walk_d_5.png", "alien_walk_d_6.png", "alien_walk_d_7.png", "alien_walk_d_8.png"] }));
  animations.set(AnimationState.WALK_E, AnimationSequence.makeSimple({ timePerFrame: 75, repeat: true, images: ["alien_walk_r_0.png", "alien_walk_r_1.png", "alien_walk_r_2.png", "alien_walk_r_3.png", "alien_walk_r_4.png", "alien_walk_r_5.png", "alien_walk_r_6.png", "alien_walk_r_7.png", "alien_walk_r_8.png"] }));

  // Idle animations for the same 4 directions, using the varying-time style
  // (mostly resting, with an occasional quick blink) so the hero doesn't
  // look frozen when it's standing still.
  animations.set(AnimationState.IDLE_N, new AnimationSequence(true).to("alien_thrust_u_0.png", 750).to("alien_thrust_u_1.png", 75));
  animations.set(AnimationState.IDLE_W, new AnimationSequence(true).to("alien_thrust_l_0.png", 750).to("alien_thrust_l_1.png", 75));
  animations.set(AnimationState.IDLE_S, new AnimationSequence(true).to("alien_thrust_d_0.png", 750).to("alien_thrust_d_1.png", 75));
  animations.set(AnimationState.IDLE_E, new AnimationSequence(true).to("alien_thrust_r_0.png", 750).to("alien_thrust_r_1.png", 75));

  const hero = new Actor({
    rigidBody: new BoxBody({ cx: 3, cy: 4, width: 1, height: 2 }, { dynamic: true }),
    appearance: new AnimatedSprite({ width: 2, height: 2, animations }),
    behaviors: new PlayerControlBehavior(),
  });

  // Wire up the arrow keys to the hero's velocity.  We never touch the
  // animation state directly here -- JetLag's state machine looks at the
  // hero's velocity each frame and picks WALK_* or IDLE_* automatically.
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (hero.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT], () => (hero.rigidBody.xVelocity = 0));

  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (hero.rigidBody.yVelocity = -5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (hero.rigidBody.yVelocity = 5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (hero.rigidBody.xVelocity = -5));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (hero.rigidBody.xVelocity = 5));
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
