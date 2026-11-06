# Milestone 3: Fireflies

The game is developing nicely: there's a hero that can move around, and it needs to dodge obstacles.
However, there are no stakes to the game yet: nothing to do, no way to win, and no way to lose.
Let's start adding the way of winning, by making fireflies that need to be collected.

## Our First Firefly

Making a firefly is easy: we just need an actor with a `rigidBody` and an `appearance`.
We know we're going to end up making a lot of them, so let's create a function that takes the coordinates of the center of a firefly, and draws it there:

```typescript
{{#include ./games/firefly_jar_03_01.ts:make_firefly}}
```

To test this out, let's make one firefly when the game starts:

```typescript
{{#include ./games/firefly_jar_03_01.ts:first_firefly}}
```

## Catching The Firefly

If you try to collect the firefly, you'll find that you can't.
The hero just walks right over it.
To fix that, give the firefly a `CollectableBehavior`.

```typescript
{{#include ./games/firefly_jar_03_02.ts:firefly_actor}}
```

The `CollectableBehavior` does two things.
First, it makes the firefly disappear when the hero collides with it.
Second, it tells JetLag to make sure there is a counter called "fireflies", and to add one to that counter.
Later, you'll learn how to show the counter.

## Making Many Fireflies

The game will be more fun with lots of fireflies, so let's set up a timer that makes them periodically.
Like before, since there's a number that we might want to adjust later, we'll make it a constant.
`SPAWN_FREQ` will determine how many seconds pass between any two firefly spawns.
We'll use it with a timer that repeats, so the timer will make fireflies at a regular cadence.

We'll introduce another number: `GLOW_RADIUS`.
This tracks how big the firefly will be.
When we make fireflies, we will want to put them in random places.
We don't want them hanging off the edge of the screen, though.
So we can't say "put the center X between 0 and 16 and the center Y between 0 and 9".
Instead, we need to factor the radius into the decision.
For example, the center X should be less than `16 - GLOW_RADIUS` and greater than `GLOW_RADIUS`.

```typescript
{{#include ./games/firefly_jar_03_03.ts:firefly_consts}}
```

Now let's use that value to control a timer that makes fireflies.
`Math.random()` picks a number `i` such that $0 \leq i < 1$.
We can multiply it by a whole number, and we can add or subtract to shift it.
For example, if you wanted a number between `8` and `12`, you'd use `8 + Math.random() * 4`.
Using that knowledge, we can make random fireflies that never go off screen:

```typescript
{{#include ./games/firefly_jar_03_03.ts:spawners}}
```

## Paying Attention To Firefly Placement

Randomness is one of the trickiest things in a game.
It helps to keep a game feeling fresh and different, so that it remains *playable* for longer.
However, when something is truly random, that means even things you don't want to happen become possible.

Start up your game, and don't move the hero.
Watch the fireflies.
Did any appear *on* the hero?
*On* another firefly?
*On* a hedge or tree?

In short, when we pick a random position, we need to make sure there's nothing close to it.
Fortunately, the underlying physics simulation makes this easy.
Whenever we pick a spot, we can simply ask it "is there anything too close to this spot", and if so, we can try again.
Here's that logic, wrapped up in a nice, reusable function.
The key point is that we ask for every actor near the point we choose.
We get back an array.
If the array length is 0, there's nothing close by, so the spot is good.

```typescript
{{#include ./games/firefly_jar_03_04.ts:random_open_spot}}
```

Now we can update the timer for making fireflies:

```typescript
{{#include ./games/firefly_jar_03_04.ts:spawners}}
```

## Making Fireflies Disappear

If fireflies stick around forever, two bad things are going to happen.
First, the game will be too easy.
Second, as the screen gets polluted with fireflies, it will become harder and harder to find a spot to make a new one.
Eventually the game will start to lag.

For both reasons, we want to remove fireflies after a little while.
While we're at it, we should make them flicker right before departing, to give a visual clue to the player.

Since numbers always need adjusting later on, let's start by putting two numbers into the game as constants, so we can fine-tune them later:

```typescript
{{#include ./games/firefly_jar_03_05.ts:lifetime_consts}}
```

Now let's adjust the `makeFirefly` function.
We'll pass these numbers to it (because in the future, we might want different kinds of fireflies that flicker for different amounts of time).
Inside the function, we'll add *another* timer that runs every `0.1` seconds.
Normally it just counts until the time when we remove the firefly.
But when the timer gets close to disappearing (within `flickerTime` seconds remaining), we'll swap its color back and forth:

```typescript
{{#include ./games/firefly_jar_03_05.ts:make_firefly}}
```

Now we just need to update the call to `makeFirefly` so that it has the extra values, and our fireflies should flicker before disappearing:

```typescript
{{#include ./games/firefly_jar_03_05.ts:spawners}}
```

## End State

You're done with the third milestone! If you want to compare your code to mine, here's my [Firefly Jar Milestone 3](./games/firefly_jar_03.ts) code.

Here's my version of the game.
Be sure to compare it against yours:

<iframe src="./games/firefly_jar_03.html"></iframe>
