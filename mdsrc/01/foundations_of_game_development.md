# Chapter 1: Foundations of Game Development

There are many types of games, and as a result, it isn't really possible to say "all games can be thought of like *this*".
However, for the types of games that are best suited to being made with JetLag, there is a standard way of thinking about them.
Well, actually, two ways of thinking about them, and you'll want to think about games *both ways*.

The first way to think about a game is as a simulation.
This is a very low level way to think about a game.
There is a physics engine that knows how to simulate physical bodies in the world.
It is tied to a graphics engine that can show the current state of the simulation.
Events, such as key presses and mouse clicks, cause the simulation to change.
For a game that runs at 60 frames per second (FPS), the physics engine runs every $0.0167$ seconds to advance the simulation.
Then the graphics engine draws what the simulation looks like at that point in time.

The second way to think about a game is like an interactive play.
The **Stage** is where the action happens.
**Actors** represent everything on the stage: not just people who move around, but also objects, props, and backgrounds.
The code of the game is the script of a play that is performed on that stage.
And to make it fun, the audience (the player) gets to influence how the actors perform.

It's important to think of a game in *both* of these ways.
For example, the code that creates an `Actor` will always assign it a `rigidBody`.
That's its representation in the physics simulation.
Every actor also gets an `Appearance` component, which the graphics engine uses to display the actor.
Optionally, actors get `Behavior` and `Movement` components, which can be thought of as their part of the script, and the rules for how they move in the world.
Once you get used to thinking about games like this, it becomes intuitive.

In this chapter, we'll explore these two mental models of a game, and then see how they take form in four simple games.
Then you'll build Firefly Jar, a small game where you race around a garden at night, catching fireflies before the sun comes up.
Across these five games, you'll build quite a bit of the foundation on which many kinds of games can be built.
