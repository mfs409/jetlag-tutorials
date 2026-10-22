# Hole 4: Rubber Room

The fourth hole is a room where some walls give the ball a boost, and others stop it dead.
The red rubber walls send it back faster than it came in, and the sandbags soak up every bit of its energy.

## Elasticity

Elasticity is how much of a collision's energy turns into bounce, as a fraction.
Near 0, a collision just stops, and the energy goes nowhere.
Near 1, the body rebounds at close to the speed it hit with.
Box2D doesn't stop you from going above 1, and with an elasticity above 1, a body comes out of a collision moving *faster* than it went in.
That looks like a bug in the physics the first time you see it.
It's really just the engine faithfully using the number you gave it, even a silly one.

The walls on this course come in three kinds, and they only differ in their elasticity:

```typescript
{{#include ../../tssrc/02/helpers.ts:walls}}
```

Wood is a little bouncy, rubber is bouncier than a perfect bounce, and sandbags don't bounce at all.
The `wall`, `polygonWall`, and `post` helpers all pass the kind's elasticity along as one of the body's options.
That's how the same three helpers can build every wall on the course.

There's one more thing to know.
When two bodies collide, Box2D has to pick a single elasticity for the collision, and it takes the *larger* of the two.
The ball's elasticity is 0, which you can see in its options on the starter page.
That means the walls alone decide how bouncy a hit is.
If the ball had some bounce of its own, then a sandbag could never be dead.

## Changing Physics Later

Elasticity isn't locked in when you make a body, and neither are density and friction.
You can change any of them later, on any body, with `setPhysics`.
It takes the same options, so `myWall.rigidBody.setPhysics({ elasticity: 1.15 })` would make a wall bouncy.
It's handy for effects like "this platform turns slippery once the timer runs out."

## Building the Hole

Here's the hole:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole4}}
```

A wood wall splits the room in two, so the ball has to find a way around it.
Rubber lines the top and the right side of the room, so a shot that hits those walls comes back with plenty of energy.
There's a sandbag in the top-left corner, and a sandbag post on the left side, and either one stops the ball dead.
A rubber post in the right half sends the ball off at a sharp angle.
A rubber strip along the bottom, below the cup, bounces a ball back up toward it.

The starter code's TODO lists all the pieces.
When you've built it, try changing the rubber's elasticity in the `WALLS` table.
What happens at `3`?
What happens at `0.5`?

## Milestone 4

Here's where things should stand:

<iframe src="./crazy_golf_milestone4.html"></iframe>

The code is [here](crazy_golf_milestone4.ts).
