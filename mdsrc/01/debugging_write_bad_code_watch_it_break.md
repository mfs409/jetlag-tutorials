# Debugging: Write Bad Code, Watch It Break

You've now built a real game.
Before moving on, let's break it on purpose.
Knowing what a mistake *looks like* before you make it by accident is worth more than any amount of reading about tools you haven't needed yet.

## The Browser's Developer Console

Every browser has a developer console (in Chrome or Firefox, press F-12, then pick "Console").
It's where JetLag reports errors.
When `hitBoxes` is `true` in your `Config`, clicking in the game will report the world coordinates you clicked in this console.
That's the fastest way I know to answer "what number do I need here?" when you're placing an actor by hand.
Get comfortable opening the console now, because you'll use it a lot.

## VSCode Hover Help

You can hover your mouse over just about *anything* in your code (a function name, a class, a field), and VSCode will pop up its documentation.
This works because JetLag's source code is fully documented.
It's a much faster way to answer "what does this argument do?" than searching this book or the source code by hand.

Notice that the functions you wrote in this chapter all used `/** */` comments at the top of the function.
VSCode extracts these to make the documentation.
Commenting your code in this way helps *you* later on.

## Compile-Time Errors, Not Just Runtime Ones

Go back to your Firefly Jar code, and comment out `hitBoxes = true;` in `Config`.
Your `Config` class `implements JetLagGameConfig`, which means TypeScript checks it *before your game ever runs*.
`Config` gets a red underline in VSCode, and hovering over it shows you exactly what's missing.
This is an earlier kind of feedback than an error in the console.
It catches a whole category of mistakes before you even run the game.
Put the line back once you've seen it.

## Dealing With Asset Errors

Assets are media files your game uses.
They include images, sounds, music, videos, and fonts.
JetLag has to load each asset file before it can use it.
This is a common source of errors.

Firefly Jar loads a font, `Arimo-Regular.ttf`, and uses it for every label and for the HUD.
Here's a small example that's broken on purpose.
Its `Config` names the font file with a typo, `Arimo-Regualr.ttf`:

```typescript
{{#include ../../tssrc/01/bad_font.ts}}
```

<iframe src="./bad_font.html"></iframe>

When you try to run the game, it presents a black screen.
Open the console, and you should see two errors.
The first comes from the browser: "Failed to load resource: the server responded with a status of 404 (Not Found)."
The second comes from JetLag's loader: "Uncaught (in promise) Error: [Loader.load] Failed to load" followed by the address of the file, which ends in `Arimo-Regualr.ttf`.
Both of them tell you which file couldn't be found, which is the thing to go and fix.

JetLag waits for every asset to load before it builds the first scene, so a black screen with an error that names a file is almost always a typo in that file's name.
A black screen with *no* error in the console is a different kind of problem.
It isn't an asset.

There's also a quieter mistake, and it's harder to catch.
Every `TextSprite` asks for a font by its *face*, like `"Arimo Regular"`.
If you misspell the face, or ask for a face that you never loaded, JetLag doesn't report anything.
The browser quietly picks some other font, and the text just looks different.
Trigger that one on purpose now, so you'll recognize it later when it isn't on purpose.
In your Firefly Jar code, change one of the `face` values to `"Arimo Bold"`, and play the game.
Nothing breaks, and nothing shows up in the console.
When text looks wrong and the console is empty, check the face name first.
