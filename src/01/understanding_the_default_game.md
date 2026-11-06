# Understanding The Default Game

In the "Getting Started" chapter, you created a game called `my_game`.
When you're in your JetLag folder and you type `npm run serve my_game`, it should start a web server, and visiting `http://localhost:7000/my_game/my_game.html` should show you a game that looks like this:

![The default, empty JetLag game](./media/first-run.png)

There are two files that are working together to make this simple game.
In your JetLag folder, there should be a folder called `src`.
In it, there should be another folder called `my_game`.
In it, there should be a folder called `assets`, as well as two files: `my_game.html` and `my_game.ts`.
Let's explore those files one-by-one.

## The HTML File

The starter game is based on two files: a `.ts` file of code, and a matching `.html` file that tells a web browser how to display the code.
Let's understand what's in them, starting with the `my_game.html` file:

```html
{{#include ./my_game.vendored.html}}
```

```admonish Note
Most of this file is not going to change very much from one game to the next.
If you don't understand all the details, that's okay.
```

This is a basic HTML file.
Its job is to describe a web page: its shape, its style, and where to find its code.

The `head` section describes the general appearance of the web page:
- `meta` tells mobile browsers how to stretch the page to fit a small screen (just in case you're targeting mobile devices)
- `style` makes the page fill the screen
- `title` is what appears in the browser tab

The first thing you should do when you start a new game is update the `title`.

The `body` has two parts:
- `div`, which by default is named `game-player`, is where the game will appear
- `script`, which says that in this case the code to run is called `my_game.js`

You probably don't want to change anything in the `body`.

## The TypeScript Code

Now take a look at `my_game.ts`.
Notice that its name is *not* `my_game.js`.
It has a `.ts` extension, but the HTML file expects a file with a `.js` extension.
The `.ts` file only has the code you write, none of the JetLag/Pixi.js/Box2D code underneath it.
When you run `npm run serve <name>`, your `.ts` file gets combined with several libraries to produce the `my_game.js` file the HTML page expects.

```admonish Note title="Developer vs Deployment Builds"
`npm run serve <name>` is the command to use while working on your game.
It builds a version of your game for the browser, and rebuilds it every time you save.
`npm run check` looks for errors in your code without building anything, and `npm run build <name>` produces a standalone, deployable version once you're ready to share it.
You don't need to worry about any of this for now.
It will be discussed in more detail in a later chapter.
```

There are four important parts of the `.ts` file.
First, the `import` statement(s) at the top say which parts of JetLag your game needs.
For now they're all on one line.
Later, you'll learn how to get VSCode to manage them automatically as you use new features.

```typescript
{{#include ./games/my_game.ts:1}}
```

Second, the `Config` class tells JetLag the width and height of your game (in meters) and whether it should draw "hit boxes" around things.
Leave that `true` while developing.
You can set it to `false` once you're confident everything's right.

```typescript
{{#include ./games/my_game.ts:3:13}}
```

This class `implements` something called `JetLagGameConfig`, which means that if you forget a required field, you will get an error.
Try it: put `//` in front of `hitBoxes = true;` and watch what happens: `Config` gets a red underline, and hovering over it shows you exactly what's missing.

As you make progress, you'll discover plenty of optional fields you can add to this class, such as the names of fonts, images, and sound files.
Don't worry about them yet.

Third comes a function that describes how to set up a stage.
In this example, it's called `builder`.
A game's code can get long, at which point you'll want to break it up into several functions, and maybe even several files.
This game is small, so all the code is in one function, in one file.
`builder` sets up the *initial state* of the game.
It runs to completion before you get to play, and everything that happens afterward is because of the physics simulator or an event.

```typescript
{{#include ./games/my_game.ts:15:63}}
```

Finally, there is a single-line call to `initializeAndLaunch`, which starts your game.
It includes the name of your `builder`, and also a new instance of your `Config` object, so that JetLag knows how to set up the browser and how to set up the stage.
Notice the `div` name from the HTML file appears here too.
That's essential.
It lets JetLag find a specific `div` in your HTML file and put the game inside it.

```typescript
{{#include ./games/my_game.ts:64:66}}
```

Before looking more deeply at `builder`, notice that the code has many comments.
That's not an accident.
You should make sure to explain your code as you write it.
It's common when making a game that you'll write something tricky, leave it alone for a while, and then need to come back to it.
The comments are for you, so your future self knows what your past self did.

## Understanding The Builder

The first line you'll see is:

```typescript
{{#include ./games/my_game.ts:26}}
```

This draws a grid on screen.
Open your browser's developer console (F-12, then "Console") and click anywhere on the screen.
When your config says `hitBoxes = true` and you click on the screen, the console will tell you the coordinates of your click:

![When hitBoxes is true, click positions are reported](./media/world_touch.png)

("World Touch" and "HUD Touch" are the same for now.
A later chapter gets into the difference, so ignore "HUD Touch" until then.)

The grid is made of actors, but they are more like props: they don't move, and they don't collide with anything.
The grid is just there to help you get oriented.
More interesting is how the world relates to `Config`: you asked for a 16x9-meter screen, and JetLag is figuring out how large it can stretch that world without distorting it.
If you resize your browser, the game stays 16x9 (with black bars added as needed).
No matter the window size, a game always shows a simulated world that's 16x9 meters if those are the dimensions in your `Config`.

The next line is:

```typescript
{{#include ./games/my_game.ts:30}}
```

This line makes it so that pressing the `b` key toggles debug boxes.
When you're developing, and `hitBoxes = true` in your config, it can be useful to turn the hit boxes on and off in the middle of a test.

```admonish Note
When you're ready to share your game with others, you'll probably want to remove the grid and the `DebugToggle`, and to set `hitBoxes = false`.
When you're getting started, they can be quite helpful.
```

### The Hero

Actors are the main kind of entity.
Every actor needs an `appearance` and a `rigidBody`.
Other components are optional.

```typescript
{{#include ./games/my_game.ts:33:37}}
```

This actor is saved to a variable, `hero`, so later code can find it again.
Its appearance is a circle with radius 0.5 meters (so, width and height of 1), colored red, with a wide green border.
Its body is also a circle of radius 0.5.
Appearance and body don't have to match, but here they do.
`cx`/`cy` are the center point of the actor.
Remember that (0, 0) is the world's top-left corner, with X increasing rightward and Y increasing downward.

The hero's body has a second argument, `{ dynamic: true }`.
A body is *static* unless you say otherwise, which means that it never moves.
That's appropriate for the obstacles and the walls, but not for something you want to control.
`dynamic: true` says that this body can move, and that it should be pushed around by gravity and by whatever it runs into.
It doesn't establish any rules for making the hero move.
It just makes sure that the hero isn't hard-coded as stationary.

The hero's `behaviors` field holds a `PlayerControlBehavior`.
On its own, that doesn't make the hero move (the keyboard handlers below do that).
It's mostly a marker saying "this is the actor the player controls," which other parts of the engine can check for later.
It also ensures that JetLag doesn't assign a default `PassiveBehavior` to the hero.
`PassiveBehavior` would let the hero walk through solid obstacles.
We definitely don't want that!

### The Obstacles

There are two actors who don't have a `movement` and can't move on their own.
They are configured with the same code pattern, but aren't saved to variables, since nothing else needs to refer to them later.
One's a box, one's a polygon.

```typescript
{{#include ./games/my_game.ts:40:44}}
{{#include ./games/my_game.ts:47:51}}
```

Boxes just need a width and height.
The polygon is trickier: polygons must be convex, and you define them with the (x, y) coordinates of their vertices, in clockwise order, relative to the polygon's center.
Here, that's (0, -.5), (.5, 0), (0, .5), and (-1, 0) for the left, top, right, and bottom vertices.

```admonish Note
The easiest way to get comfortable with polygons is to change some numbers and see what happens.
You'll use plenty of polygons once you're building a real game, but you can wait until then to get comfortable with the details.
```

Both obstacles have a `SolidBehavior`, which ensures that actors with `dynamic` bodies can't pass through them.
(The grid's lines have no `behaviors` at all, so they default to `PassiveBehavior`, and don't collide with anything.)

The appearance is bland right now, since it's just solid shapes.
A later chapter shows how to use pictures and animations instead.

### Events

As written, nothing would happen.
The world would just sit there.
The last part of the code lets the player control the hero, through events.

```typescript
{{#include ./games/my_game.ts:54:61}}
```

This code handles two kinds of events: keyboard key-down and key-up.
Hover over `setKeyUpHandler` in VSCode and you'll see pop-up help.
In fact, you can hover over almost *anything* in the code and get help.
Here, it says the code is what should run whenever a given key is released.

TypeScript lets you write functions inline, with `()=>{}` (or `()=>body`, when the `body` is one line).
So this is eight handler registrations covering up and down for the four arrow keys and the four `WASD` keys.
Using an array (`[]`) makes it easy to assign the same behavior to several keys at once.

Each handler updates the hero's velocity directly, by operating on its `rigidBody`.
Pressing a key makes part of the velocity nonzero, and releasing it sets that part back to zero.
You should be able to press two directions simultaneously, like `Up` and `Left`.

### The Stage

One thing I glossed over above is the "stage."
Think of it as an Entity, but a special one.
There's only one stage, and it has features actors don't, like being the only thing that understands keyboard events, via `stage.keyboard`.
A later chapter explores this further.

## The Playable Game

Below is a playable version of this game.
Click it, then use the arrow keys.
The hero should move and collide with the obstacles.
Be sure to press `b` to toggle the hit boxes.
You should try opening the developer console too (typically by pressing `F-12`) to see click coordinates as you go.

<iframe src="./games/my_game.html"></iframe>

If you've been following along in your own project, this is a good time to experiment.
Change actor positions or dimensions, change an `appearance` to differ from its `rigidBody`, or maybe adjust the keyboard velocities.

If you're feeling more daring, try adding off-screen walls, so the hero can't disappear.
Then try to change the `vertices` of the polygon.
Maybe even try to make a concave polygon, and notice how the `appearance` works fine, but the `rigidBody` misbehaves.
