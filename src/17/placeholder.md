# A Grid-Based Puzzle: Discrete Movement

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll push crates around Crate Cove, one square at a time. The big idea is discrete movement: instead of letting physics move things smoothly, the game moves by turns on a grid, which makes puzzles, guards, and an undo button possible.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/crate_cove_game.html"></iframe>

The code that makes it:

- [crate_cove_game.ts (the game)](./games/crate_cove_game.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [blue_ball.png](./games/assets/blue_ball.png)
- [mustard_ball.png](./games/assets/mustard_ball.png)
- [pirate.json](./games/assets/pirate.json)
- [pirate.png](./games/assets/pirate.png)
- [red_ball.png](./games/assets/red_ball.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
