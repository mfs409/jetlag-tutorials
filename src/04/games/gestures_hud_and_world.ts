import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, ImageSprite, JetLagGameConfig, Path, PathMovement, b2Vec2, initializeAndLaunch, stage } from "jetlag2d";
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

/** What a selectable actor remembers, in its `data`: when it was last tapped, and what being poked means to it */
class PokeData {
  /** When the actor was last tapped */
  lastTap = 0;
  /** What being poked means to the actor */
  poke: (meters: { x: number; y: number }) => void;

  /**
   * Make the data for a selectable actor
   *
   * @param poke What happens when the actor is poked
   */
  constructor(poke: (meters: { x: number; y: number }) => void) {
    this.poke = poke;
  }
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

  // In the previous levels, any single kind of gesture only happened in one
  // place.  What if we want a kind of gestures to be handled on the HUD and
  // in the world?
  boundingBox();

  // Track the actor most recently tapped ("activated"), so that a tap
  // elsewhere on the HUD knows which actor to send to that location.
  let lastTapActor: Actor<PokeData> | undefined = undefined;

  // An actor that "teleports": tapping it activates it, and double-tapping
  // (within 300ms, tracked via the `lastTap` timestamp in its data) removes it
  // instead.
  const teleport_actor: Actor<PokeData> = new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "purple_ball.png" }),
    rigidBody: new CircleBody({ cx: 14, cy: 1, radius: 0.5 }),
    gestures: {
      onTap: () => {
        let x = stage.renderer.now; // Time of this tap
        // If it's been less than 300 milliseconds since the last tap, remove it
        if (x - teleport_actor.data.lastTap < 300 && lastTapActor == teleport_actor) {
          lastTapActor = undefined;
          teleport_actor.remove();
          return true;
        }
        // Otherwise, remember the time of the tap, and that it is activated
        teleport_actor.data.lastTap = x;
        lastTapActor = teleport_actor;
        return true;
      },
    },
    // `poke` is how each activatable actor defines what "being
    // poked" means to it -- here, that's an instant relocation.
    data: new PokeData((meters: { x: number; y: number }) => {
      teleport_actor.rigidBody.setCenter(meters.x, meters.y);
    }),
  });

  // Make the tappable region on the hud
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#00000000" }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { scene: stage.hud }),
    gestures: {
      onTap: (_actor: Actor, hudCoords: { x: number; y: number }) => {
        if (!lastTapActor) return false;
        let pixels = stage.hud.camera.metersToScreen(hudCoords);
        let meters = stage.world.camera.screenToMeters(pixels);
        // "teleport" the actor:
        lastTapActor.data.poke(meters);
        // don't interact again without re-activating
        lastTapActor = undefined;
        return true;
      },
    },
  });

  // By default, JetLag offers a tap to the HUD first and the world second.
  // We want tapping an actor in the world (to activate it) to take priority
  // over the HUD's tap-handling button sitting underneath it, so we flip
  // that order here.
  stage.gestures.gestureHudFirst = false;

  // ANCHOR: one_shot_path
  // An actor that moves along a path toward wherever it's poked.
  const path_actor: Actor<PokeData> = new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "purple_ball.png" }),
    rigidBody: new CircleBody({ cx: 14, cy: 2, radius: 0.5 }, { kinematic: true }),
    gestures: {
      onTap: () => {
        lastTapActor = path_actor;
        return true;
      },
    },
    data: new PokeData((meters: { x: number; y: number }) => {
      let r = new Path().to(path_actor.rigidBody.getCenter().x, path_actor.rigidBody.getCenter().y).to(meters.x, meters.y);
      // Clear any velocity left over from a previous poke before starting
      // the new path, so old motion doesn't blend into the new one.
      path_actor.rigidBody.body.SetLinearVelocity({ x: 0, y: 0 });
      path_actor.rigidBody.body.SetAngularVelocity(0);
      path_actor.movement = new PathMovement({ path: r, velocity: 5, loop: false });
    }),
  });
  // ANCHOR_END: one_shot_path

  // An actor that moves in a direction, but never stops -- it doesn't
  // matter where the poke lands, only what direction it implies.
  const walk_actor: Actor<PokeData> = new Actor({
    appearance: new ImageSprite({ width: 1, height: 1, img: "purple_ball.png" }),
    rigidBody: new CircleBody({ cx: 14, cy: 3, radius: 0.5 }, { kinematic: true }),
    gestures: {
      onTap: () => {
        lastTapActor = walk_actor;
        return true;
      },
    },
    data: new PokeData((meters: { x: number; y: number }) => {
      let speed = 2;
      // This might be a nice time to brush up on your trigonometry :)
      let dx = meters.x - walk_actor.rigidBody.getCenter().x;
      let dy = meters.y - walk_actor.rigidBody.getCenter().y;
      let hy = Math.sqrt(dx * dx + dy * dy) / speed;
      let v = new b2Vec2(dx / hy, dy / hy);
      walk_actor.rigidBody.body.SetAngularVelocity(0);
      walk_actor.rigidBody.body.SetLinearVelocity(v);
    }),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
