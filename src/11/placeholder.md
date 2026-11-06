# Chapter 11: Endless Games, Actor Pools & Persistence

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll fly through Cave Flyer, a game that could go on forever. The big idea is that an endless game can't make everything at once, so it recycles a small pool of actors, builds the world just ahead of you, and saves what you've earned between runs.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/cave_flyer_game.html"></iframe>

The code that makes it:

- [cave_flyer_game.ts (the game)](./games/cave_flyer_game.ts)
- [common.ts](./common/common.ts)
- [helpers.ts](./games/helpers.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [Roboto-Black.ttf](./games/assets/Roboto-Black.ttf)
- [alien.json](./games/assets/alien.json)
- [alien.png](./games/assets/alien.png)
- [back.png](./games/assets/back.png)
- [blue_ball.png](./games/assets/blue_ball.png)
- [green_ball.png](./games/assets/green_ball.png)
- [grey_ball.png](./games/assets/grey_ball.png)
- [mid.png](./games/assets/mid.png)
- [red_ball.png](./games/assets/red_ball.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
