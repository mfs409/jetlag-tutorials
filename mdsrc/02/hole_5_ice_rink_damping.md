# Hole 5: Ice Rink

The fifth hole is a sheet of ice, with three patches of carpet.
On the ice, the ball hardly slows down at all, and a hard shot can go on for a very long time.
On the carpet, it stops almost immediately.
This means you have to think about where the ball will end up, and not just where it goes first.

## Damping

The setting that makes this work is **damping**.
It slows a body's motion down gradually, instead of letting it continue, or stopping it instantly.
`setDamping` slows a body's movement, and `setAngularDamping` slows its spin.

Compare damping to elasticity, which only matters *during* a collision.
Damping is always acting, whether anything is touching the body or not.
That's why it's a good stand-in for something that a top-down game doesn't have.

You may be wondering why I'm not using friction, which is the thing that slows a real ball on real grass.
Friction is drag between two surfaces that are pressed together.
On this course, nothing is pressing the ball against the grass, because the world has no gravity pulling it down.
Friction would have nothing to work with.

The ball already has some damping, which is what makes it slow down on the grass:

```typescript
{{#include ../../tssrc/02/helpers.ts:ball}}
```

Look for `setDamping(GRASS_DAMPING)` near the bottom, and `setAngularDamping(2)` right after it.
The ice needs less damping than the grass, and the carpet needs much more.

## Changing Damping as the Ball Rolls

Damping is a setting on the body, so the ball can't have two values at the same time.
Instead, the carpets use a `TouchPlateBehavior` to change the ball's damping when it touches them, and change it back when it leaves:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:carpets}}
```

The two kinds of drag are constants, `ICE_DAMPING` and `CARPET_DAMPING`, so that nobody has to remember what `0.12` and `4` mean.
The ball starts out on the ice, so it gets `ICE_DAMPING` right away.
Each carpet is a rectangle, described as an object with `l`, `t`, `r`, and `b` fields for its left, top, right, and bottom edges, in a list, just like the hedges in Chapter 1.
The loop makes a box for each one, and it's drawn behind the ball, because `z` is `-1`.

The carpets have a `TouchPlateBehavior`.
It's for an actor that doesn't collide with anything, but runs some code when a player-controlled actor enters it, and some more code when that actor leaves it.
The ball counts, because it has a `PlayerControlBehavior`.
So the ball rolls right over a carpet.
The `onEnter` code runs at the moment the ball rolls onto the carpet, and gives it `CARPET_DAMPING`.
The `onLeave` code runs at the moment the ball rolls off, and gives it `ICE_DAMPING` again.
(JetLag also hands both pieces of code the carpet and the actor that entered or left it, but we don't need them here, since the ball is the only thing that can trigger a carpet.)

That's all it takes: when the ball enters a carpet, it gets carpet drag, and when it leaves, it goes back to ice drag.

## Building the Hole

The rest of the hole is a couple of posts, and a pocket of sandbags around the cup, so that a fast ball stops there instead of bouncing away.
The starter code's TODO has all the coordinates.
It also gives the hole a pale blue background, which is a nice touch, and costs one line.

Once it works, play with the numbers.
What happens if `ICE_DAMPING` is `1`?
What if `CARPET_DAMPING` is `20`?

## Milestone 5

Here's the game after you've finished making this hole:

<iframe src="./crazy_golf_milestone5.html"></iframe>

The code is [here](crazy_golf_milestone5.ts).
