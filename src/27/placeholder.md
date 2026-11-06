# Procedural Generation

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll let the computer make the levels. The big idea isn't a new feature of JetLag, but a technique: start with noise, smooth it out, keep the part you can reach, and check that every level can be won.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Games

**endless stair game**

<iframe src="./games/endless_stair_game.html"></iframe>

The code that makes it:

- [endless_stair_game.ts (the game)](./games/endless_stair_game.ts)
- [floor_generator.ts](./games/floor_generator.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)

**procedural generation game**

<iframe src="./games/procedural_generation_game.html"></iframe>

The code that makes it:

- [procedural_generation_game.ts (the game)](./games/procedural_generation_game.ts)
