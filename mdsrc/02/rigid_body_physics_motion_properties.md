# Rigid Body Physics & Motion Properties

Every actor in a JetLag game has a rigid body underneath it.
Those rigid bodies are controlled by the Box2D physics engine.
Box2D isn't just a *placement* tool, it's a full, industrial-quality *simulation* tool.
It understands velocity, forces, collisions, joints, and much more.

In this chapter, you'll learn about some of the features that Box2D provides by building this mini golf game, called Crazy Golf:

<iframe src="./crazy_golf_game.html"></iframe>

Use left/right/up/down to aim the shot.
Hold the space bar to charge a shot, and let go to putt.
If a hole goes badly, you can press R to start it over.

Play at least a few holes before you read any further.
Try to beat par, and pay attention to how the ball behaves when it hits things.

There are eight holes, and each one is built around one idea about rigid bodies.
The first hole is all walls that never move.
Then a windmill spins forever, and while it can affect the ball, the ball can't affect it.
Next come crates that the ball can shove out of the way, but only if they're light enough.
After that, the walls turn bouncy, or dead, depending on what they're made of.
Then the ball has to cross an ice rink, where it hardly slows down, and carpet, where it stops fast.
In the sixth hole, mushrooms make the ball shrink and grow.
The last two holes are different.
They're side views, where gravity pulls the ball downhill, and floating rafts hang in the air.

In this chapter, we'll build the course one hole at a time.
By the time you've built all eight holes, you'll have used most of the options a rigid body has.

You won't have to write the whole game, though.
Aiming, putting, scoring, and the end-of-hole screens require you to know things you haven't learned yet.
Later chapters will teach them, but for now, that code is in a separate file, `helpers.ts`, which you'll copy into your project and use as it is.
Feel free to read it if you want, but you don't have to understand it.
Your focus should be on the physics.
