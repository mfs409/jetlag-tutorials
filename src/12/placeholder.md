# Chapter 12: Game Feel: Animation, Particles & Filters

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll sneak through Lights Out, with a flashlight and a ghost. Nothing here changes the rules of the game. The big idea is game feel: animation, particles, camera shake, and filters, and how much a game improves when it reacts to everything the player does.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/lights_out_game.html"></iframe>

The code that makes it:

- [lights_out_game.ts (the game)](./games/lights_out_game.ts)
- [common.ts](./common/common.ts)
- [helpers.ts](./games/helpers.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [alien.json](./games/assets/alien.json)
- [alien.png](./games/assets/alien.png)
- [back.png](./games/assets/back.png)
- [blue_ball.png](./games/assets/blue_ball.png)
- [carrot.png](./games/assets/carrot.png)
- [green_ball.png](./games/assets/green_ball.png)
- [grey_ball.png](./games/assets/grey_ball.png)
- [inv_alien.json](./games/assets/inv_alien.json)
- [inv_alien.png](./games/assets/inv_alien.png)
- [mid.png](./games/assets/mid.png)
- [mustard_ball.png](./games/assets/mustard_ball.png)
- [noise.png](./games/assets/noise.png)
- [radial.png](./games/assets/radial.png)
- [scarf.png](./games/assets/scarf.png)
- [snow_ball.png](./games/assets/snow_ball.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
