import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, initializeAndLaunch, JetLagGameConfig, SessionValue, stage, TextSprite } from "jetlag2d";

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * Scatter some obstacles and goodies using `stage.random`. Since we always
 * `reseed` right before generating, calling this twice with the same seed
 * produces the exact same layout -- that's the whole point of a seedable
 * generator over plain `Math.random()`.
 */
function generateLayout(seed: number) {
  stage.random.reseed(seed);

  for (let i = 0; i < 10; i++) {
    const cx = stage.random.nextRange(2, 15) + stage.random.next();
    const cy = stage.random.nextRange(1, 8) + stage.random.next();
    const isGoodie = stage.random.nextBoolean(0.4);
    if (isGoodie) {
      new Actor({
        appearance: new FilledCircle({ radius: 0.3, fillColor: "#ffd700" }),
        rigidBody: new CircleBody({ cx, cy, radius: 0.3 }),
      });
    } else {
      const size = 0.5 + stage.random.next();
      new Actor({
        appearance: new FilledBox({ width: size, height: size, fillColor: "#607d8b" }),
        rigidBody: new BoxBody({ cx, cy, width: size, height: size }),
      });
    }
  }
}

/** The seed of the current layout.  It's kept in session storage, so it survives a `switchTo`. */
const SEED = new SessionValue<number>("seed", () => 1);

/**
 * Build the levels of the game. There's only one level here -- the layout
 * is entirely controlled by a "seed" we stash in session storage (which
 * survives a `switchTo`), so the buttons below can rebuild the same level
 * with a different -- or the same -- seed.
 */
function builder() {
  DebugToggle.enable();

  stage.backgroundColor = "#b3cde0";

  const seed = SEED.get();
  generateLayout(seed);

  new Actor({
    appearance: new TextSprite({ center: false, face: "Arimo Regular", size: 24, color: "#000000" }, `Seed: ${seed}`),
    rigidBody: new BoxBody({ cx: 0.1, cy: 0.1, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });

  /** A HUD button that rebuilds the level with a new seed */
  function seedButton(cx: number, label: string, newSeed: number) {
    new Actor({
      appearance: [
        new FilledBox({ width: 2.6, height: 0.8, fillColor: "#444444" }),
        new TextSprite({ center: true, face: "Arimo Regular", size: 18, color: "#FFFFFF" }, label),
      ],
      rigidBody: new BoxBody({ cx, cy: 8.5, width: 2.6, height: 0.8 }, { scene: stage.hud }),
      gestures: {
        onTap: () => {
          SEED.set(newSeed);
          stage.switchTo(builder);
          return true;
        },
      },
    });
  }

  seedButton(2.5, "Seed: 1", 1);
  seedButton(5.5, "Seed: 2", 2);
  seedButton(8.5, "Same Seed", seed);
  seedButton(12, "Random Seed", Math.floor(Date.now() % 100000));
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);
