# Hole 8: Rafts

The last hole is also a side view, and this time, there's a curtain of rafts hanging in the air, between the ball and the cup.
They aren't standing on anything, and they don't fall.
You can push them out of the way, or you can lob the ball over the top.

## Floating

The rafts are dynamic bodies, so the ball can push them around.
But they ignore gravity, and that takes one call:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:rafts}}
```

`setGravityDefy()` tells a body to ignore gravity, without changing anything else about it.
The raft is still dynamic, and it still gets pushed by whatever hits it.
It just doesn't fall.
That makes it a good tool for anything that floats, like a balloon or a platform in the sky.

## No Tipping

The other option in that excerpt is `disableRotation: true`.
It stops a body from ever rotating, no matter what hits it, or where.
Without it, a raft that got hit near one end would spin around, and probably tumble.
With it, the raft slides away, standing up straight, which is what you'd expect from a raft.

This option matters most for the heroes of platformer games.
A box-shaped hero that so much as nicks the corner of a platform would otherwise tip and spin as it falls, which is rarely the feel you want.

The raft is also light, with a density of `0.3`, so the ball can shove it, and it has a little damping, so it drifts to a stop after you hit it.

```admonish note title="Another Gotcha: Goals Start With Collisions Disabled"
A destination, like the cup, is an actor with a `GoalBehavior`, and it starts with `collisionsEnabled` set to `false`.
That's because a destination is normally something a hero touches, and not something that gets shoved around.
If you ever make a destination *dynamic*, so that gravity pulls on it, you have to set `collisionsEnabled` to `true` afterward, or it will fall right through the floor.
```

## Building the Hole

Here's the hole:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole8}}
```

There's a grass floor, three rafts in a stack, and the cup.
The rafts hang right down to the floor, so a ball can't just roll underneath.
You can hit them hard enough to shove the bottom one out of the way, or lob the ball up and over the top.
Either way works, so try both, and see which feels better.

## The Finished Game

That's every hole.
Here's the whole course:

<iframe src="./crazy_golf_game.html"></iframe>

The code for the finished game is [here](crazy_golf_game.ts).
Play it from the beginning, and watch how each hole uses a different idea about rigid bodies.
