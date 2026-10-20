# Part 3: Dress It Up

At the end of Part 2, Firefly Jar was a complete game.
If you tuned it well, it was even a fun one.
But it didn't look like a garden at night, and it didn't feel like one, either.
Now we'll work on the look and feel.

There's one rule for this part, and it's an important one: **change how things look, and nothing else.**
The rigid bodies stay exactly where they are, at exactly the same sizes.
The behaviors, the timers, the counters, and the win and lose conditions don't change at all.
When you're done, the game should play exactly the same as it did in gray.
That's what makes it safe to have spent all that time tuning it.

Here's the finished game one more time, so you can compare:

<iframe src="./firefly_jar_game.html"></iframe>

The art in this game is still just shapes: boxes, circles, and a rounded box, in carefully chosen colors.
Later in the book, you'll use images, animations, filters, particle effects, and maybe even videos.
But here, you'll see that a few shapes and colors can make a big difference.

## Hedges, Trees, and the Hero

The hedges are the easiest change.
The gray box and its label become a dark green box with a slightly lighter outline.

```admonish note title="Choosing Colors"
JetLag wants colors as hex strings, like `"#1d4a2a"`, but nobody picks colors by guessing hex digits.
Instead, use an HTML color picker, like the one at [W3Schools](https://www.w3schools.com/colors/colors_picker.asp).
Click around until you find a color you like, and then copy the six-digit code it shows you (along with the `#`) into your code.
If you want a see-through color, add two more digits at the end, as in Part 1.
```

The colors for the garden follow a few rules of thumb:

- Start with the background, then pick everything else to look good against it
- Each thing gets a base color, and a slightly lighter version of the same color for its outline.
  That gives the hedges an edge without making them look like they were drawn with a marker.
- Things the player has to notice, like the fireflies and the jar, are the brightest things on the screen.

The most important rule is this: Whatever colors you choose, make sure the game is still easy to understand at a glance.

Here are the hedges:

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:hedge_art}}
```

The trees use an array again, but this time it isn't a shape plus a label.
It's a dark green canopy, with a small brown circle on top of it for the trunk.

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:tree_art}}
```

The trunk's radius is `radius * 0.3`, so a bigger tree gets a bigger trunk, without any new numbers to keep track of.
And the rigid body is untouched.
It's still a circle the size of the whole canopy, so the hero still bumps into the edge of the tree, not the trunk.

The hero becomes a pale circle.
Remember that the hero's rigid body was a circle all along, even when it looked like a box.
Now the appearance finally matches it.

## The Jar

The jar is a see-through, rounded box with a light blue outline, plus a brown lid:

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:jar_art}}
```

The glass is see-through because of the `33` at the end of its fill color.
The lid is a second `FilledBox`, and the `offset` moves it 0.6 meters up from the center of the actor, so it sits on top of the jar instead of in the middle of it.
Every appearance in an array can have its own offset, which is how you build a picture out of several shapes that aren't all stacked in the same spot.

## Fireflies That Glow

The fireflies are the heart of the game, so they get the most attention.
A glow is hard to draw as one shape, but it's easy to fake with three:

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:firefly_art}}
```

We're drawing a big, faint circle, then a smaller, brighter one, then a small, solid core, all the same color.
Stacked on top of each other, they look like a single point of light fading out into the dark.
The color itself is now a parameter to `makeFirefly`: a yellow-green for ordinary fireflies, and a warm orange for golden ones.
In Part 2, that parameter was the label text.
Now that there's art, the calls to `makeFirefly` pass a color instead.

This is a good example of why art and gameplay have to be designed together.
The outer glow has a radius of 0.45, but the rigid body still has a radius of 0.3.
So the glow is *bigger* than the thing you have to touch.
That's on purpose: the glow tells you where a firefly is, and the core tells you where to go.
If the rigid body were as big as the glow, the game would suddenly get easier, and all that tuning in Part 2 would be off.

The flicker needs one change.
In Part 2, the ticker only had one box to fade.
Now there are three circles, and each has its own amount of see-through-ness.
That's what `opacity` is for.
It remembers each layer's original transparency, so that when the flicker turns the firefly back on, each layer goes back to the way it was:

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:firefly_flicker}}
```

`forEach` runs its code once for each layer, with `l` as the layer and `i` as its position in the array.
When `on` is false, every layer turns into the same dim, mostly see-through color.
When it's true, layer `i` gets `opacity[i]` added back to the end of its color.

## Dawn

The last touch is the sky.
Before, the background was a flat, dark gray.
Now it starts as a deep night blue, and slowly turns pink as dawn approaches:

```typescript
{{#include ../../tssrc/01/firefly_jar_game.ts:sky}}
```

`stage.backgroundColor` is the color behind everything else.
Four times a second, this timer works out how far along the night is (from 0 at the start to 1 at dawn), and sets the background to a mix of the two colors.
`mixColor` is a helper function at the bottom of the file, and if you're curious about how colors work, it's worth reading.
It splits each color into its red, green, and blue parts, blends each part on its own, and puts them back together.

The sky doesn't change the rules of the game at all.
But it changes how the game *feels*.
Players can sense time running out, without ever looking at the HUD.

## The Finished Game

The code for the finished game is [here](firefly_jar_game.ts).
You'll notice that I actually broke a rule, and made a change to the core game code, by fixing the "diagonal velocity" bug.
Other than that, the game should play the same as at the end of the second milestone.
If your gameplay isn't the same as when you finished tuning after milestone 2, go back and check that you only changed appearances.

Then, compare the gray version to the finished one.
It's the same game, with the same rules, the same timers, and the same numbers.
But I think you'll agree that one of them is a lot more fun to play.
