# Server-Backed Persistence: Pirate's Ledger

<img src="../professor_parse_idle.png" alt="Professor Parse" width="72" style="image-rendering: pixelated; float: left; margin: -36px 1em 1em 0;">

In this chapter, you'll keep score in Pirate's Ledger, a game that remembers you even on a new device. The big idea is server-backed persistence: an account, saved progress, and a leaderboard, and a game that keeps working even when the server isn't there.

I'm still writing this chapter, step by step.  In the meantime, you can play the finished game, and read the code and the assets that make it, so that you can run it and change it yourself.

## Play the Game

*This game talks to a server, which isn't part of this web page, so you'll need to run the server yourself to play.*

<iframe src="./games/ledger_game.html"></iframe>

The code that makes it:

- [ledger_game.ts (the game)](./games/ledger_game.ts)
- [common.ts](./common/common.ts)

The assets, which go in an `assets` folder next to the game:

- [Arimo-OFL.txt](./games/assets/Arimo-OFL.txt)
- [Arimo-Regular.ttf](./games/assets/Arimo-Regular.ttf)
- [mustard_ball.png](./games/assets/mustard_ball.png)
- [pirate.json](./games/assets/pirate.json)
- [pirate.png](./games/assets/pirate.png)
- [sprites.json](./games/assets/sprites.json)
- [sprites.png](./games/assets/sprites.png)
