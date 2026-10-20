# What Is a Simulation?

JetLag organizes everything around the metaphor of a theater production.
There's a **stage**, where all the action happens.
It's the place where some fictional "world" comes to life.
On that stage are **actors**: the things that make the game fun to play, the same way actors make a play entertaining to watch.
There are usually some props, too, but the line between an actor and a prop turns out to be pretty blurry, so JetLag just calls everything an actor.

Each level of your game is like an act or scene of the play.
When a level starts, some actors are pre-positioned on the stage, already doing whatever the script says they should do.
Then events happen, which drive the action forward.

In a play, you take for granted that the laws of nature apply.
People can't fly around stage without wires.
Whispers can't be heard in the back of the theater without microphones and speakers.
Similarly, in a game, the physics simulator sets up the "laws of nature."
Every actor is bound by the laws of the physics simulator at all times.
If an actor is configured to be stationary, it won't move.
If it's configured to fall from the sky, subject to some gravitational force, that's exactly what it will do.

If that's all there were, the game wouldn't be very fun.
It would play out the exact same way every time, ignoring whatever the person playing it is trying to do.
**Events** are how you interrupt the simulation and change it.
When an event happens, you (as the programmer) have the ability to provide code that runs *instead of* or *in addition to* what the physics simulator says should happen.

JetLag has four kinds of events:

- **Collisions**: When two actors touch, that's a chance to run code
- **Timers**: You can ask for some code to run after some time passes
- **User input**: You can run code in response to taps, clicks, keyboard presses, and other gestures
- **Network input**: You can run code in response to network messages, such as updates from other players in a multiplayer game

The code you write, which runs in response to an event, is sometimes called a "script", an "event handler", or a "callback".
It's OK to use these names interchangeably.
They all mean the same thing: code that changes the state of the physics simulation in response to an event.

There's a surprising consequence to this way of thinking.
A game is nothing more than a physics simulation you can interact with.
The player is just an audience member who gets to change what happens in the play.
