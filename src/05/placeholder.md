# Chapter 5: Collisions, Sensors & Contact Events

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll steer two robots through a puzzle, and you'll learn that "two things touched" is only the start of a collision. The big idea is that you decide what touches what: with pass-through IDs, one-sided walls, sensors that don't push back, and code that runs when contact begins or ends.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/duet_game.html"></iframe>

The code that makes it:

- [duet_game.ts (the game)](./games/duet_game.ts)
- [helpers.ts](./games/helpers.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [green_ball.png](./games/assets/green_ball.png)
- [mustard_ball.png](./games/assets/mustard_ball.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
