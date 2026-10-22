# Hole 7: Downhill

The seventh hole is a side view.
The ball starts on a shelf high up on the left, and it has to roll down a ramp, across the floor, and into a cup near the right wall.
It picks up a lot of speed on the way down, and there's a stretch of grippy carpet near the end that slows it enough to drop in.

## Gravity

Back in Chapter 1, you saw that gravity is a setting on the world.
Every hole so far has had a gravity of `(0, 0)`, so it's looked like a view from above, with nothing falling.
This hole is different, so there's a small helper that changes the world:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:side_view}}
```

The gravity is `(0, 10)`, which means everything is pulled toward the bottom of the screen.
The helper also paints the background sky blue, and gives the ball much less damping than it had on the grass, so that it doesn't feel like it's moving through syrup.

Gravity only pulls on **dynamic** bodies.
The shelf, and the ramp, and the floor are static, so they stay exactly where they are, even though everything is being pulled down.
Kinematic bodies aren't pulled on, either.

## Friction

Gravity presses bodies against whatever is under them, and that gives us another setting to think about: **friction**.
Friction is drag between two surfaces that are touching.
It's the one property in this chapter that's really about a *pair* of surfaces, not a single body.

Box2D combines the friction of both bodies to decide how much drag there is, and the result is zero if either one is zero.
That's why the ball has some friction of its own, in the options you saw on the starter page.
A ball with friction that rolls on a floor with none feels no drag at all, and neither does a floor with lots of friction under a ball that has none.
So if something isn't slowing down the way you expect, check *both* sides of the contact.

The floor in this hole is made of strips, and the strips are what carry the friction:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:floor_strip}}
```

It works like the `WallKind` in the first hole: a `FloorKind` holds the colors and the friction of one surface, and `FLOORS` has one entry for each.
Ice has a friction of `0`, so the ball slides across it without spinning, and keeps going.
Carpet has a friction of `1`, so the ball grips it, and starts to roll.
Getting a ball to roll costs it some of its speed, and the ball's angular damping keeps working against that spin, so the carpet slows the ball down.
Having the carpet is important: otherwise nothing slows the ball, and it will pass right over the cup.

## Building the Hole

Here's the hole:

```typescript
{{#include ../../tssrc/02/crazy_golf_game.ts:hole7}}
```

The shelf and the ramp are static, and the ramp is a polygon, the way the bumper was in the first hole.
Then comes the floor: ice, then carpet, then ice.
The backstop is a sandbag, which means it has no bounce, so a ball that comes off the floor too fast stops against it instead of bouncing back.

Write your `sideView` and `floorStrip` helpers, and then fill in the hole.
Aim right, and go easy on the power.
The ramp does most of the work.

## Milestone 7

Here's the fully working seventh hole:

<iframe src="./crazy_golf_milestone7.html"></iframe>

The code is [here](crazy_golf_milestone7.ts).
