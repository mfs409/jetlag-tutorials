# Teams And Custom Collision Behaviors

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll command a pirate crew in Cove Brawl, where there are more than two sides. The big idea is teams: every actor belongs to one, a table says who hurts whom, and custom collision code lets armor, bribes, and friendly fire all follow from data.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/cove_brawl_game.html"></iframe>

The code that makes it:

- [cove_brawl_game.ts (the game)](./games/cove_brawl_game.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [pirate.json](./games/assets/pirate.json)
- [pirate.png](./games/assets/pirate.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
