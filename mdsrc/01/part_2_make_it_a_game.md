# Part 2: Make It a Game

So far, you have a garden you could walk around, and nothing else.
A game, as opposed to an interactive toy, needs at least three things: a goal to work toward, some feedback that you're making progress, and a moment where it's over.
In Firefly Jar, those are the fireflies, the HUD, and the jar and the dawn.
Everything in this part is still going to be a labeled gray shape.
Gray shapes are all you need to find out whether the game is fun, and they're much faster to change than art.

## A Firefly Is a Collectable

Let's start with a single firefly.
Leave aside, for now, the fact that fireflies come and go.
A firefly is something the hero can touch, and when the hero touches it, it disappears and the score goes up.
JetLag has a behavior for exactly that:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:firefly_actor}}
```

`CollectableBehavior` follows the same pattern `SolidBehavior` did in Part 1.
You aren't writing "if the hero overlaps this firefly, remove it and add one to a variable."
You're stating that you want to use one of JetLag's pre-made behaviors.
JetLag's contact-handling code does the rest.

`onCollect: counter` isn't calling a function.
`counter` is a string.
You'll need to provide a value, such as `"fireflies"`.
That will create a counter for JetLag to track in `stage.score.counters`.
It's a good idea to let JetLag handle score counters for you.
Any number of actors can all add to the *same* counter just by agreeing on its name.
In this game, every ordinary firefly bumps the `"fireflies"` counter, and every golden firefly bumps `"golden"`.

Notice, too, that the firefly's gray box is 0.55 meters across, but its rigid body is a circle with a radius of 0.3.
That's a little smaller than the box, so the hero has to really touch a firefly to catch it.

## Fireflies Come and Go

A firefly that stays put until you catch it isn't much of a challenge.
What makes Firefly Jar fun is that fireflies don't wait for you.
Each one blinks on, stays lit for a few seconds, flickers as a warning, and then blinks out whether you caught it or not.

That's two different kinds of timing.
First, something has to keep making new fireflies.
Second, each firefly has to keep track of its own age.
Both use `TimedEvent`, which runs some code after a delay.
Here's the first kind:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:spawners}}
```

`new TimedEvent(SPAWN_FREQ, true, ...)` runs its code every `SPAWN_FREQ` seconds.
The `true` means "repeat," so it doesn't stop after the first time.
Each run picks an open spot and makes a brand new firefly there.
So the code you give a timer can do anything normal code can do, including creating new actors in the middle of a game, long after the rest of `builder()` has finished.
Golden fireflies get their own, slower timer, and they only appear in a few hard-to-reach locations.

The `makeFirefly` function is where all the firefly code lives.
It's worth having a function here, because there are three places that make fireflies, and they don't differ by much.
`randomOpenSpot`, which came with the starter code, keeps picking random spots until it finds one that's clear.
It doesn't do any geometry to decide.
Instead, it asks the physics world, with `stage.world.physics.actorsAt`, whether any actor is within a firefly's width of that spot.
If the answer is "no", the spot is open, and if it's "yes", the function tries again.
Because it asks the world, it doesn't need to know where the hedges and trees are.
It will also avoid the jar, the hero, and any other firefly, and it will keep working if you add more obstacles.
(But note that if we had background actors, `actorsAt` would report them, so we would have to check the actors in the array, not just the array length.)

The second kind of timing is inside `makeFirefly`.
Every firefly gets its own little timer, which ticks ten times a second:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:ticker}}
```

Each tick adds 0.1 to `age`.
Once `age` reaches `lifetime`, the firefly calls `remove()` on itself, which takes it out of the game, and then the timer cancels itself, since it has nothing left to do.
If the hero already caught this firefly, it's already gone, and removing it a second time does no harm.

During the last `flickerTime` seconds, the ticker flickers the firefly by changing the color of its box.
Every so often, it adds `"30"` to the end of the color, which makes the box mostly see-through, and then it takes it away again.
`Math.floor(age * 5) % 2` is a little trick for "flip back and forth every 0.2 seconds."
For the last half second, it multiplies by 10 instead, so the flicker speeds up right before the firefly goes out.
Players pick up on that without ever being told what it means.

## Keeping Score

The HUD needs to show how many fireflies you've caught, and how long you have until dawn.
Both of those are going to be needed in a few places, so each is a small function:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:score}}
```

`caught()` counts golden fireflies as three.
`timeLeft()` needs to know how many seconds the night lasts, so it takes that number as a parameter.
It uses a built-in JetLag counter, named `ScoreService.STOPWATCH`, that you never have to create or update.
JetLag adds one to it every second, for as long as the game is running.
Its name is a constant, instead of a string like `"fireflies"`, because JetLag itself needs to know it.
If you mistype a constant, TypeScript tells you right away, but if you mistype a string, nothing does.
`Math.max(0, ...)` just keeps the answer from going below zero.

