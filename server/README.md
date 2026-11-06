# Server-Backed Persistence: the server

This is a small Node.js and Express server for the "Server-Backed Persistence" chapter, where Crate Cove gets accounts and a leaderboard.
It serves the game, logs players in, keeps each player's best turns for each level in a SQLite database, and checks every score that it's given.
Everything runs on your own computer.

## Run it

```sh
npm install
npm start
```

`npm start` bundles `../ledger_game.ts` into `../ledger_game.js`, and starts the server.
Open <http://localhost:3000> in a browser.
(It needs Node 22.9 or newer, for `node:sqlite` and `--env-file-if-exists`.
Node prints an "experimental" warning for `node:sqlite`, which is expected.)

To build a different file, such as one of the milestones, change the name in `package.json`'s `build` script, and in `server.js`'s `express.static` line.

## Two kinds of login

With no Google credentials, the server uses a *pretend* login page at `/auth/pretend`, where you type a name, and it believes you.
That's for building and testing, and it must never be on the internet.

For real logins, make a `.env` file, from `.env.example`, with a Google client ID and secret.
The chapter's "Try This: Logging In With Google" sidebar has the steps.
The pretend login is switched off when credentials are present.

## What to look at

- `server.js` is the whole server: the login routes, the session cookie (a random token, mapped to a user, kept in memory: it doesn't survive a restart), and the `users` and `bests` tables (which do).
- `ledger.db` is created on first run.
  Inspect it with `sqlite3 ledger.db "select * from bests"`, and delete it to start over.
- `PARS` in `server.js` is a copy of each level's `par` in the game.
  The server refuses a score that is better than par.
  If you add a level, add its par to both.
