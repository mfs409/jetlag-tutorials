import { Actor, AnimatedSprite, AnimationSequence, AnimationState, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, GoalBehavior, ImageSprite, JetLagGameConfig, KeyCodes, PlayerControlBehavior, Scene, SolidBehavior, TextSprite, TouchPlateBehavior, initializeAndLaunch, stage } from "jetlag2d";
import { currentLevel, switchToLevel } from "../common/common";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["pirate.json"],
  };
}

/**
 * A legend maps a single character from a level's text map to a function
 * that builds whatever belongs at that cell.  This is the whole trick of
 * "declarative" level design: `parseLevel` doesn't know what "#" or "G"
 * mean.  All it knows how to do is walk a grid of text and hand each
 * character's (x,y) position to whatever the legend says to do with it.
 */
type Legend = Map<string, (cx: number, cy: number) => void>;

/**
 * Walk a text map (an array of equal-length strings) and, for every
 * character that appears in `legend`, call its builder function with the
 * (x,y) coordinates of that cell.  Characters with no legend entry (e.g. a
 * blank space, meaning "empty floor") are silently skipped.
 */
function parseLevel(rows: string[], legend: Legend, cellSize = 1) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const builder = legend.get(rows[r][c]);
      if (builder)
        builder(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
    }
  }
}

// Two rooms, each a 16x9 grid of text (one character per cell, matching the
// game's 16x9 aspect ratio).  Everything about a room -- its walls, its
// goodies, its exits, even where the hero starts -- is just data here.  `>`
// and `<` are doorways that carry the hero to the other room.
const ROOM_1 = [
  "################",
  "#@             #",
  "#   G          #",
  "#              #",
  "#     ####     #",
  "#              #",
  "#          G   #",
  "#             >#",
  "################",
];

const ROOM_2 = [
  "################",
  "#<             #",
  "#        @     #",
  "#              #",
  "#      D       #",
  "#              #",
  "#              #",
  "#              #",
  "################",
];

/**
 * Build the animations and diagonal-direction remap for a pirate
 * AnimatedSprite.
 */
function buildPirateAnimations() {
  let animations = new Map();
  animations.set(
    AnimationState.WALK_N,
    new AnimationSequence(true)
      .to("pirate_walk_u_0.png", 75)
      .to("pirate_walk_u_1.png", 75)
      .to("pirate_walk_u_2.png", 75)
      .to("pirate_walk_u_3.png", 75)
      .to("pirate_walk_u_4.png", 75)
      .to("pirate_walk_u_5.png", 75)
      .to("pirate_walk_u_6.png", 75)
      .to("pirate_walk_u_7.png", 75)
      .to("pirate_walk_u_8.png", 75),
  );
  animations.set(
    AnimationState.WALK_W,
    new AnimationSequence(true)
      .to("pirate_walk_l_0.png", 75)
      .to("pirate_walk_l_1.png", 75)
      .to("pirate_walk_l_2.png", 75)
      .to("pirate_walk_l_3.png", 75)
      .to("pirate_walk_l_4.png", 75)
      .to("pirate_walk_l_5.png", 75)
      .to("pirate_walk_l_6.png", 75)
      .to("pirate_walk_l_7.png", 75)
      .to("pirate_walk_l_8.png", 75),
  );
  animations.set(
    AnimationState.WALK_S,
    new AnimationSequence(true)
      .to("pirate_walk_d_0.png", 75)
      .to("pirate_walk_d_1.png", 75)
      .to("pirate_walk_d_2.png", 75)
      .to("pirate_walk_d_3.png", 75)
      .to("pirate_walk_d_4.png", 75)
      .to("pirate_walk_d_5.png", 75)
      .to("pirate_walk_d_6.png", 75)
      .to("pirate_walk_d_7.png", 75)
      .to("pirate_walk_d_8.png", 75),
  );
  animations.set(
    AnimationState.WALK_E,
    new AnimationSequence(true)
      .to("pirate_walk_r_0.png", 75)
      .to("pirate_walk_r_1.png", 75)
      .to("pirate_walk_r_2.png", 75)
      .to("pirate_walk_r_3.png", 75)
      .to("pirate_walk_r_4.png", 75)
      .to("pirate_walk_r_5.png", 75)
      .to("pirate_walk_r_6.png", 75)
      .to("pirate_walk_r_7.png", 75)
      .to("pirate_walk_r_8.png", 75),
  );

  animations.set(
    AnimationState.IDLE_N,
    new AnimationSequence(true)
      .to("pirate_thrust_u_0.png", 750)
      .to("pirate_thrust_u_1.png", 75),
  );
  animations.set(
    AnimationState.IDLE_W,
    new AnimationSequence(true)
      .to("pirate_thrust_l_0.png", 750)
      .to("pirate_thrust_l_1.png", 75),
  );
  animations.set(
    AnimationState.IDLE_S,
    new AnimationSequence(true)
      .to("pirate_thrust_d_0.png", 750)
      .to("pirate_thrust_d_1.png", 75),
  );
  animations.set(
    AnimationState.IDLE_E,
    new AnimationSequence(true)
      .to("pirate_thrust_r_0.png", 750)
      .to("pirate_thrust_r_1.png", 75),
  );

  let remap = new Map();
  remap.set(AnimationState.WALK_NW, AnimationState.WALK_W);
  remap.set(AnimationState.WALK_SW, AnimationState.WALK_W);
  remap.set(AnimationState.WALK_NE, AnimationState.WALK_E);
  remap.set(AnimationState.WALK_SE, AnimationState.WALK_E);

  remap.set(AnimationState.IDLE_NW, AnimationState.IDLE_W);
  remap.set(AnimationState.IDLE_SW, AnimationState.IDLE_W);
  remap.set(AnimationState.IDLE_NE, AnimationState.IDLE_E);
  remap.set(AnimationState.IDLE_SE, AnimationState.IDLE_E);

  return { animations, remap };
}

