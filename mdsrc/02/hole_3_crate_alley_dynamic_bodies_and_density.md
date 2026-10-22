# Hole 3: Crate Alley

There are crates in the way on the third hole.
Some of them fly when the ball hits them.
Others barely budge, and might as well be walls.
Part of the puzzle is figuring out which is which, and the rest is getting the ball past them.

## Dynamic Bodies

The crates are the third type of rigid body: **dynamic**.
Dynamic bodies are the way that most things work in real life.
They move, and they respond to forces (gravity, and the forces from collisions) like a real object would.
If something bumps into a dynamic body, it moves, and it can push other dynamic bodies, too.

You've been using a dynamic body since the first hole.
It's the ball, and its options had `dynamic: true`.
Here's the helper that makes a crate, which uses the same option:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:crate}}
```

A crate is a box with a `SolidBehavior`, just like a wall.
The differences are all in the options: `dynamic: true`, a `density`, and a little `elasticity`.
There's also some damping, which slows a crate down after you hit it.
That's because a top-down course has no friction to stop things, so a crate would slide until it hit a wall.
You'll see damping properly in the fifth hole.

## A Gotcha: Say What You Mean

If you forgot `dynamic: true`, you'd get a crate that's static, and it would sit there like a wall, no matter how hard you hit it.
It would look like a bug in the physics, but it's really a body that's the wrong type.
If you ever build something that won't move no matter what, or something that moves right through everything, check its type before you check anything else.

Sometimes, JetLag will fix this for you.
Some components only make sense on a dynamic body, like `TiltMovement`, or the `PlayerControlBehavior` on the ball.
If you attach one to a body that isn't dynamic, JetLag switches the body to dynamic and writes a warning to the browser's console.
The message says "You have attached a PlayerControlBehavior to an actor whose body is not dynamic.  Switching to dynamic."
That's a nice safety net, but it's better to say what you mean, so the ball says `dynamic: true` itself, and the console stays quiet.

## Dynamic Bodies Can Be Pushed Too Far

A kinematic body never gives way, and that has a cost.
If a kinematic body pushes a dynamic body into a wall, something has to give, and nothing will.
At some point, the math for where everything needs to be stops working, and the bodies seem to pass through each other.
Physics simulations aren't perfect, and it's worth paying attention to little details like this, so that you can find a workaround when you need one.

## Density

The other option that matters for the crates is `density`.
It means mass per unit of area, and Box2D works out a body's mass as $density \times area$.
Two bodies with the same density aren't the same weight if one is bigger.
In this hole, there are two kinds of crate that are nearly the same size, but the light ones have a density of `0.15` and the heavy ones have a density of `1.5`.
The ball's density is `3`.

Density affects how difficult it is to get a body moving, or to get it to stop.
It also decides how momentum moves in a collision: a heavy body running into a light one shoves the light one much farther than the other way around.
So the ball sends a light crate flying, but a heavy crate hardly moves.
The crates are different colors, so you can tell which is which without hitting them.

## Building the Hole

Here's the hole:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole3}}
```

A long wall splits the course in half, and the cup is on the far side of it, so the ball has to go the long way around.
Along the way, crates block both halves of the course.
You can bulldoze right through the light crates, but the heavy ones act more like walls, so you have to aim for the gaps between them.

Write your `crate` helper, and then fill in the hole.
While you're at it, try changing the densities, and see how the hole feels.
What happens if every crate is light?
What if they're all heavy?

## Milestone 3

Here's how your code should look once the third hole is complete:

<iframe src="./crazy_golf_milestone3.html"></iframe>

The code is [here](crazy_golf_milestone3.ts).
