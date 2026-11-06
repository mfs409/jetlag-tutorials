# Milestone 4: Dawn and the Jar

The game is starting to be fun, but there's a problem: we have no way of losing or winning.
Both are important.
If there's no way to lose, then there are no stakes.
If there's no way to win, then there's no point.

## Losing The Game

The game will have a timer that runs out after 45 seconds.
At the end of those 45 seconds, we'll end the game.

Let's start by just getting the lose-and-restart behavior to work.
We will do it in three steps.
First, we'll put the number `45` into a place where we can easily adjust it to lengthen or shorten the game:

```typescript
{{#include ./games/firefly_jar_04_01.ts:dawn_const}}
```

In JetLag, whenever a builder is called, a stopwatch starts running.
We can use it to figure out how much time is left.
Of course, this is going to be a useful bit of code, so we'll put it in a function, so it's easier to re-use:

```typescript
{{#include ./games/firefly_jar_04_01.ts:time_left}}
```

With both of those pieces in place, all that remains is to tell JetLag what condition causes the game to be lost.
We can do that by adding a "lose condition", which is a simple function that returns `true` when the time expires, and `false` otherwise:

```typescript
{{#include ./games/firefly_jar_04_01.ts:lose_condition}}
```

## Giving Feedback And Restarting

When time ran out, the game did not exactly end nicely.
Making it nice is going to require us writing some code that is a bit confusing.
That code will be easier to understand after you've finished a few more chapters.
That code is also something you'll want to use over and over again.

With that being the case, let's not actually write that code right now.
Instead, create a folder called `src/common`.
It should not be *inside* of your `firefly_jar` folder, but instead, it should be a sibling.
That is, you want a folder called `src/common` and another called `src/firefly_jar`.
Once you've got that folder, you can copy [my `common.ts`](./common/common.ts) and save it as `src/common/common.ts`.

Inside of `common.ts`, there is a function called `endScreen`, which we can use to give nice feedback when a game ends (either winning or losing).
It needs three colors: a color for the background, a color for the title text, and a color for the other text.
The easiest thing to do is put these all in one place, so we can easily adjust them and fine-tune them:

```typescript
{{#include ./games/firefly_jar_04_01.ts:end_style}}
```

Back in the previous section, we made use of JetLag's automatic score counters, and said that every time a firefly was caught, we'd increment a counter called `"fireflies"`.
Let's write a quick function for reading the value of that counter:

```typescript
{{#include ./games/firefly_jar_04_01.ts:score}}
```

With that in place, we can write code that nicely ends the game when time runs out.
We do this by providing a function that makes a "lose scene".
The "lose scene" is an overlay that sits on top of your game.
JetLag understands that these overlays can be used for a welcome screen, a pause screen, or for winning/losing.
In this case, we'll say "the way to make a lose scene is by calling `endScreen`".

`endScreen` needs a title, a description, and a message to guide the player about restarting the level.
It also needs to know *how* to restart the level.
`stage.switchTo(builder)` says "restart the game", because `builder` is the name of the function that made our game.
If we had several builders, for different levels of the game, then we could use the name of a specific builder to switch to a specific level.
With that in place, we can tell JetLag how to display an overlay when the game is lost, and how to restart the game.

```typescript
{{#include ./games/firefly_jar_04_01.ts:lose_scene}}
```

You might find that VSCode does not recognize `endScreen`.
If it doesn't, be sure to right click and add an import.
The import should look like this:

```typescript
import { endScreen } from "../common/common";
```

The file has a few other helpers in it, too.
We'll explore them in later chapters.

## Changing The Background Color

Telling someone why they lost is nice, but it's probably not enough.
We should give them visual cues that time is running out.
Later, we'll put a timer right on the screen.
But if we also make the background change over time, it will look like the sun is rising.
That will help the player to know that they're close to losing, and need to hurry up.

To make this work, we'll start by defining two colors, for night and dawn:

```typescript
{{#include ./games/firefly_jar_04_02.ts:sky_consts}}
```

Next, let's make a function that finds a blend between these two colors.
The code below is longer than it needs to be.
In fact, `common.ts` has a different version of it, which is much more brief.
However, it's useful to see this version, because it is very explicit.
It chops the colors into three parts, turns each part into a number, and uses the percentage of night that remains to blend the red, green, and blue parts of the color:

```typescript
{{#include ./games/firefly_jar_04_02.ts:mix_color}}
```

Since we have that function, we can set up a timer that runs four times per second and adjusts the background color accordingly:

```typescript
{{#include ./games/firefly_jar_04_02.ts:sky}}
```

## Winning

Our next step is to make it possible to win the game.
We'll do this by having a jar that the player needs to reach.
We might want to adjust the jar location, so let's put it in a `const` variable, so it's easy to find and adjust.

```typescript
{{#include ./games/firefly_jar_04_03.ts:jar_consts}}
```

Since the jar is an actor, it needs a `rigidBody` and an `appearance`.
Like before, we'll have an array with a shape and some text that reminds us that it's the jar.
We also need a behavior.
In this case, we'll use the `GoalBehavior`, which takes an `onArrival` function.
The function we'll provide says "when a `PlayerBehavior` collides with this, return true, indicating that the `PlayerBehavior` actor should disappear.  Also add one to an `arrivals` score counter."

```typescript
{{#include ./games/firefly_jar_04_03.ts:jar}}
```

With that in place, we can tell JetLag to win the game when the `arrivals` counter is greater than zero:

```typescript
{{#include ./games/firefly_jar_04_03.ts:win_condition}}
```

And we can set up an overlay to show when the player wins.
It uses the same `endScreen` function as the losing overlay.
It also just restarts the game.

```typescript
{{#include ./games/firefly_jar_04_03.ts:win_scene}}
```

One thing to notice: this code is a bit simpler than for the `loseSceneBuilder`.
We're using the `...` operator (the "spread" operator) to automatically turn the `END_STYLE` into the parts that we provided explicitly for losing.

## Making Victory A Challenge

You probably noticed a small error in the game: you can win without collecting any fireflies!
To fix that we'll start by setting up a variable that says how many fireflies need to be caught.
Just like all the other important numbers in the game, we put this in a variable so it's easy to find and easy to adjust:

```typescript
{{#include ./games/firefly_jar_04_04.ts:goal_const}}
```

Next, let's adjust the jar.
In its `onArrival` function, if we return `false`, the `PlayerControl` actor won't disappear.
That's exactly what we need!
If the firefly count isn't high enough, then we return false, and don't increment `arrivals`.
If the count is high enough, we increment `arrivals` and return true, which is enough to win the game:

```typescript
{{#include ./games/firefly_jar_04_04.ts:jar}}
```

## End State

You've now got a game that can be won and lost.
Here's my [Firefly Jar Milestone 4](./games/firefly_jar_04.ts) code, for you to compare against.

If you want to play my version of the game, you can find it here:

<iframe src="./games/firefly_jar_04.html"></iframe>
