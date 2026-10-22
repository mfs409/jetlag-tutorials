# Part 1: Move and Control

The first job is to turn the starter's gray garden into a place you can actually walk around.
That takes three things: a hero, a way to move the hero, and hedges and trees that get in the hero's way.

## What's Already There

Start by looking at how the starter draws the hedges and trees:

```typescript
{{#include ../../tssrc/01/firefly_jar_starter.ts:scenery}}
```

`HEDGES` and `TREES`, at the top of `builder()`, are just lists of numbers.
Each hedge is a rectangle, described by its left, top, right, and bottom edges.
Each tree is a circle, described by its center and its radius.
The two loops walk through those lists and make one actor for each entry.

Every actor needs two things, an `appearance` and a `rigidBody`.
The `appearance` describes what the actor looks like.
It know or care where it is, whether it can move, or whether anything can bump into it.
The `rigidBody` answers "where is this, and what shape does the physics engine use to detect contact?"
A `BoxBody` doesn't know or care what color it is, or whether it's even visible.

These are kept separate on purpose.
It's what lets you build an invisible wall (a `rigidBody` with a fully transparent appearance), or a purely decorative picture (an appearance on a `rigidBody` that nothing collides with).
Notice that each hedge's width and height appear in *both* the appearance and the rigid body.
That isn't a typo, and the engine doesn't quietly merge them for you.
Sometimes, you'll need to make an actor's visible size and its physical size different.

The numbers themselves are in meters, not pixels.
By convention, the visible world is 16 meters wide and 9 meters tall, with (0, 0) in the top left corner.
So a hedge whose top is at 0 and whose bottom is at 3.2 starts at the top edge of the screen and reaches a little more than a third of the way down.

Colors like `"#6b7280"` are written in hex, with two characters each for red, green, and blue, from `00` to `ff`.
You can add an optional fourth pair for alpha (transparency), where `00` is fully transparent and `ff` is fully opaque.
You'll use that in Part 2, to make fireflies flicker.

## Seeing What the Physics Engine Sees

Press `b` while the starter is running.
JetLag draws an outline around every actor's rigid body, which (as you just read) doesn't have to match its appearance.
Press `b` again to turn the outlines off.
`DebugToggle.enable()` at the top of `builder()` sets up the `b`-key behavior.

Next look at the `Config` class at the top of the file, and notice `hitBoxes = true`.
While that's set, clicking anywhere in the running game prints the world coordinates you clicked to the browser's developer console (press `F-12`).
Together, these two lines enable you to answer most "why is this in the wrong place?" questions in a few seconds.

## Making the Garden Solid

Right now, the hedges and trees are just scenery.
None of them has a `behaviors` component, so each one gets a `PassiveBehavior`, which is what a purely decorative actor (background art, a HUD label) should have.
Passive actors don't take part in collisions at all.
If the hero existed, it would walk right through them.

The fix is one line per loop: `behaviors: new SolidBehavior()`.
`SolidBehavior` is the ordinary kind of physical actor.
Once an actor has it, other solid actors simply can't pass through it.
You won't write a single line of code that checks "is the hero touching the hedge?"
The physics engine handles that automatically.

If you've written games without a physics engine, your instinct might be to check whether rectangle A overlaps rectangle B, and if so, push A back out.
That's tedious code, and it's easy to get wrong.
The whole point of building on Box2D is that you get correct, efficient collisions (including circles and angled shapes, not just boxes) for free.
That leaves your effort for deciding *what happens* when things collide, which is what Part 2 is about.

## Labels: Your First Array

Here's a problem with an all-gray garden: it's hard to tell what anything is.
That doesn't matter much for hedges and trees, but by Part 2 there will be fireflies, golden fireflies, and a jar, and they'll all be gray.
So before going any further, let's put a label on every actor.

An actor's `appearance` doesn't have to be one thing.
It can be an array of things, and JetLag draws them one on top of the next, in order.
A gray box with a `TextSprite` on top of it is about the simplest array there is:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone1.ts:solid_labeled}}
```

A `TextSprite` is an appearance, just like a `FilledBox`.
It just draws text instead of a shape.
Because it comes second in the array, it's drawn on top.
Swap the two, and the box would cover up the label.
The loop for the trees works the same way, with a `FilledCircle` and the word "tree."

## The Hero

The hero is one more actor, but with a different behavior:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone1.ts:hero}}
```

The hero *looks* like a box, but its rigid body is a *circle*.
I'm doing that on purpose.
A round body tends to slide more smoothly along the edge of a hedge, and it's less likely to snag on a corner.
(In Part 3, the hero's appearance becomes a circle too, and the mismatch goes away.)

`behaviors: new PlayerControlBehavior()` doesn't move or animate anything by itself.
It makes the hero take part in collisions.
Other parts of the engine check "does this actor have a `PlayerControlBehavior`?" to decide things like "is this actor allowed to collect that firefly?" or "should reaching the jar end the game?"
You'll see this pattern again and again: a behavior that mostly exists so that *other* behaviors can check for it.

The hero's body also has `{ dynamic: true }`.
It tells JetLag that this body moves and reacts to collisions.

## Moving the Hero With the Keyboard

`PlayerControlBehavior` marks *who* the player controls, but it doesn't say *how*.
In this game, we'll set the hero's velocity directly via keyboard handlers:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone1.ts:keys}}
```

There are two things to notice about this code.

First, while an *up* handler runs the instant a key is released, a *down* handler runs once the key is pressed, and then *keeps running* over and over again until the key is released.
That's just like what happens when you're using a text editor and hold a key down.
Fortunately, in this game, that behavior is not going to cause any trouble.
But if we were *adding* velocity, instead of *setting* it, we could have trouble.

Second, if you hold a left/right key and an up/down key at the same time, the speed is not 5, but $5\times \sqrt{2}$, because 5 in the x dimension and 5 in the y dimension is more than 5 in the diagonal direction.
We aren't going to fix this yet.
We'll just mark it with a TODO, and come back to it later.

## Milestone 1

Here's where things should stand at the end of Part 1:

<iframe src="./firefly_jar_milestone1.html"></iframe>

The code is [here](firefly_jar_milestone1.ts).
Before you look at it, finish your own version, and then play it.
Walk into some hedges and trees.
Try to squeeze through the narrow gaps.s heds hed
Hold two arrow keys at once, then let go of one of them.
If anything surprises you, press `b` so you can see the hit boxes.

You might notice some issues that aren't even fixed in the final game.
Make note of them, just like the note about diagonal velocity.
Play-testing is an important skill, and so is bug tracking.

After you've played for about 10 seconds, you probably ran out of things to do.
That's because this isn't really a game yet.
We'll address that in Part 2.
