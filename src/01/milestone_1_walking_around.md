# Milestone 1: Walking Around

The first step in making your own version of Firefly Jar is to make the folder where your code will go.
In your terminal, navigate to your `my-jetlag-tutorials` folder.
Then type `npm run create firefly_jar`.
Once it completes, type `npm run serve firefly_jar` to serve the current game, and point a browser at `http://localhost:7000/firefly_jar/firefly_jar.html` to see your game.

Of course, right now it's just the default game.
Keep the server running, and keep the browser open.
As you make changes to `firefly_jar.ts`, you'll see the game automatically re-build, and the browser will auto-refresh.

## A Blank Slate

Now open your `my-jetlag-tutorials` folder in VSCode.
Open the `src/firefly_jar/firefly_jar.ts` file.
This is where you'll do all of your work.

As a first step, replace the entire contents of the file with this:

```typescript
{{#include ./games/firefly_jar_01_00.ts}}
```

If you read the last "Getting Started" chapter, this code should be familiar.
It says your game has a 16x9 aspect ratio (the default for landscape games).
The game has nothing in it, but the `b` button will show and hide hit boxes.

When you save, your browser should auto-refresh, and show a blank game.

## Setting The Background Color

Now let's go ahead and add one line inside of the builder, right after the call to `DebugToggle.enable`.
This line will set the initial background color for the game.
Remember that the color is an HTML color code (a "hex code").

```typescript
{{#include ./games/firefly_jar_01_01.ts:background}}
```

You might find that when you typed `stage` and pressed the `.` key, VSCode updated your imports (the top line) to include the `stage` variable.
If it didn't, and there is now an error under the word `stage`, then right-click it and choose the option that updates your imports.
Without doing this, your code won't work.

## Adding A Hero

Next, add these lines to draw a hero.
The hero's physics shape is a circle, as is its appearance.
Be sure to save, run the game, and press `b` to see the hit boxes.
You'll notice that the hit box for a circle has a radial line, to help you see rotation.

```typescript
{{#include ./games/firefly_jar_01_01.ts:hero}}
```

Again, if you see errors related to the words `Actor`, `FilledCircle`, or `CircleBody`, be sure to update your imports.
This is an issue that comes up a lot, so it's good to get in the habit of dealing with it now.

## Make The Hero Move

Now let's try to make the hero move.
You'll recall from "Getting Started" that we can do this with keyboard handlers.
Let's start small: Press the `right` key to start moving rightward at 5 meters per second, and release to stop:

```typescript
{{#include ./games/firefly_jar_01_02.ts:keys}}
```

When you run this code, **nothing happens**.
Can you think of why?
The issue is that we did not change the hero's body type.
The default body type is `static`, which means it cannot move.
We could make it `kinematic` or `dynamic`.
`Dynamic` is better here, because it can notify us when the hero collides with other actors.
Here's how to change the hero to make it `dynamic`:

```typescript
{{#include ./games/firefly_jar_01_03.ts:hero}}
```

With that code in place, your hero should be able to walk to the right.
Now go ahead and replace those two lines with these 9 lines.
They set up a constant for the speed, so it's easy to tune the hero speed from just one place.
They also set up all four arrow keys:

```typescript
{{#include ./games/firefly_jar_01_04.ts:keys}}
```

(Again, if you have import errors related to `KeyCodes`, be sure to fix them before testing your code!)

## Fixing The Hero's Diagonal Movement

It's never too early to look for gameplay bugs.
This code has one.
If you only press right or left, the hero moves at 5 meters per second along the X axis.
If you only press up or down, the hero moves at speed 5 along the Y axis.
But if you press up and left at the same time, the hero moves at speed 5 on the X axis and also at speed 5 on the Y axis, for a total of just over 7 meters per second diagonally.
That's not good.
We can fix it by replacing those 9 lines with something slightly fancier, which uses the Pythagorean Theorem to figure out the right values of X and Y so that the diagonal is 5, and then uses an in-line function called `updateVelocity` to actually set the hero's speed:

```typescript
{{#include ./games/firefly_jar_01_05.ts:keys}}
```

Be sure to read the comments for that code.
In particular, the code needed to make sure not to accidentally divide by zero!

## End State

Congratulations, you've completed the first milestone.
If you want to compare your code to mine, here's my [Firefly Jar Milestone 1](./games/firefly_jar_01.ts) code.

Your game should play the same as mine.
You can test it here:

<iframe src="./games/firefly_jar_01.html"></iframe>
