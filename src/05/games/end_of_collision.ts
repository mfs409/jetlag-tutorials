import { Actor, BoxBody, CircleBody, DebugToggle, ImageSprite, JetLagGameConfig, PlayerControlBehavior, SolidBehavior, TextSprite, TiltMovement, findBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

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
 * A game showing that collisions have an end, not just a beginning.  Every
 * collision handler we've used so far runs when two actors *start* touching.
 * Here, each time the hero touches the obstacle, we also register a
 * one-shot handler for when they *stop* touching, and use that to drive a
 * tiny ad hoc state machine: three collisions cycle through three messages,
 * and the third one wins the level.
 */
function builder() {
  DebugToggle.enable();

  stage.score.onLose = builder;
  stage.score.onWin = builder;

  boundingBox();
  enableArrowKeyForces(10, 10);
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "green_ball.png" }),
    rigidBody: new CircleBody({ cx: 2, cy: 3, radius: 0.4 }),
    movement: new TiltMovement(),
    behaviors: new PlayerControlBehavior(),
  });

  // `collisions` counts how many times the hero has touched the obstacle,
  // and doubles as an index into `messages`, so each collision shows the
  // next message in the sequence.
  let collisions = 0;
  let messages = ["Please leave me alone", "Why do you bother me so?", "Fine, you win."];
  new Actor({
    appearance: new ImageSprite({ width: 0.8, height: 0.8, img: "mustard_ball.png" }),
    rigidBody: new CircleBody({ cx: 15, cy: 8, radius: 0.4 }),
    behaviors: new SolidBehavior({
      onContact: (self: Actor, other: Actor) => {
        if (!findBehavior(other, PlayerControlBehavior)) return;
        let text = new Actor({
          appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 30, color: "#FF00FF" }, () => messages[collisions]),
          rigidBody: new BoxBody({ cx: 12, cy: 6, width: 0.01, height: 0.01 }),
        });
        // We can only register an end-contact handler once we already know
        // these two actors are touching -- there's no contact to attach it
        // to beforehand.  It fires exactly once, so if the hero and
        // obstacle collide again later, this callback runs again and
        // registers a fresh one.
        stage.world.physics.addEndContactHandler(self, other, () => {
          collisions++;
          text.remove();
          if (collisions == 3) stage.score.winLevel();
        });
      },
    }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
