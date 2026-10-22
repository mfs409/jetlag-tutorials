# Hole 6: Mushroom Garden

The sixth hole has a wall with a slit in it that's a little too narrow for the ball.
Fortunately, there's a blue mushroom by the tee that shrinks the ball, and if you're small enough, you can squeeze through.
On the other side, the cup is tucked into an alcove, and a heavy crate is plugging its doorway.
A small ball can't budge it, but a red mushroom will grow the ball to a size that can.

## Changing Size

Density, elasticity, and damping all describe how a body responds to forces.
Resizing is different.
It's a direct edit to a body's size, made whenever your code decides to make it.

You can resize any actor while the game is running, by calling `actor.resize(scale)`.
The `scale` multiplies the actor's *current* size, so `1.2` grows it by 20%, and `1/1.2` shrinks it back.
It changes both halves of the actor at once.
The rigid body's shape changes, so its hit box really is bigger or smaller, and so does its appearance, so the picture still matches.
That pairing matters.
If only the picture changed, what the player sees wouldn't match what the physics engine collides against.
That kind of mismatch is behind a lot of "why did that hit count, the sprite wasn't even touching it?" bugs.

## Touch Plates

What makes the ball change size is a mushroom, which needs to do something when the ball rolls onto it.
We'll use a `TouchPlateBehavior`.
Here's the helper that makes a mushroom:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:mushroom}}
```

The body is a circle, and the appearance is a stack of three circles, which makes a cap with two white spots.
The interesting part is `onEnter`.
It doesn't just call `ball.resize(scale)`.
Since `resize` multiplies the size the ball has *now*, doing that would compound.
A player who rolled across the same mushroom over and over would grow the ball by another factor of `2.4` every time, and it would get out of hand in a hurry.
Instead, the mushroom asks the ball how big it is right now, by looking at the radius of its rigid body.
Then it works out the factor that gets the ball to exactly `scale` times its normal radius, which is `scale * BALL_RADIUS / ball.rigidBody.radius`.
If the ball is already that size, the factor is 1, and nothing changes.

## Size and Mass

There's a second reason the red mushroom matters.
Density is mass per unit of area, and when a ball grows to `2.4` times its width, its area grows by about `5.8` times, since area goes with the square of the width.
The ball's density hasn't changed, so its mass goes up by the same factor.
A big ball is a lot heavier than a small one, and that's how it can push a crate that a small ball can't.

Try both.
Take the ball to the crate without visiting the red mushroom, and see what happens.
Then go back and do it right.

## Building the Hole

The hole is a slit, two funnels that guide a small ball toward it, two mushrooms, and an alcove with a crate in the doorway.
The crate is made with the same `crate` helper as before, but with a density of `3`, so it's very hard to move.
The starter code's TODO has the numbers.

## Milestone 6

Here's where things should stand:

<iframe src="./crazy_golf_milestone6.html"></iframe>

The code is [here](crazy_golf_milestone6.ts).
