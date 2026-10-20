# Mental Model Game 4

Use the left and right arrow keys to move the hero.
Press the space bar to jump.
Click the game first, so that your keys go to it instead of this page.

<iframe src="./vertical_game.html"></iframe>

## What Did You See?

In this final example, things start off like the side-view game.
However, the camera is configured differently, which results in a different style of play.
Try to explain what's different about how the *camera* is behaving here compared to every game before it.

This is the start of a Doodle Jump-style climber.
Which direction does the camera move as you play?
What does "the top of the world" mean in a game like this?
Be sure to look at what happens if the hero moves off screen.

## How It's Built

[Here's the whole file](vertical_game.ts).
It also requires two new assets: [night_0.png](../assets/night_0.png) and [night_1.png](../assets/night_1.png).
Once again, there are some new ideas in here that you'll want to be sure to understand.

There are two things that are especially useful to study.
The first is that there is a function for making the platforms.
This is saving *a lot* of code.
Any time you find yourself copying and pasting the same thing and making small changes each time, consider whether you can use a function instead.

The second thing is that there is an animated background.
JetLag supports flip-book animations: it switches between different images to give the effect of animation.
These are just a different kind of appearance, like `ImageSprite` and `TextSprite`.
It turns out that animations are tricky, because the orientation of the actor might necessitate changing animations (for example, running left versus running right).
The *default* animation in JetLag is called `IDLE_E`, indicating "not moving, facing eastward".

There's one more trick to the background: it's not attached to an actor!
Instead, the background is a parallax layer, which scrolls relative to the camera focal point.

There are many knobs you could consider changing.
What happens if you add a `minY` to the `stage.world.camera.setBounds()` call?
Does it make the visual experience better, or worse?
What happens if you change the layer's `0.3` speed to be larger?
Smaller?
Negative?

You should also think about the gameplay.
Should it be possible to fall all the way back down?
If not, what could be done about it?
