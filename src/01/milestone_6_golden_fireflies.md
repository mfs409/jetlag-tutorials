# Milestone 6: Golden Fireflies

The last piece of gameplay for Firefly Jar is to add golden fireflies.
These fireflies are rare, and worth more points.
To get them to work, we'll mostly just need to make a few adjustments to our existing code.

## A Second Counter

We could say "golden fireflies add three instead of one" and just use a single counter.
However, it's usually nice to know not just the final score, but how that score was achieved.
To do that, we'll introduce a second counter called "golden".
JetLag makes this easy: we just need to use a different name in the `onCollect` field of the firefly's `CollectableBehavior`.
Then JetLag will make sure the counter exists, and will manage it accordingly.

In the end, all that means is that we need to change the `makeFirefly` function.
We'll do this in two parts.
First, change the *signature* of the function, to say that it takes another argument: the name of the counter.
While we're at it, we'll add an argument for the label to put on the firefly:

```typescript
{{#include ./games/firefly_jar_06_01.ts:firefly_signature}}
```

Inside the function, we need to make a small edit to how we make the actor.
It needs to use one of the new arguments to choose the counter to increment, and another of the arguments to know what label to use:

```typescript
{{#include ./games/firefly_jar_06_01.ts:firefly_actor}}
```

Then, in order for our existing fireflies to work, we need to fix the code in two places, so that `makeFirefly` gets the two extra arguments:

```typescript
{{#include ./games/firefly_jar_06_01.ts:spawners}}
```

## Golden Fireflies

Now we can add the golden fireflies!
We'll start by declaring the constants that we'll use: the hard-coded locations where a firefly can be placed, the rate at which they spawn, and how long they last:

```typescript
{{#include ./games/firefly_jar_06_02.ts:golden_consts}}
```

Then all it takes is to add a new timer for the golden fireflies!

```typescript
{{#include ./games/firefly_jar_06_02.ts:golden}}
```

Unfortunately, these fireflies aren't affecting the score yet.
We can fix that in two steps.
First, we'll add a constant that lets us tune how much a golden firefly is worth.
Then we'll update the `caught` function to compute the score based on both counters: `fireflies` and `golden`:

```typescript
{{#include ./games/firefly_jar_06_03.ts:score}}
```

## End State

Here's my [Firefly Jar Milestone 6](./games/firefly_jar_06.ts) code, for your reference.
Below, you'll also find a playable version of the game.
Before you play it, there's something important to think about.
We're being very disciplined in our development.
We're putting numbers into constants, to make them easy to tune.
We're putting logic into little helper functions, so that we don't have to duplicate it in many places.
That's not just a stylistic preference.
It makes us more productive.
If you don't count the comments, we added golden fireflies by *changing* five lines, and *adding* eight.
That's not a lot of work, yet the game is much more interesting.

<iframe src="./games/firefly_jar_06.html"></iframe>
