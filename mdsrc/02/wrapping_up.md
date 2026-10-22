# Wrapping Up

Across eight holes, you built a golf course, and along the way you used nearly every option that a rigid body has when it's made.
There were three types: static bodies that never move, kinematic bodies that move only when you say so, and dynamic bodies that respond to forces like real objects.
There were three shapes, too: boxes, circles, and convex polygons.
Then came the settings that decide how a dynamic body feels: density, elasticity, damping, and friction.
You also saw a few things that change a body after it's made, like `setPhysics` and `resize`, and a couple of odd ones, like `setGravityDefy` and `disableRotation`.

Between them, that's most of what a rigid body's *construction options* can configure.
In the next chapter, you'll look more deeply at the ways a body can actually be *moved* once it exists.
You've seen a preview already, in the windmill and the sliding gate, and that's only the start.

## Make It Yours

Now that you know what each option does, you can design a hole of your own.
Try a par-2 hole where the only way to make par is to use the windmill's motion.
Or build a hole around an option we barely used, like a floating platform that the ball has to ride.
You could even add a ninth hole that mixes two ideas, like carpet on a side-view ramp that's also lined with rubber.
Whatever you pick, play it until it feels right, and adjust the numbers.
As in Chapter 1, the code should be the easy part, and finding the numbers is the real work.

## What About a Scorecard?

You may have noticed that the game doesn't keep score across holes.
Real golf has a scorecard, but this course doesn't, and that's on purpose.
Each time `stage.switchTo` starts a hole, it clears away everything that you made in the one before, including the score.
That's what makes a restart clean, but it's no help when you want to remember something.

JetLag has a place for things that need to be remembered, called *storage*.
It comes in three kinds.
Level storage is cleared at every `switchTo`, just like everything else.
Session storage survives as the player moves from hole to hole, and is thrown away when they close or refresh the page.
Persistent storage survives even after they leave the page.

Session storage is the right one for a scorecard.
After each hole, you'd add the score to a `SessionValue`, and the next hole would read it back, to show a running total.
A later chapter goes through storage in detail, and then adding a scorecard to your course would make a good project.
