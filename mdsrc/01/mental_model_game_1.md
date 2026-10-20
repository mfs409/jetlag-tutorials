# Mental Model Game 1

Use the left and right arrow keys to rotate the blue triangle.
Press the space bar to shoot.
Once you're ready, click the game.
Your arrow keys and space bar will go directly to the game, instead of navigating this page.

<iframe src="./ambiguous_game.html"></iframe>

## What Did You See?

Red circles flew toward the triangle.
If one of them collided with the triangle, it was game over.
If the triangle "shot" ten red circles, you won.
Either way, the game restarted immediately.

Now think about what the camera and gravity were doing.
What's the gravity here?
What is the camera doing?
Is this an overhead perspective, or a side one?
What tells you that?

Here's the thing: with gravity set to `(0, 0)`, this could be an overhead perspective *or* a side perspective in outer space (where nothing falls either way).
The only thing that decides which one the player perceives is how you draw the actors and background.
This game uses a blue triangle and red/grey circles, deliberately avoiding tipping you off either way.

## How It's Built

[Here's the whole file](ambiguous_game.ts).
Read through it, and see how much of it makes sense.
The code has *lots* of comments to help you figure out what's happening.
You can also copy its contents and paste them into your unit_01.ts file.
Then you can hover over things in VSCode to see the documentation for each class, method, and field.
After you're done reading, try editing it: Can you make it more fun?
Harder?
Different?

Here are a few things to take away from the game:

- The game has no gravity, and no special camera configuration
- It needs some trigonometry to get the projectiles to shoot in the right direction, and to get the enemies to travel toward the hero
- It uses arrow keys to change rotation, not position
- This game uses JetLag's basic support for winning and losing a level
- This is the first example of using a timer to generate events in the future

That's a lot of features, but if you don't count the comments, there are about 45 lines of code in the builder.
That's not a lot of code, considering how much is happening and how much math is involved.
The whole point of JetLag is to make these kinds of behaviors easy and brief, so you can focus on design, not on writing code.
