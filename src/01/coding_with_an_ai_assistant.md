## A Quick Note About AI

You're almost certainly going to use AI coding assistants while you work through this book.
I've provided an `AGENTS.md` file to help your AI coding assistant understand how JetLag games are written, and where to find this book and the documentation.
Below, you'll find some suggestions about how to use AI coding assistants well.
Of course, these tools are developing rapidly.
My advice might not be accurate by the time you read this book, but I'll do my best to keep this page updated.

## Humans Do The Design

The most important point is this:
If you want your game to be any good, then the game concept and the core design should be yours.
Otherwise, your game is going to feel like slop.
It's possible to start with slop and prompt your way to something decent, but it's a lot easier to start with a clever idea, and then employ agents to help bring that idea to life.

This is just a fact of life.
When you start a project by asking an agent to spit out 10,000 lines of a first prototype game, inertia kicks in.
There's too much code for you to review.
The ideas look "good enough".
You settle for what is, instead of what could be.

If, on the other hand, you start with your own design, and then employ agents to build the game slowly and incrementally, you can maintain quality throughout the process.
You might only be 20 times faster with agents this way, instead of being 40 times faster by trying to let the agents do all the work.
However, in the end, your game will be 10 times better.
The math favors you *designing* everything yourself.

## Language Models Reward Good Vocabulary

You should not ask agents to do any of the chapters of this book for you, and you should not just copy/paste files from the book into your repository unless otherwise instructed.
Instead, you should type things out yourself, at least for the most part.
This isn't because there is virtue in suffering.
It's because the reason you're reading this book is to learn.
Learning involves building up knowledge.
Knowledge of a field is built on a working vocabulary in that field.

As you build up your knowledge and vocabulary about games, you will be able to use agents more effectively, and you'll be able to do new and creative things.
Consider this prompt:

> Make a rodeo game where the character rides on pets.

How is that going to work?
Is it a side view or a top view?
What are the odds it's going to come out the way you want?

Now consider this prompt:

> I want to make a rodeo game where the character rides on pets.
> Let's make a mini-game first, where we can work out the mechanics of the game.
> I'm thinking that the pet will be represented by four polygon bodies that are connected with bounded revolute joints: torso, head, front leg, back leg.
> The legs won't be load-bearing, but they will be articulated to give a motion effect.
> I want the torso to be connected to two invisible wheels (unbounded revolute joints) so that the pet can "roll" back and forth, with the leg motion making it look like walking.
> The rider should be a rag doll, but a side-view, because this is a side-view game with gravity pulling downward.
> One of the rider's hands should weld to the neck of the pet, and the other should fly up in the air.
> Once we get the rider and pet looking OK, we're going to need to work out the bucking action.
> I am wondering about using a prismatic joint for that, or else maybe having a timer and an impulse on the front of the pet.
> Let's prototype it both ways, using two builders.

It's not just that the second prompt is longer, it's also more precise.
It uses the vocabulary of JetLag and Box2D to mention joints and shapes.
It specifies gravity and camera view.
It bounds the agent's work, so the agent can be more efficient, and also more likely to be correct.

## You Must Read The Code

An assistant will happily write 10,000 lines of code for you.
You'll probably want to instruct it to write incrementally, only 50-100 lines (one to three functions) at a time.
Some of the code it writes will be exactly correct.
Some won't.

The only way to know which lines are which is to read them.
Reading code is the skill that everything else rests on.
If you can't read what an assistant gave you, you can't tell whether it's right, you can't fix it when it isn't, and you can't ask a better question the next time.

## Most Of The Work Is In Making It Fun

Think back to tuning Firefly Jar.
The code for "a firefly appears every so often and disappears a few seconds later" took a few minutes to write.
Deciding that "every so often" means 1.3 seconds, and that "a few seconds" means 4, is the part that decides whether the game is any good.
No assistant can find those numbers for you, because finding them means playing the game and noticing how it feels.
AI can suggest a starting point, and it can make the change once you've decided what you want.
But the loop of play, notice, adjust, and play again is yours.
In most games, that loop is where the majority of the time goes, and where all of the quality comes from.
Often, fine-tuning the numbers is easier and quicker for you than for the agent, so you'll really be "in the loop" as you do this.

## Gameplay And Graphics Must Be Designed Together

Firefly Jar went from labeled gray shapes to colorful shapes.
That order wasn't an accident: gray boxes are fast to change, so they're the right way to find out whether a game is fun.
But it would be a mistake to take that as "art is an afterthought."

There's a failure on each side.
On one side is the game with beautiful art that doesn't support good gameplay: characters too big for the spaces they have to fit through, enemies that blend into the background, an attack you can't see coming.
On the other side is the game with perfect gameplay that looks awful once someone adds art to it after the fact, because nothing about the game was designed with the look in mind.
Good games live in between, with the gameplay and the graphics shaping each other as you go.

An assistant can wire art into your game, but you shouldn't trust it to make your final artwork.
It can't know how the art and the gameplay should fit together, because that's a design decision, and it depends on what you want playing your game to feel like.

## Don't Waste Time On Boilerplate

Now for what assistants are good at.
The arrow-key handlers in Firefly Jar are boilerplate: code that has to exist, follows an obvious pattern, and teaches you nothing new after the first time you write it.
Games have a lot of boilerplate.
Once you understand what a piece of boilerplate does (and you should always understand it first), there's no virtue in typing it out by hand.
Let the assistant write it, read what it wrote, and spend your time on the parts that make your game yours.

## Keep The Code Clean

Games grow.
A game that's easy to change is a game you'll keep improving, and a game that's hard to change is one you'll give up on.
The code should follow good practices: small helper functions with clear names instead of copy-pasted blocks, level layouts and other tables written as data instead of long runs of code, and a builder you can read from top to bottom.
You'll see all of these throughout this book.
Your AI coding agent will see all of these when it reads the book, too.

Assistants can help with this.
Ask for tidy code, and read the result with an eye toward whether you'd be comfortable changing it after three weeks and a hundred prompts transpire.
A common phrase to use in a prompt is "refactor for maintainability".
Another is "identify redundancies and move them to helper functions".
But remember: after the change, you'll need to read the new code, and test the game again.

## The Assistant Understands JetLag Pretty Well

Finally, don't underestimate how well an assistant can understand JetLag.
The engine is open source, it's small, and it's written to be read.
This book and JetLag's documentation are online, too.
An assistant that reads them can explain JetLag code, find the right behavior or movement for what you're trying to do, and track down a bug.
Agents can even run headless browser instances, capture screenshots, send keys, and test if puzzles are solvable.

When you created your project, you received a file called `AGENTS.md`.
It tells assistants where to find the book, the documentation, and the engine source.
It also gives some advice: keep changes small, don't invent APIs, explain what changed, and treat numbers that decide how the game feels as the programmer's decision.
Most assistants read it automatically.
Read it yourself, too: it's a short summary of how the rest of this book expects you to work.

## Try It

Open your copy of Firefly Jar in an editor with an assistant, and try three things.

First, ask the assistant to explain how a firefly flickers before it disappears.
Check its explanation against the code: is it right about which timer does what?

Second, ask it to add something small, like a second kind of firefly that moves slowly across the garden.
Read the change before you run it.
Is there anything you don't understand?
Is there anything that's wrong?

Third, ask it to make the game "more fun."
See what it changes.
Then play both versions, and decide for yourself whether it worked, and why or why not.
That last question is one that only you can answer.
