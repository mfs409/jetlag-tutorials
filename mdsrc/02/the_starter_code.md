# The Starter Code

Here's the game you'll start from:

<iframe src="./crazy_golf_starter.html"></iframe>

In this code, putting already is set up.
There are also walls around the edge of the course, and the screens that show how a hole went.
But every hole is empty, so there's no goal and no way to win.

The starter code is [here](crazy_golf_starter.ts), and it comes with a second file, [helpers.ts](helpers.ts).
Run `npm run create`, and when it asks for a name, enter `crazy_golf`.
Then replace everything in `src/crazy_golf/crazy_golf.ts` with the starter code.
Next, make a new file called `helpers.ts` in the same folder, and copy the code from [helpers.ts](helpers.ts) into it.
(In VSCode, right-click the `crazy_golf` folder, choose "New File...", and name it `helpers.ts`.)

`helpers.ts` holds the parts of the game that you won't write.
These include putting, scoring, the end-of-hole screens, the walls around the course, and the cup.
You haven't learned the JetLag features you need for those parts of the game yet.
We'll cover them in later chapters (though, of course, if you're interested you could read that code now).
You'll also need the `common.ts` file that you put in `src/common` in Chapter 1, so make sure that's still there.
The game also uses the [Arimo-Regular.ttf](../assets/Arimo-Regular.ttf) font, so make sure you put it (and its [license file](../assets/Arimo-OFL.txt)) in your `assets` folder.

Read through `crazy_golf.ts` before you change anything.
Every empty hole has a TODO comment that says what it needs.
While you work, you can press `N` to skip to the next hole, so you don't have to play through the earlier ones to test yours.
Pressing `R` starts the current hole over.
Refreshing the page will start back at the first hole.

## How the Course Is Organized

Each hole is its own builder.
The names are `hole1` through `hole8`.
They work like the `builder` in Chapter 1, except that there are eight of them, and the game moves from one to the next.
Here's the start of the first one.
The TODO is the work that remains:

```typescript
{{#include ../../tssrc/02/crazy_golf_starter.ts:starter_hole1}}
```

Every hole starts with a call to `startHole`.
It sets up everything that the holes have in common: the rails around the edge of the course, the ball, aiming and putting, the HUD, and the end-of-hole screens.
It needs to know the hole's name, its par, where the tee is, and which builders come next.
The two builders at the end are the name of the hole's *own* builder, so that pressing R can start it over, and the name of the builder for the next hole.

Switching builders is done via `switchTo`, which wipes the slate clean, so every hole starts fresh, with nothing left over from the one before.
An unfortunate side effect is that the game has no scorecard, because there's nowhere to keep one.
We'll come back to that later.

The first shared piece is the rails around the edge of the course, which are made with a helper function called `wall` (in `helpers.ts`).
A wall is a box, with a `SolidBehavior` so that other actors can't pass through it:

```typescript
{{#include ../../tssrc/02/helpers.ts:wall}}
```

There's a bit of math hiding in this code.
The `rigidBody` needs the center of the body, and we have its left, right, top, and bottom positions.
Let's look at how to compute `cx`:
The width is $r-l$, so the center is $l + (r-l)/2$.
That simplifies to $(l+r)/2$.
The logic is the same for `cy`.

## The Ball

Next, we need a ball, and the mark that shows where it starts:

```typescript
{{#include ../../tssrc/02/helpers.ts:ball}}
```

Most of the options in that second argument to `CircleBody` are what this chapter is about.
Each one gets its own hole, and there's no need to understand them yet.
The one to notice right now is `dynamic: true`, which says that the ball moves, and gets pushed around by whatever it hits.

The ball has a `PlayerControlBehavior`, as the hero did in Chapter 1, but this time the player won't control it directly.
Instead, the player aims and charges a shot, and the game gives the ball a velocity all at once:

```typescript
{{#include ../../tssrc/02/helpers.ts:putt}}
```

The ball's speed is the power bar, times `MAX_POWER`, in the direction of the aim.
Each putt also adds one to a `"strokes"` counter.
The HUD and the end-of-hole screens read it.
After that, it's up to the physics engine.
Everything the ball does next, including how it bounces, slows, and rolls, is decided by the bodies it touches and how they're configured.

The game only lets you putt when the ball has stopped.
JetLag tracks `state.current.moving` for every actor.
It is false when an actor's speed drops to almost nothing.
The game also asks JetLag to announce when the ball stops, so that it can end the hole if that was the last stroke you were allowed.

While you charge a shot, the aim line gets longer, and it fades from white toward red as the power goes up.
That color change comes from `mixColor`, which you saw in [Chapter 1](../01/part_3_dress_it_up.md).
It does the same job here, blending white into red, but it's written differently.
If you're curious, see if you can figure out why this version, which is shorter, does the same thing as the other version.

## The Cup

Every hole has a cup, made by this function:

```typescript
{{#include ../../tssrc/02/helpers.ts:cup}}
```

The cup uses a `GoalBehavior`, like the jar in Chapter 1, and it gives `onArrival` a function.
This function checks the ball's speed, and rejects a ball that's moving faster than `CUP_MAX_SPEED`.
A ball that's going too fast lips out and rolls on, so speed matters, and you can't just blast a shot straight through the cup.
`collisionsEnabled: false` lets the ball roll over the cup instead of bumping into it.

## The Rest

The heads-up display and the win and lose screens work the way they did in Chapter 1.
You get a limited number of strokes per hole (`par + 3`).
When the hole ends, the game shows how you did, and clicking the end screen moves on.
Running out of strokes loses the hole.
Pressing R, or clicking through the end screen, calls `stage.switchTo`, so the next hole always starts fresh.
