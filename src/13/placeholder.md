# Drawing Levels From SVG Files

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll play the back nine of Crazy Golf, whose walls curve. The big idea is to draw a level in a vector-graphics program, save it as an SVG file, and let JetLag turn every line of the drawing into a wall.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/back_nine_game.html"></iframe>

The code that makes it:

- [back_nine_game.ts (the game)](./games/back_nine_game.ts)
- [helpers.ts](./games/helpers.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [back_nine_candy.json](./games/assets/back_nine_candy.json)
- [back_nine_candy.png](./games/assets/back_nine_candy.png)
- [back_nine_classic.json](./games/assets/back_nine_classic.json)
- [back_nine_classic.png](./games/assets/back_nine_classic.png)
- [back_nine_h1_green.svg](./games/assets/back_nine_h1_green.svg)
- [back_nine_h2_shell.svg](./games/assets/back_nine_h2_shell.svg)
- [back_nine_h2_spiral.svg](./games/assets/back_nine_h2_spiral.svg)
- [back_nine_h3_canyon.svg](./games/assets/back_nine_h3_canyon.svg)
- [green_ball.png](./games/assets/green_ball.png)
- [shape.svg](./games/assets/shape.svg)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