function makeHero(cx: number, cy: number) {
  let { animations, remap } = buildPirateAnimations();
  return new Actor({
    appearance: new AnimatedSprite({ width: 1, height: 1, animations, remap }),
    rigidBody: new CircleBody({ cx, cy, radius: 0.4 }, { density: 1, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
}

/**
 * Build the levels of the game.  `level` is just which room's text map to
 * parse -- 1 and 2 are the only two rooms in this demo, and stepping on a
 * door tile switches between them by re-running this same function with a
 * different room number.
 */
function builder() {
  DebugToggle.enable();

  const level = currentLevel();
  stage.backgroundColor = "#b3cde0";
  const rows = level === 1 ? ROOM_1 : ROOM_2;

  let hero: Actor | undefined;

  // The door to the next room is locked until every goodie in *this* room's
  // data has been collected -- another rule derived from the map itself
  // instead of being hardcoded.
  const totalGoodies = rows
    .join("")
    .split("")
    .filter((ch) => ch === "G").length;

  // The legend is the only part of this file that knows what a wall, a
  // goodie, a door, or the hero actually *is*.  `parseLevel` just calls
  // whichever of these functions matches each character in the map.
  const legend: Legend = new Map([
    [
      "#",
      (cx, cy) => {
        new Actor({
          appearance: new FilledBox({ width: 1, height: 1, fillColor: "#444444" }),
          rigidBody: new BoxBody({ cx, cy, width: 1, height: 1 }),
          behaviors: new SolidBehavior(),
        });
      },
    ],
    [
      "G",
      (cx, cy) => {
        new Actor({
          appearance: new FilledCircle({ radius: 0.3, fillColor: "#ffd700" }),
          rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
          behaviors: new CollectableBehavior({ onCollect: "goodies" }),
        });
      },
    ],
    [
      "D",
      (cx, cy) => {
        new Actor({
          appearance: new FilledBox({ width: 0.8, height: 0.8, fillColor: "#2e7d32" }),
          rigidBody: new BoxBody({ cx, cy, width: 0.8, height: 0.8 }),
          behaviors: new GoalBehavior({ onArrival: "destinationArrivals" }),
        });
      },
    ],
    [
      // The exit door only *acts* like a door once every goodie is
      // collected -- until then, tripping its trigger does nothing at all.
      ">",
      (cx, cy) => {
        new Actor({
          appearance: new FilledBox({ width: 1, height: 1, fillColor: "#5b3a29" }),
          rigidBody: new BoxBody({ cx, cy, width: 1, height: 1 }),
          behaviors: new TouchPlateBehavior({
            onEnter: () => {
              if (stage.score.counters.get("goodies") >= totalGoodies)
                switchToLevel(builder, 2);
            },
          }),
        });
      },
    ],
    [
      "<",
      (cx, cy) => {
        new Actor({
          appearance: new FilledBox({ width: 1, height: 1, fillColor: "#5b3a29" }),
          rigidBody: new BoxBody({ cx, cy, width: 1, height: 1 }),
          behaviors: new TouchPlateBehavior({
            onEnter: () => switchToLevel(builder, 1),
          }),
        });
      },
    ],
    [
      "@",
      (cx, cy) => {
        hero = makeHero(cx, cy);
      },
    ],
  ]);

  parseLevel(rows, legend);

  // The level's text says where the hero starts, so a level with no `@` can't be played
  if (!hero) throw new Error("This level has no `@` for the hero to start on");
  const player = hero;
  stage.world.camera.setCameraFocus(player);

  stage.keyboard.setKeyUpHandler(
    [KeyCodes.KEY_UP, KeyCodes.KEY_DOWN],
    () => (player.rigidBody.yVelocity = 0),
  );
  stage.keyboard.setKeyUpHandler(
    [KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT],
    () => (player.rigidBody.xVelocity = 0),
  );

  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_UP,
    () => (player.rigidBody.yVelocity = -3),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_DOWN,
    () => (player.rigidBody.yVelocity = 3),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_LEFT,
    () => (player.rigidBody.xVelocity = -3),
  );
  stage.keyboard.setKeyDownHandler(
    KeyCodes.KEY_RIGHT,
    () => (player.rigidBody.xVelocity = 3),
  );

  // The number of Destinations needed to win is just however many "D"
  // characters happen to be in this room's map -- another thing that falls
  // out of the data instead of being hardcoded.
  const destinationCount = rows
    .join("")
    .split("")
    .filter((ch) => ch === "D").length;
  if (destinationCount > 0) {
    stage.score.addWinCondition(
      () => stage.score.counters.get("destinationArrivals") >= destinationCount,
    );
    stage.score.onWin = builder;
    stage.score.winSceneBuilder = (
      overlay: Scene,
      screenshot: ImageSprite,
    ) => {
      new Actor({
        appearance: screenshot,
        rigidBody: new BoxBody(
          { cx: 8, cy: 4.5, width: 16, height: 9 },
          { scene: overlay },
        ),
        gestures: {
          onTap: () => {
            stage.clearOverlay();
            stage.switchTo(stage.score.onWin);
            return true;
          },
        },
      });
      new Actor({
        appearance: new TextSprite(
          { center: true, face: "Arimo Regular", size: 44, color: "#FFFFFF" },
          "You Win!",
        ),
        rigidBody: new CircleBody(
          { cx: 8, cy: 4.5, radius: 0.1 },
          { scene: overlay },
        ),
      });
    };
  }

  // A small HUD, just to show which room we're in and how many goodies
  // we've picked up along the way
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 24, color: "#000000" },
      `Room ${level}`,
    ),
    rigidBody: new BoxBody(
      { cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 },
      { scene: stage.hud },
    ),
  });
  new Actor({
    appearance: new TextSprite(
      { center: false, face: "Arimo Regular", size: 24, color: "#000000" },
      () => `Goodies: ${stage.score.counters.get("goodies")}/${totalGoodies}`,
    ),
    rigidBody: new BoxBody(
      { cx: 0.1, cy: 0.5, width: 0.1, height: 0.1 },
      { scene: stage.hud },
    ),
  });
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
