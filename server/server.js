// A small Node.js server for the "Server-Backed Persistence" chapter.
//
// It does four things:
//   1. Serves the built game (ledger_game.html and ledger_game.js) and
//      the shared tutorial assets, so everything is one `npm start` away.
//   2. Logs players in.  With Google credentials, it does a real OAuth 2.0
//      authorization-code flow.  Without them, it offers a pretend login page,
//      so you can build and test the game before you have a Google account
//      set up.  The rest of the server can't tell the difference.
//   3. Keeps each player's best turn count for each level, in SQLite.
//   4. Checks every score that arrives, because a server must never believe a game.
//
// See README.md for how to run it, and how to get Google credentials.

import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;
const REAL_LOGIN = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

if (!REAL_LOGIN) {
  console.warn(
    "NOTE: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set (see .env.example).\n" +
    "      Using the PRETEND login page, where anybody can be anybody.\n" +
    "      That's fine on your own computer, and nowhere else."
  );
}

// ANCHOR: pars
/**
 * The fewest turns that each level can be won in (the game's `par`).  A
 * solver found these, so no honest player can do better.  The server uses
 * them to spot scores that can't be real.
 */
const PARS = [19, 27, 44, 37];
// ANCHOR_END: pars

// --- Persistent storage: SQLite -------------------------------------------
//
// These tables live in a file on disk (ledger.db), and survive restarts,
// unlike the sessions below.
// ANCHOR: tables
const db = new DatabaseSync(path.join(__dirname, "ledger.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    sub TEXT PRIMARY KEY,
    email TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS bests (
    sub TEXT NOT NULL REFERENCES users(sub),
    level INTEGER NOT NULL,
    moves INTEGER NOT NULL,
    PRIMARY KEY (sub, level)
  );
`);
// ANCHOR_END: tables

/** Insert a user if we haven't seen them, or update their name and email if we have */
function upsertUser(sub, email, name) {
  db.prepare(`
    INSERT INTO users (sub, email, name) VALUES (?, ?, ?)
    ON CONFLICT(sub) DO UPDATE SET email = excluded.email, name = excluded.name
  `).run(sub, email, name);
}

// ANCHOR: record_best
/**
 * Is this a score that could really have happened?  A level has to exist,
 * and the turns have to be a whole number that is no less than par.
 */
const validLevel = (level) => Number.isInteger(level) && level >= 1 && level <= PARS.length;
function plausible(level, moves) {
  return validLevel(level)
    && Number.isInteger(moves) && moves >= PARS[level - 1] && moves <= 100000;
}

/** Keep a score, but only if it beats the player's previous best.  Fewer turns is better. */
function recordBest(sub, level, moves) {
  db.prepare(`
    INSERT INTO bests (sub, level, moves) VALUES (?, ?, ?)
    ON CONFLICT(sub, level) DO UPDATE SET moves = MIN(moves, excluded.moves)
  `).run(sub, level, moves);
}
// ANCHOR_END: record_best

/** Everything that a player has done, as { level: moves } */
function bestsOf(sub) {
  const out = {};
  for (const row of db.prepare("SELECT level, moves FROM bests WHERE sub = ?").all(sub)) out[row.level] = row.moves;
  return out;
}

/** The five fastest players of one level, with each player's display name */
function leaderboard(level) {
  return db.prepare(`
    SELECT users.name AS name, bests.moves AS moves
    FROM bests JOIN users ON users.sub = bests.sub
    WHERE bests.level = ?
    ORDER BY bests.moves ASC, users.name ASC
    LIMIT 5
  `).all(level);
}

// --- Ephemeral storage: sessions and OAuth state --------------------------
//
// These don't need to survive a restart, so a plain Map is fine.  (A real
// server would keep sessions somewhere shared, like a database or Redis.)
// ANCHOR: sessions
const sessions = new Map(); // session token -> { sub, email, name }
const pendingStates = new Set(); // one-time numbers, to protect the OAuth redirect

function parseCookies(header) {
  const out = {};
  for (const part of (header || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq == -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function getSession(req) {
  const token = parseCookies(req.headers.cookie).session;
  return token ? sessions.get(token) : undefined;
}

/** Start a session for a player who has proven who they are, and send them back to the game */
function startSession(res, user) {
  upsertUser(user.sub, user.email, user.name);
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, user);
  // HttpOnly: the game's own code can't read the cookie.  The browser attaches it for us.
  res.setHeader("Set-Cookie", `session=${token}; HttpOnly; Path=/; SameSite=Lax`);
  res.redirect("/");
}
// ANCHOR_END: sessions

// --- The app ----------------------------------------------------------------
const app = express();
app.use(express.json());

// The game, at "/", and the shared tutorial assets, at "/assets".  Because the
// game comes from this same server, its requests have the same origin as the
// page, and there's no CORS to set up.
app.use(express.static(path.join(__dirname, ".."), { index: "ledger_game.html" }));
app.use("/assets", express.static(path.join(__dirname, "../../assets")));
app.get("/demo.css", (_req, res) => res.sendFile(path.join(__dirname, "../../../assets-web/demo.css")));

// --- Logging in ---------------------------------------------------------------
// ANCHOR: login_routes
// Step 1: send the player to log in.  The game links here.
app.get("/auth/google", (_req, res) => {
  if (!REAL_LOGIN) return res.redirect("/auth/pretend");
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 5 * 60 * 1000);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Google sends the player back here, with a one-time code
app.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!REAL_LOGIN || !state || !pendingStates.has(state)) {
    return res.status(400).send("Invalid or expired login attempt.  Go back and try again.");
  }
  pendingStates.delete(state);
  try {
    // Step 3: trade the code (and our secret) for an access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson.error_description || "Token exchange failed");
    // Step 4: use the token to ask Google who just logged in
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = await userRes.json();
    if (!userRes.ok) throw new Error("Couldn't fetch the user's profile");
    startSession(res, { sub: `google:${profile.sub}`, email: profile.email, name: profile.name });
  } catch (err) {
    console.error("OAuth callback failed:", err);
    res.status(500).send("Login failed.  Check the server's log, and your .env credentials.");
  }
});
// ANCHOR_END: login_routes

// ANCHOR: pretend_login
// The pretend login: a form that asks for a name, and believes the answer.
// It only exists when there are no Google credentials.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
app.get("/auth/pretend", (_req, res) => {
  if (REAL_LOGIN) return res.sendStatus(404);
  res.send(`<!doctype html><meta charset="utf-8"><title>Pretend login</title>
    <body style="font-family:sans-serif;max-width:30em;margin:3em auto">
    <h1>Pretend login</h1>
    <p>This stands in for "Log in with Google" until you've set that up.
    Anybody can be anybody here, so it must never be used on the internet.</p>
    <form method="post" action="/auth/pretend">
      <input name="name" value="Pirate" maxlength="30" autofocus>
      <button>Log in</button>
    </form>`);
});
app.post("/auth/pretend", express.urlencoded({ extended: false }), (req, res) => {
  if (REAL_LOGIN) return res.sendStatus(404);
  const name = String(req.body?.name ?? "").trim().slice(0, 30) || "Pirate";
  startSession(res, { sub: `pretend:${name}`, email: "", name });
});
// ANCHOR_END: pretend_login

// --- The API --------------------------------------------------------------------
// Who's logged in right now?
app.get("/api/me", (req, res) => {
  const session = getSession(req);
  if (!session) return res.sendStatus(401);
  res.json({ name: session.name });
});

app.post("/api/logout", (req, res) => {
  const token = parseCookies(req.headers.cookie).session;
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0");
  res.sendStatus(204);
});

// ANCHOR: score_route
// A player finished a level.  Who they are comes from the session cookie, and
// never from anything that the game says.
app.post("/api/score", (req, res) => {
  const session = getSession(req);
  if (!session) return res.sendStatus(401);
  const { level, moves } = req.body ?? {};
  if (!plausible(level, moves)) return res.status(400).send("That score is not possible");
  recordBest(session.sub, level, moves);
  res.json(bestsOf(session.sub));
});
// ANCHOR_END: score_route

// ANCHOR: sync_route
// A player just logged in, and the game has scores from before.  Merge them
// into the account, and answer with the merged result.
app.post("/api/sync", (req, res) => {
  const session = getSession(req);
  if (!session) return res.sendStatus(401);
  for (const [level, moves] of Object.entries(req.body?.bests ?? {})) {
    // A score that is not possible is skipped, and the rest are still kept
    if (plausible(Number(level), moves)) recordBest(session.sub, Number(level), moves);
  }
  res.json(bestsOf(session.sub));
});
// ANCHOR_END: sync_route

// The leaderboard is public, so it needs no login
app.get("/api/leaderboard/:level", (req, res) => {
  const level = Number(req.params.level);
  if (!validLevel(level)) return res.status(400).send("No such level");
  res.json(leaderboard(level));
});

app.listen(PORT, () => {
  console.log(`Pirate's Ledger is running at http://localhost:${PORT}`);
});
