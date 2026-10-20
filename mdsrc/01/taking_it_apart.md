# Taking It Apart

When you're making a game from scratch, it's a good idea to draw pictures of the game world.
Then you can start identifying the different actors and how they need to be configured.

The task right now is a little bit different, because you're trying to re-create a game that I already showed you.
So instead of drawing a picture, you can use the actual game.
Even so, you shouldn't write any code yet.
Instead, try to deconstruct the game.
Using only the words from [Building a Mental Model](./building_a_mental_model.md) (`appearance`, `rigidBody`, `behaviors`, `movement`, and events), list everything Firefly Jar needs.
How many different kinds of actor are there?
What has to happen for the counter to go up?
What has to happen for the game to end?

Here's my list.

- There's a hero the player moves with the keyboard
- There are hedges and trees that the hero can't walk through
- There are fireflies, which disappear and bump a counter when the hero touches them, and which also disappear on their own if nobody catches them in time
- There's a jar, which wins the game, but only once the counter is high enough
- There's a clock, which loses the game when it runs out
- There's a HUD that shows the counter and the clock
- And there's a timer that keeps making new fireflies

That's a lot of pieces, but every one of them is an actor or an event, and every actor is built from the same two required ingredients: an `appearance` and a `rigidBody`.
Most of them also have a `behaviors` component that tells the engine what kind of thing the actor is.
Once you see the game that way, it stops looking like one big thing, and starts looking like a handful of small things that work together.

## The Starter Code

Here's a basic setup with the hedges and trees as gray shapes, and nothing else.
Everything else is yours to build:

<iframe src="./firefly_jar_starter.html"></iframe>

The starter code is [here](firefly_jar_starter.ts).
Run `npm run create`, and when it asks for a name, enter `firefly_jar`.
Then replace everything in `src/firefly_jar/firefly_jar.ts` with the starter code.
Read through the whole file before you change anything.
Partway through `builder()`, you'll find a list of TODO comments that describes what the finished game needs, one piece at a time.
The next three pages follow that list.
