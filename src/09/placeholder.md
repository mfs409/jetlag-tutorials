# Chapter 9: Game State, Menus & Scene Flow

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll wrap a collection of tiny games, called Micro Mania, in a real shell. The big idea is scene flow: how a game moves from a splash screen to a menu to a game to a results screen, and how it remembers what happened along the way.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/micro_mania_game.html"></iframe>

The code that makes it:

- [micro_mania_game.ts (the game)](./games/micro_mania_game.ts)
- [micro_mania_screens.ts](./games/micro_mania_screens.ts)
- [common.ts](./common/common.ts)
- [micro_mania_flow.ts](./games/micro_mania_flow.ts)
- [helpers.ts](./games/helpers.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [blue_ball.png](./games/assets/blue_ball.png)
- [green_ball.png](./games/assets/green_ball.png)
- [lose_sound.ogg](./games/assets/lose_sound.ogg)
- [pirate.json](./games/assets/pirate.json)
- [pirate.png](./games/assets/pirate.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
- [tune.ogg](./games/assets/tune.ogg)
- [tune2.ogg](./games/assets/tune2.ogg)
- [win_sound.ogg](./games/assets/win_sound.ogg)
