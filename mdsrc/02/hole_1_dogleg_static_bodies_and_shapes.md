# Hole 1: Dogleg

The first hole uses the simplest kind of rigid body: one that never moves.
It's a long wall, a post, and an angled bumper in the corner, and you play it by banking the ball off the bumper toward the cup.

## Static Bodies

Every rigid body has a **type**, which determines who, if anyone, is allowed to push it around.
There are three types.
**Static** bodies never move, no matter what.
Gravity doesn't pull on them, and no collision ever budges them.
Box2D treats a static body as if it were infinitely heavy.
The other two types, **kinematic** and **dynamic**, are for the next two holes.

Static is the default.
If you don't say otherwise, a body is static, which is why the `wall` helper you saw on the last page doesn't have to say anything about it.

## Shapes

Separately from its type, every rigid body has a **shape**.
A `BoxBody` needs a width and a height.
A `CircleBody` needs a radius.
The third shape is the interesting one: a `PolygonBody`, which takes a list of vertices.

There's one rule for polygons: they must be **convex**.
If you pick any two points inside a convex shape, the straight line between them stays inside the shape.
Box2D needs this, because its collision math depends on it.
If you want something concave, like an L or a star, you build it out of several convex pieces.

A polygon's vertices are given relative to the body's own center, not relative to the world.
That's a little confusing at first, but it's useful, because the description of a shape doesn't change when you move the actor.
To make things a little easier, there's this helper, which takes corners in world coordinates, and converts to center-relative coordinates:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:polygon_wall}}
```

It finds the center by averaging the corners, and then subtracts that center from each one.
The appearance gets the same vertices as the body.
Everything else looks like the `wall` helper, including the `SolidBehavior`.
Also, note that the center doesn't have to be in the middle of the shape: that's just what this code is doing.
When you start making actors who can move, and especially rotate, figuring out where to put the center is important.
The right answer depends on the behavior you want for your game.

The post is much simpler, since a circle only needs a center and a radius:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:post}}
```

You'll notice that both helpers take a `kind`, like `WALLS.wood`.
For now, it only determines the color.
On the fourth hole, it will become more interesting.

## Building the Hole

Here's the hole, with all three static shapes:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole1}}
```

The long wall means you can't just hit the ball straight at the cup.
The way around is to roll the ball along the bottom edge of the course, into the triangular bumper in the corner.
Its slanted side turns the ball, so that it heads straight up the right-hand side, toward the cup.
It's a bank shot, and the angle of that slanted side is the whole hole.

Your starter code has a TODO in this hole, with the coordinates.
Write `polygonWall` and `post`, and then fill in the hole.
When you play it, press `b` to see the hit boxes, and check that they match what's on the screen.

## Milestone 1

Here's where things should stand:

<iframe src="./crazy_golf_milestone1.html"></iframe>

The code is [here](crazy_golf_milestone1.ts).
Play the first hole, and see how few strokes you need.
Then try changing the bumper's corners, and notice how the bank shot changes.