Here's the part of the HUD that shows the count:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:hud_count}}
```

You've already seen `TextSprite`: it's how the labels work.
The interesting part here is its second argument.
For a label, it was a string, like `"hedge"`.
Here, it's a **function** that *returns* a string.
That function runs on every frame, many times per second, which is why the text always matches the counter, even though you never wrote "when the counter changes, update the text."
In JetLag, you never refresh a HUD by hand.
You describe *how to compute* what it should say, and the engine keeps asking.

`{ scene: stage.hud }` is what makes this a HUD element instead of an object in the world.
It stays in a fixed spot on the screen, even if the camera moves, and its actor is in a different physics world, so it can't collide with the hero, the hedge, or fireflies.
The time left until dawn works the same way, and so does the reminder at the bottom of the screen that tells you what to do for the first few seconds.

## Winning and Losing

The last piece is the jar.
It's a destination, and JetLag has a behavior for that, too:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:jar}}
```

`GoalBehavior` has the same shape as the other behaviors you've seen.
You declare what kind of actor this is, and the engine's contact code answers the question "did the hero get here?"
Whenever the hero touches the jar, JetLag calls `onArrival`.

By default, a destination accepts (and removes) the hero the instant it's touched, no matter what else is true.
That would be a problem here.
The hero could reach the jar with only three fireflies, get removed, and make the game unwinnable, because there would be nobody left to catch the rest.
So `onArrival` checks first.
Returning `false` rejects the arrival, and nothing happens: the hero is free to go catch more fireflies and come back.
Returning `true` accepts it, and just before that, the jar adds one to a counter called `"arrivals"`.

Winning and losing are described the same way the HUD text was: as functions.
`addWinCondition` takes a function that returns true or false, and the engine checks it every tick for as long as the game runs.
The moment it returns true, you win.
`addLoseCondition` works exactly the same way, and here it's checking whether dawn has come.
Notice that neither condition is tied to any particular actor or event.
A win condition can check anything at all.

You'll see this idea everywhere from here on.
Instead of hunting for the one line of code where something "happens," you describe the *state* you're waiting for, and let the engine worry about exactly when it becomes true.

Finally, the game needs to know what to do when it's over:

```typescript
{{#include ../../tssrc/01/firefly_jar_milestone2.ts:end}}
```

`winSceneBuilder` and `loseSceneBuilder` put a message on the screen when the game ends, and wait for a click.
`endScreen` is a small helper that draws that message.
It's nothing you couldn't write yourself by the end of this book, but it isn't what this section is about, so we're borrowing it.
It lives in a file called `common.ts`, which you'll need to add to your project:

1. In VSCode, right-click the `src` folder, choose "New Folder...", and name the folder `common`.
2. Right-click the new `common` folder, choose "New File...", and name the file `common.ts`.
3. Copy the code from [common.ts](../common/common.ts) into your new file.

Then add this line to the top of your game file, along with the other `import` line:

```typescript
import { endScreen } from "../common/common";
```

The `../` means "go up one folder, out of your game's folder, and then into `common`."
The file has a few other helpers in it, too.
We'll explore them in later chapters.

Clicking the end screen will start a fresh game.
There's a right way and a wrong way to do that.
The tempting way is to call `builder()` again.
It looks like it works, but it doesn't: the old hero, hedges, and timers are all still there, the counters still hold their old values, and the game can't even end a second time.
The right way is `stage.switchTo(builder)`.
It wipes the slate clean (actors, timers, score, and keyboard handlers), and *then* calls `builder()`.
Any time a game needs to start over, `switchTo` is the call to use.

## Milestone 2

Here's the whole game, still in gray:

<iframe src="./firefly_jar_milestone2.html"></iframe>

The code is [here](firefly_jar_milestone2.ts).

It's a lot more fun now.
Go ahead and play it several times, and ask yourself two things:
Is it fun?
What should change to make it *more* fun?

The code is set up with numbers at the top of `builder()` (`GOAL`, `DAWN`, `SPAWN_FREQ`, `FIREFLY_LIFETIME`, and `FLICKER_TIME`).
You should try adjusting these.
Maybe 45 seconds is too long.
Maybe fireflies appear too often, or not often enough.
Change a number, play again, and notice how the game feels different.
Nudge them one way, and the game is boring.
Nudge them the other way, and it's impossible.
Somewhere in between is a game that's tense but fair, and finding it takes much longer than writing the code did.

Once you like how it plays, it's time to make it look good.
