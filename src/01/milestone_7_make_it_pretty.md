# Milestone 7: Make It Pretty

At the beginning of this chapter, I said we'd focus on functionality, and wait until the end to make the game pretty.
We didn't exactly follow that guidance.
The HUD, the end scenes, the flickering fireflies, and the background are mostly just visuals, not core functionality.

In this last milestone, we'll focus exclusively on visuals, to make the game more appealing.
The art in this game will still only be shapes, but we'll chose colors carefully and add a bit more style.
Even a little bit of effort will have a big impact!

## Hedges, Trees, and the Hero

The hedges are the easiest change.
The gray box and its label become a dark green box with a slightly lighter outline.

```admonish note title="Choosing Colors"
JetLag wants colors as hex strings, like `"#1d4a2a"`, but nobody picks colors by guessing hex digits.
Instead, use an HTML color picker, like the one at [W3Schools](https://www.w3schools.com/colors/colors_picker.asp).
Click around until you find a color you like, and then copy the six-digit code it shows you (along with the `#`) into your code.
If you want a see-through color, add two more digits at the end.
```

The colors for the garden follow a few rules of thumb:

- Start with the background, then pick everything else to look good against it
- Each thing gets a base color, and a slightly lighter version of the same color for its outline.
  That gives the hedges an edge without making them look like they were drawn with a marker.
- Things the player has to notice, like the fireflies and the jar, are the brightest things on the screen.

The most important rule is this: Whatever colors you choose, make sure the game is still easy to understand at a glance.

For the hedges, all we need to do is make changes to the colors of the fill and line:
```typescript
{{#include ./games/firefly_jar_07_01.ts:hedge_art}}
```

Next, we'll do the trees.
They'll have a dark green canopy and a small brown circle on top for the trunk:

```typescript
{{#include ./games/firefly_jar_07_01.ts:tree_art}}
```

The trunk's radius is `radius * 0.3`, so a bigger tree gets a bigger trunk, without any new numbers to keep track of.
And the rigid body is untouched.
It's still a circle the size of the whole canopy, so the hero still bumps into the edge of the tree, not the trunk.

The hero will be a pale circle:

```typescript
{{#include ./games/firefly_jar_07_02.ts:hero_art}}
```

## The Jar

The jar is a see-through, rounded box with a light blue outline, plus a brown lid:

```typescript
{{#include ./games/firefly_jar_07_03.ts:jar_art}}
```

The glass is see-through because of the `33` at the end of its fill color.
The lid is a second `FilledBox`, and the `offset` moves it 0.6 meters up from the center of the actor, so it sits on top of the jar instead of in the middle of it.
Every appearance in an array can have its own offset, which lets you build a picture out of several shapes that aren't all stacked in the same spot.

## Fireflies That Glow

The fireflies are the heart of the game, so they get the most attention.
A glow is hard to draw as one shape, but it's easy to fake with three.
(In the code listing below, not a lot changed, but you'll see the whole function, instead of just the changes, so that it's easier to follow along.)

```typescript
{{#include ./games/firefly_jar_07_04.ts:make_firefly}}
```

We're drawing a big, faint circle, then a smaller, brighter one, then a small, solid core, all the same color.
Stacked on top of each other, they look like a single point of light fading out into the dark.
The color itself is now a parameter to `makeFirefly`: a yellow-green for ordinary fireflies, and a warm orange for golden ones.

This also changed the arguments, so that the color comes in instead of text for a label.
All three calls to `makeFirefly` pass a color: one for the ordinary fireflies that blink on over time, one for the golden ones, and one for the firefly that is already lit when the game starts:

```typescript
{{#include ./games/firefly_jar_07_04.ts:spawners}}
```

Be sure to press `b` so you can see how the firefly's body matches the middle circle.
The inner circle is just decoration, and the outer circle doesn't count as a collision, because each has a radius that is different than the radius of the `rigidBody`.
That's on purpose: the glow tells you where a firefly is, and the core tells you where to go.

The flicker code shows one change.
Until now, the ticker only had one box to fade.
Now there are three circles, and each has its own amount of see-through-ness.
The `opacity` variable remembers each layer's original transparency, so that when the flicker turns the firefly back on, each layer goes back to the way it was:

```typescript
{{#include ./games/firefly_jar_07_04.ts:firefly_flicker}}
```

`forEach` runs its code once for each layer, with `l` as the layer and `i` as its position in the array.
When `on` is false, every layer turns into the same dim, mostly see-through color.
When it's true, layer `i` gets `opacity[i]` added back to the end of its color.

## The Finished Game

The code for the finished game is [here](./games/firefly_jar.ts).
Below, you'll find a playable link.
Be sure to press `b` to see the hit boxes.
You should also compare this version of the game to the one from the end of the last milestone.
I think you'll agree that one of them is a lot more fun to play.

<iframe src="./games/firefly_jar.html"></iframe>
