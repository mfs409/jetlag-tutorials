# Milestone 5: The HUD

Our game is moving along nicely, but it would benefit from a bit of polish.
When you're playing, you can't tell how many fireflies are showing, or how much time is left.
First-time players might be confused about what to do.

We'll address all of that by leveraging the heads-up display (the HUD).
It's a full Box2D+Pixi.js world with actors.
It sits on top of the world that holds your game, but it's a different world, so your hero can't accidentally collide with it.
Also, it doesn't move when the camera moves, so later on, when you make games with bigger worlds, things on the HUD stay the same, even when the camera moves.

## Provide Some Instructions

We put actors onto the HUD by adding a property to the `rigidBody` line that says `scene: stage.hud`.
That's it.
To try it out, let's make a bit of text that tells the player how to play the game.
As always, we'll use an easy-to-find constant to say how long the help message should show:

```typescript
{{#include ./games/firefly_jar_05_03.ts:help_const}}
```

Then we can make a help message on the HUD, with a timer that removes it after a little while:

```typescript
{{#include ./games/firefly_jar_05_03.ts:hud_help}}
```

## The Firefly Count

Next, we'll put a count on the HUD to show how many fireflies remain.
This box has text that changes, so instead of providing a string, we provide a function that explains how to generate the text that gets displayed:

```typescript
{{#include ./games/firefly_jar_05_01.ts:hud_count}}
```

Be sure to press `b` to toggle the hit boxes.
You might be surprised by what you see.
This text box is anchored to a small `rigidBody` at its top-left corner.
In contrast, the help box is anchored at its center.
When text changes, it's especially important to think about the anchor.

## The Remaining Time

Finally, let's add the remaining time.
The code for this is pretty straightforward:

```typescript
{{#include ./games/firefly_jar_05_02.ts:hud_dawn}}
```

There are two interesting things to point out.  First, the stopwatch moves in fractions of a second, so we use `Math.ceil` to round up.
That ensures we don't have surprisingly long decimals, and also guarantees that we don't show `0` until there is no time left.

It's useful to look at the timer as it changes, though, because in this case, the length of the message depends on the remaining time.
If we centered the text, instead of using the top-left anchor, then all the words would shift when less than 10 second remained.

## End State

This was a pretty quick chapter, but the small flourishes we added make a big difference for gameplay.
Here's my [Firefly Jar Milestone 5](./games/firefly_jar_05.ts) code, for your reference.

Here's a playable version of the game:

<iframe src="./games/firefly_jar_05.html"></iframe>
