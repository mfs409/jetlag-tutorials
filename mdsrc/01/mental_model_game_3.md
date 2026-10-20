# Mental Model Game 3

Use the arrow keys to move the blue ball.
Click the ball to make it jump.
Click the game first, so that your keys go to it instead of this page.

<iframe src="./side_view_game.html"></iframe>

## What Did You See?

This game looks **very different** from the last two.
Try to name, specifically, which direction gravity points, and what the camera is doing about it.

The hero was controlled by the left and right arrow keys, and clicking it gave it a brief upward impulse.
This is actually a cumbersome way to control the hero, which is intentional.
You'll notice that the camera's behavior, and having to click a moving actor, can make things awkward for the player.

This is the perspective you'd see in a platformer like Super Mario Bros, or an endless runner like Jetpack Joyride.
What has to be true about gravity and the camera to get that feel?

The game has a specific lose condition: time running out.
It's important to think about winning and losing in games, especially for the cases where the player can *miss* something important, and there's *no going back*.
In such situations, it's useful to have a timer (like in this game) or some other condition that ensures that *failing-to-win* results in *losing-and-starting-over*.

## How It's Built

[Here's the whole file](side_view_game.ts).
If you want to test it out, in addition to the code, you'll need to put the [Arimo-Regular.ttf](../assets/Arimo-Regular.ttf) font file in your assets.
You should also copy over the corresponding [license file](../assets/Arimo-OFL.txt).

There are a few new ideas to explore:

- The gravity is downward (positive Y) and tapping the hero makes it jump upward (negative Y).
  That's what gives this game its "side view" feel.
- The player has 10 seconds to reach the destination.
  Rather than write `10` in two places (the `LoseCondition` and the `TextSprite`), it's a `const`, so it only needs to be changed in one place.
  **This is a good programming practice**.
- JetLag provides a built-in stopwatch counter, `ScoreService.STOPWATCH`, that the code uses to track how much time is left.
- There is text on the screen.
  This is a big deal.
  It means the game has to load a font.
  It also means the game has to do something special to show the text.

Let's focus on this point about text for a moment.
Take a look at line 103:

```typescript
{{#include ../../tssrc/01/side_view_game.ts:103}}
```

That's the line that tells the `TextSprite` what to show.
It's not just `Math.max(0, loseDuration - stage.score.counters.get(ScoreService.STOPWATCH)).toFixed(0)`.
Why does it need a **function** that returns the number (indicated by the leading `()=>`), instead of just putting the number there?

If you remove the preceding `()=>`, you'll quickly see the problem.
If you provide a string to the `TextSprite` constructor, it will create text that shows the exact string you provided.
If you provide a function, then on every frame, JetLag will recompute the text to show.

This won't be the last time you see something like this.
Remember, the `builder` runs **before** the game is playable, and it sets up the initial state of the game.
For things that have to happen later (i.e., in response to events), you need to wrap those things in functions, so that JetLag can make them happen in the future.

If this concept is confusing, don't worry.
You'll see it many more times before you need to do it yourself, and by then it will make sense.

There's another thing to start thinking about: What happens when someone plays the game *the wrong way*.
For example, what happens if you tap the blue ball while it's in the air?
What should happen?
Getting in the habit of trying to break your game will help you to avoid having unexpected glitchy behaviors.

Before you move on to the last example, see if you can make any changes to improve the game.
One idea is to put a button on the HUD for giving the hero a jump impulse.
Another is to add obstacles that the hero must avoid.
If you try that, keep in mind that you might want to look back at how heroes have been defeated in previous games.
