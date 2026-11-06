# Milestone 2: The Garden

Now that you've got a hero who can move around, it's time to put some trees and hedges in its way.
We'll do this in a few steps.
First, let's just make one hedge and one tree.
We'll make a few mistakes, but eventually we'll get them to behave correctly.
Then we can use some more clever techniques to make all the hedges and trees, without having to write a lot of code.

## Our First Hedge And Tree

Let's start with the basics: two actors, one rectangular, the other circular.
They'll represent a hedge and a tree:

```typescript
{{#include ./games/firefly_jar_02_01.ts:first_obstacles}}
```

When you try to move the hero, you'll notice that it can walk through them.
That's not going to make for a challenging game.
The first thing to do is make them both solid, by giving them each a `SolidBehavior`:

```typescript
{{#include ./games/firefly_jar_02_02.ts:first_obstacles}}
```

Unfortunately, the hero *still* can walk through them.
The problem is that they're solid, but the hero has the default (`Passive`) behavior, meaning it can still go through things, even solid things.
To fix this, the hero needs a behavior too.
We'll use PlayerControlBehavior, because that enables it to pick up items and go to a destination.
Eventually, we'll need both.

```typescript
{{#include ./games/firefly_jar_02_03.ts:hero}}
```

## Drawing Lots Of Hedges And Trees

It would be tedious to draw each hedge and tree by hand.
Fortunately, we don't have to.
The technique we'll use here has two parts.
First, you'll set up a pair of arrays that have information about how to draw each hedge and each tree.
Then you'll write a pair of loops that go through the arrays and use each entry to draw a hedge or tree.

First, you'll need to set up two arrays.  For hedges, we'll use the left/top/right/bottom coordinates.
These are easy to figure out: just press `b` while the game is playing, open a console, and click where you want them to go.  The console will show the coordinates you clicked, which makes the rest easy:

```typescript
{{#include ./games/firefly_jar_02_04.ts:garden_data}}
```

Now that the data is in place, all that remains is to loop over it and use each line to draw a tree or hedge:

```typescript
{{#include ./games/firefly_jar_02_04.ts:scenery}}
```

## Make Design Easier

To make it a little easier to work on the design of your game, it's a good idea to add text labels to things during development.
The text labels help you (or a play-tester) to know what something is supposed to be, even if its graphics aren't implemented yet.

To use text, you'll first need to load a font.
Since you downloaded Arimo to your assets folder earlier, the easiest thing to do is use Arimo.
You'll need to add this *inside* of your `Config` class:

```typescript
{{#include ./games/firefly_jar_02_05.ts:fonts}}
```

Now it's time to update the loops that draw the hedges and trees.
A nice feature that we can use here is arrays.
More specifically, you can give a single appearance, or an array of appearances, when creating an actor.
Arrays are delimited with square braces: `[]`.
So in the code below, `appearance` gets an array with two components: a picture and some text.

```typescript
{{#include ./games/firefly_jar_02_05.ts:scenery}}
```

For good measure, let's also put a label on the hero that the player controls:

```typescript
{{#include ./games/firefly_jar_02_05.ts:hero}}
```

## End State

You're done with the second milestone!
If you want to compare your code to mine, here's my [Firefly Jar Milestone 2](./games/firefly_jar_02.ts) code.

Here's my game, for you to test:

<iframe src="./games/firefly_jar_02.html"></iframe>
