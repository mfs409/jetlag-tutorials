# Mental Model Game 1

This game uses the left and right arrow keys and the space bar.
See what you can figure out about how to play it.
Then think about how the camera and gravity might be configured.

<iframe src="./games/ambiguous_game.html"></iframe>

## What Did You See?

Red circles flew toward the triangle.
If one of them collided with the triangle, it was game over.
If the triangle "shot" ten red circles, you won.
Either way, the game restarted immediately.

Could you tell what gravity was doing?
What about the camera?
Was it an overhead perspective, or a side one?
How did you know?

With gravity set to `(0, 0)`, this could be an overhead perspective *or* a side perspective in outer space (where nothing falls either way).
The only thing that decides which one the player perceives is how you draw the actors and background.
This game uses a blue triangle and red/grey circles, deliberately avoiding tipping you off either way.

## How It's Built

[Here's the whole file](./games/ambiguous_game.ts).
Read through it, and see how much of it makes sense.
The code has *lots* of comments to help you figure out what's happening.
You can also copy its contents and paste them into your `my_game.ts` file.
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