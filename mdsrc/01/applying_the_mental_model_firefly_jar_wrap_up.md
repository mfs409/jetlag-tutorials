# Wrap-Up

You just built a real game.
It has a hero, a solid garden, fireflies that come and go, a score, a clock, a jar, a way to win, a way to lose, and a way to play again.
Every one of those pieces is just an `appearance` plus a `rigidBody`, sometimes with a `behaviors` component that tells the engine what kind of thing it is, and sometimes with a timer that makes something happen later.
You also broke it on purpose, so a compile-time error and a missing-asset error will look familiar the next time you see one by accident.

Just as important, you built it in the right order.
First you figured out the game mechanics, without thinking about the visuals.
Then you made it fun, by playing it and changing numbers.
Only then did you make it look good, and you did that without changing how it plays.
You'll build every game in this book that way.

Now that the game is built, it's time to revisit the question from earlier: **how would you change this game to make it more fun, or more interesting?**
Maybe you'd move the hedges around to make a better shortcut into the jar's corner of the garden.
Maybe you'd add a third kind of firefly, one that drifts slowly across the garden.
Maybe fireflies should be worth more as dawn gets closer.
Pick one change and make it, in gray if it needs new actors, and then play it until it feels right.
Unlike the four games in that section, this is code you understand pretty well, so there's nothing stopping you.
