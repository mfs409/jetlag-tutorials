# Hole 2: The Windmill

The second hole has a windmill.
Its blades spin at the same speed forever, no matter how hard the ball hits them.
There's also a gate that slides up and down.
You can't push either one around, and you can't slow them down.
You have to time your shots.

## Kinematic Bodies

The windmill and gate use the second type of rigid body: **kinematic**.
A kinematic body can move, but only because *you* told it to, by giving it a path or a spin or a velocity.
Nothing that hits it can change how it moves.
It can shove other things out of its way, but nothing can shove it.
Gravity doesn't pull on it, either.
It just follows its instructions forever, no matter what it runs into.

This is different from being static.
A kinematic body might be moving fast, and a dynamic body might be sitting perfectly still.
The type describes how a body is allowed to respond to the world.

You make a kinematic body by adding the option `{ kinematic: true }`.
Here's the windmill:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:windmill}}
```

The windmill is two blades, and each is a box that's 5 meters long.
Both are kinematic, and both have a `rotationSpeed`, which is measured in rotations per second.
So `0.16` means a blade goes all the way around in about six seconds.
Since nothing can push a kinematic body, that speed never changes.

To make a cross, one of the blades needs to be turned a quarter of the way around before it starts spinning.
That's what `blade.rigidBody.rotation = angle` does.
It takes the angle in radians, so a quarter turn is `Math.PI / 2`.
Radians are the way that the math libraries want angles.
Remember that 180 degrees is the same as $\pi$ radians, so a full circle is $2\pi$.

## Turning Off Collisions

The last actor in that excerpt is the hub, the little round cap in the middle of the windmill.
It's only there for looks, and if the ball could hit it, it would be a strange, tiny obstacle.
So the hub's body has `collisionsEnabled: false`.

Turning off collisions is a switch on the rigid body.
It's separate from the actor's behavior.
The hub has no behaviors at all, which would already mean it doesn't collide, because that's what a `PassiveBehavior` does.
But you can also turn off collisions on any actor, even one with a `SolidBehavior`, and it will pass through everything.
You'll use this option a lot, for anything that's decoration, like the tee mark and the cup.

## The Gate

The gate is also kinematic, but instead of spinning, it slides.
For that, it uses a different JetLag feature:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:gate}}
```

A `PathMovement` gives an actor a list of points to travel between, at a speed you choose.
Here, the path goes down and back up, and `loop: true` makes it repeat forever.
There's a whole chapter on this kind of movement later in the book.

## A Surprise About Collisions

If you look closely at the windmill, you'll see that the tips of its blades sweep into the walls beside it, and nothing happens.
That's not a bug.
Box2D only works out a collision when at least one of the two bodies is dynamic, because only a dynamic body can respond to a force.
Two static bodies that overlap do nothing.
Two kinematic bodies that meet pass right through one another.
The same is true of a kinematic body and a static one.
It looks like a mistake the first time you see it, but it's the engine working as designed.

It's also why the blades matter to the ball at all: the ball is dynamic, so it collides with them, even though they ignore each other.

## Building the Hole

Here's the whole hole:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole2}}
```

The two walls make a narrow passage, so the ball has to get past the windmill.
Then it has to time its way past the gate to the cup.
Fill in your starter code's TODO, and watch the blades to learn their rhythm.

## Milestone 2

Here's the finished version of the game, now with two holes:

<iframe src="./crazy_golf_milestone2.html"></iframe>

The code is [here](crazy_golf_milestone2.ts).
Remember that you can press `N` to skip ahead to the next hole.
Try changing the windmill's `rotationSpeed`, or the gate's `velocity`.
How fast can you make them before the hole stops being fun?
