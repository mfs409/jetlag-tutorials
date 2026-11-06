# Chapter 8: Data-Driven Design: Declarative Crafting, Dialogue & Level Maps

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll climb the Alchemist's Tower, brewing potions and talking to the people inside. The big idea is that a level's layout, a crafting recipe, and a conversation are all just data, and one small, reusable piece of code can read all of them.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

<iframe src="./games/alchemists_tower_game.html"></iframe>

The code that makes it:

- [alchemists_tower_game.ts (the game)](./games/alchemists_tower_game.ts)
- [common.ts](./common/common.ts)
- [helpers.ts](./games/helpers.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [pirate.json](./games/assets/pirate.json)
- [pirate.png](./games/assets/pirate.png)
