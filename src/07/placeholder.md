# Chapter 7: Timers, Spawners & Time-Based Logic

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll defend yourself against slimes that keep multiplying. Time is the third thing that makes events happen (after input and collisions), and the big idea is that a timer can run once or forever, can start other timers, and can be cancelled.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/slime_time_game.html"></iframe>

The code that makes it:

- [slime_time_game.ts (the game)](./games/slime_time_game.ts)
- [common.ts](./common/common.ts)
- [helpers.ts](./games/helpers.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
