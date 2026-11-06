# Chapter 2: Rigid Body Physics & Motion Properties

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll play Crazy Golf, a mini golf game, and find out how its walls, windmills, crates, and ice all come from one idea: every actor has a rigid body, and the kind of rigid body you pick decides how it moves. The big ideas are static, kinematic, and dynamic bodies, and how density, bounciness, friction, and damping change the way things roll.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/crazy_golf_game.html"></iframe>

The code that makes it:

- [crazy_golf_game.ts (the game)](./games/crazy_golf_game.ts)
- [helpers.ts](./games/helpers.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
