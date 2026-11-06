import { Actor, BoxBody, CircleBody, CollectableBehavior, DebugToggle, FilledBox, FilledCircle, FilledPolygon, initializeAndLaunch, JetLagGameConfig, KeyCodes, PlayerControlBehavior, SolidBehavior, SessionValue, stage, TextSprite, TimedEvent } from "jetlag2d";
import { endScreen, required } from "../common/common";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

// ANCHOR: config
/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
  };
}
// ANCHOR_END: config

/**
 * Cove Rush: two or more pirates race around a cove, grabbing coins.  Everyone
 * sees the same coins, in the same places, and the first to collect seven wins.
 *
 * One player hosts a game, and gets a room code.  The others join with it.
 * Arrow keys (or WASD) move your pirate.  A server (the `multiplayer-server`
 * folder) passes messages among everyone in a room, and that's all it does.
 */

// ---------------------------------------------------------------------------
// What gets sent, and what is known
// ---------------------------------------------------------------------------

// ANCHOR: msg_type
/**
 * The messages that players send to each other, through the server.  Each
 * has a `t` that says what kind it is.  The server doesn't look inside them.
 */
type Msg =
  | { t: "pos"; id: string; x: number; y: number }
  | { t: "take"; id: string; coin: number };
// ANCHOR_END: msg_type

// ANCHOR: net_type
/** Another player, as far as we know */
interface Peer { id: string; name: string; x: number; y: number; seen: boolean }

/**
 * Everything that's known about the game that's being played over the
 * network.  It's kept in session storage.  The network handlers write to
 * it, and the screen reads from it.  They never touch each other.
 */
interface Net {
  /** Who we are */
  me: { id: string; name: string };
  /** The room that we're in, or nothing if we haven't got there yet */
  room?: string;
  /** Everyone else in the room */
  peers: Map<string, Peer>;
  /** What to tell the player about how it's going */
  status: string;
  /** The coins that have been taken, and the score of each player (by id) */
  taken: Set<number>;
  scores: Map<string, number>;
  /** Who has won, if anyone has */
  winner?: string;
}
// ANCHOR_END: net_type

// ANCHOR: coin_consts
/** How many coins there are, and how many it takes to win */
const COINS = 14, TARGET = 7;
// ANCHOR_END: coin_consts
/** The colors that players are given, in the order that they arrive */
const COLORS = ["#e0463c", "#3c7de0", "#3cbf6a", "#e0b83c", "#9b5de5"];

// ANCHOR: net_access
/** What's known about the network game, in session storage.  There is none until we try to connect, and `leave` forgets it. */
const NET = new SessionValue<Net | undefined>("net", () => undefined);

/** What to tell the player in the lobby about how the last try went */
const LOBBY_STATUS = new SessionValue<string>("lobbyStatus", () => "");

/** The server address that was last asked for */
const ADDRESS = new SessionValue<string>("address", () => "localhost:3000");

// ANCHOR: seed_of
/**
 * Turn a room's name into a number, so that every player in the room gets
 * the same one.  This is a simple hash: it mixes in each letter.
 *
 * @param room The room's name
 */
const seedOf = (room: string) => [...room].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
// ANCHOR_END: seed_of
// ANCHOR_END: net_access

// ANCHOR: name_list
/**
 * Everyone in the game, in a fixed order, so that everyone gets the same color for the same player
 *
 * @param n The network game
 */
const everyone = (n: Net) => [{ id: n.me.id, name: n.me.name }, ...[...n.peers.values()].map(p => ({ id: p.id, name: p.name }))].sort((a, b) => (a.id < b.id ? -1 : 1));
// ANCHOR: color_of
/**
 * The color of a player
 *
 * @param n  The network game
 * @param id The player's id
 */
const colorOf = (n: Net, id: string) => COLORS[Math.max(0, everyone(n).findIndex(p => p.id == id)) % COLORS.length];
// ANCHOR_END: color_of
// ANCHOR_END: name_list

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

// ANCHOR: leave_fn
/**
 * Leave the game: say goodbye to the server, forget everything, and go back to the lobby
 *
 * @param why What to tell the player in the lobby
 */
function leave(why = "") {
  // Forget the handlers first, so that disconnecting doesn't call one of them
  stage.network.reset();
  stage.network.disconnect();
  NET.clear();
  LOBBY_STATUS.set(why);
  stage.switchTo(builder);
}
// ANCHOR_END: leave_fn

// ANCHOR: connect_fn
/**
 * Connect to the server, log in, and then make a room, or join one.  This is
 * a state machine, and the server's answers are what move it along:
 * connected, then logged in, then created or joined.
 *
 * @param address The server's address
 * @param name    What the player calls themselves
 * @param room    The room to join, or nothing, to make a new one
 */
function connect(address: string, name: string, room?: string) {
  // Anyone can say that they're anyone, so the id is made up.  A real game would use a real login.
  const me = { id: `p${Date.now().toString(36)}${stage.random.nextInt(1000)}`, name: name.replace(/,/g, " ") };
  const n: Net = { me, peers: new Map(), status: "Connecting...", taken: new Set(), scores: new Map(), };
  NET.set(n);
  LOBBY_STATUS.set("Connecting...");

  // Every answer that the server can give has a handler.  The ones that we
  // don't expect are all handled the same way: leave, and say what happened.
  const trouble = (msg: string) => leave(`Trouble: ${msg}`);
  stage.network.onDisconnected = () => leave("Lost the connection to the server.");
  stage.network.onErrHasUser = trouble; stage.network.onErrNoUser = trouble; stage.network.onErrHasRoom = trouble;
  stage.network.onErrNoRoom = () => leave("There is no room with that code.");
  stage.network.onErrFormat = trouble; stage.network.onErrUserTaken = trouble; stage.network.onLoggedOut = trouble;

  // ANCHOR: login_steps
  // Step 1: connected, so log in.  Step 2: logged in, so make or join a room.
  stage.network.onConnected = () => stage.network.requestLogin(me.id, me.name);
  stage.network.onLoggedIn = () => (room ? stage.network.requestJoin(room) : stage.network.requestCreate());
  // ANCHOR_END: login_steps
  // ANCHOR: room_steps
  // Step 3: in a room.  Remember the room, and go to the cove.
  stage.network.onCreated = (msg: string) => { n.room = JSON.parse(msg).roomId; stage.switchTo(builder); };
  stage.network.onJoined = (msg: string) => {
    const m = JSON.parse(msg);
    n.room = m.roomId;
    // Everyone who is already in the room
    for (const p of m.peers) n.peers.set(p.id, { id: p.id, name: p.name, x: -5, y: -5, seen: false });
    stage.switchTo(builder);
  };
  // ANCHOR_END: room_steps
  // ANCHOR: peer_events
  stage.network.onUserJoined = (msg: string) => { const m = JSON.parse(msg); n.peers.set(m.userId, { id: m.userId, name: m.userName, x: -5, y: -5, seen: false }); };
  stage.network.onUserLeft = (msg: string) => { n.peers.delete(JSON.parse(msg).userId); };
  // ANCHOR_END: peer_events
  // ANCHOR: broadcast_in
  // Everything that other players do arrives here.  It only changes what's known.
  stage.network.onBroadcast = (raw: string) => {
    const m: Msg = JSON.parse(JSON.parse(raw).msg);
    // ANCHOR: pos_in
    if (m.t == "pos") {
      const p = n.peers.get(m.id);
      if (p) { p.x = m.x; p.y = m.y; p.seen = true; }
    }
    // ANCHOR_END: pos_in
    // ANCHOR: take_in
    if (m.t == "take") take(n, m.id, m.coin);
    // ANCHOR_END: take_in
  };
  // ANCHOR_END: broadcast_in
  stage.network.connect(address);
}
// ANCHOR_END: connect_fn

// ANCHOR: take_fn
/**
 * Somebody took a coin.  It's counted, once.  If two players took the same
 * coin at nearly the same moment, then whichever message arrives first wins,
 * and the second is ignored.
 *
 * @param n    The network game
 * @param id   Who took it
 * @param coin Which coin
 */
function take(n: Net, id: string, coin: number) {
  if (n.taken.has(coin)) return;
  n.taken.add(coin);
  const score = (n.scores.get(id) ?? 0) + 1;
  n.scores.set(id, score);
  // ANCHOR: win_rule
  if (score >= TARGET && !n.winner) n.winner = id;
  // ANCHOR_END: win_rule
}
// ANCHOR_END: take_fn

// ANCHOR: send_fn
/**
 * Send a message to everyone else in the room
 *
 * @param m The message
 */
const send = (m: Msg) => stage.network.sendBroadcast(JSON.stringify(m));
// ANCHOR_END: send_fn

// ---------------------------------------------------------------------------
// The screens
// ---------------------------------------------------------------------------

// ANCHOR: pirate_look
/**
 * A pirate, drawn from shapes
 *
 * @param color The HTML hex color of the bandana
 */
const pirateLook = (color: string) => [
  new FilledCircle({ radius: 0.36, fillColor: "#f2cf9b", lineWidth: 0.05, lineColor: "#6b4a2b", z: 1 }),
  new FilledPolygon({ vertices: [{ x: -0.38, y: 0.02 }, { x: 0.38, y: 0.02 }, { x: 0.3, y: -0.3 }, { x: 0, y: -0.42 }, { x: -0.3, y: -0.3 }], fillColor: color, lineWidth: 0.04, lineColor: "#222222", offset: { dx: 0, dy: -0.12 }, z: 2 }),
  new FilledCircle({ radius: 0.05, fillColor: "#222222", offset: { dx: 0.12, dy: 0.1 }, z: 2 }),
];
// ANCHOR_END: pirate_look

/** Build either the lobby, or the cove, depending on whether there's a room yet */
function builder() {
  DebugToggle.enable();
  const n = NET.get();
  stage.backgroundColor = "#7ec8e3";
  if (!n || !n.room) return lobby();
  cove(n);
}

// ANCHOR: lobby
/** The lobby: a way to host a game, or join one */
function lobby() {
  const text = (y: number, size: number, t: string | (() => string), color = "#1d3b57") => new Actor({
    appearance: new TextSprite({ center: true, face: "Roboto Black", size, color }, t),
    rigidBody: new BoxBody({ cx: 8, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  const button = (y: number, label: string, action: () => void) => new Actor({
    appearance: [new FilledBox({ width: 5.2, height: 1, fillColor: "#e07a2b", lineWidth: 0.05, lineColor: "#8a4a12" }), new TextSprite({ center: true, face: "Roboto Black", size: 26, color: "#ffffff" }, label)],
    rigidBody: new BoxBody({ cx: 8, cy: y, width: 5.2, height: 1 }, { scene: stage.hud, collisionsEnabled: false }),
    gestures: { onTap: () => { action(); return true; } },
  });
  text(2.2, 72, "COVE RUSH");
  text(3.4, 26, "A race for coins, with friends");
  // The status says how the last try went, such as why a connection was lost
  text(4.4, 22, () => LOBBY_STATUS.get(), "#8a2f2f");
  // ANCHOR: lobby_buttons
  // The simplest way to ask a question is a browser prompt.  A real game would draw its own.
  const ask = () => {
    const address = window.prompt("Server address:", ADDRESS.get());
    if (address == null) return undefined;
    ADDRESS.set(address);
    const name = window.prompt("Your name:", "Pirate") ?? "Pirate";
    return { address, name: name.trim() || "Pirate" };
  };
  button(5.8, "Host a game", () => { const a = ask(); if (a) connect(a.address, a.name); });
  button(7.1, "Join a game", () => {
    const a = ask();
    if (!a) return;
    const room = window.prompt("Room code:");
    if (room) connect(a.address, a.name, room.trim());
  });
  // ANCHOR_END: lobby_buttons
}
// ANCHOR_END: lobby

// ANCHOR: cove
/**
 * The cove, where the game is played
 *
 * @param n What's known about the network game
 */
function cove(n: Net) {
  const room = required(n.room, "the room that we're in");
  new Actor({ appearance: new FilledBox({ width: 16, height: 9, fillColor: "#f0dca4", z: -3 }), rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { collisionsEnabled: false }) });
  // Invisible walls around the cove
  const borders = [{ l: -1, t: -1, r: 17, b: 0 }, { l: -1, t: 9, r: 17, b: 10 }, { l: -1, t: 0, r: 0, b: 9 }, { l: 16, t: 0, r: 17, b: 9 }];
  for (const border of borders) {
    new Actor({ appearance: new FilledBox({ width: border.r - border.l, height: border.b - border.t, fillColor: "#00000000" }), rigidBody: new BoxBody({ cx: (border.l + border.r) / 2, cy: (border.t + border.b) / 2, width: border.r - border.l, height: border.b - border.t }), behaviors: new SolidBehavior() });
  }

  // ANCHOR: coin_layout
  // Every player gets the same coins, because every player starts from the
  // same seed, which comes from the room's name.  Nobody has to be told where
  // the coins are.
  stage.random.reseed(seedOf(room));
  const spots: [number, number][] = [];
  for (let i = 0; i < COINS; i++) spots.push([stage.random.nextRange(1, 15), stage.random.nextRange(1.8, 8.2)]);
  // ANCHOR_END: coin_layout
  // ANCHOR: coin_actors
  const coins = spots.map(([x, y], i) => new Actor({
    appearance: [new FilledCircle({ radius: 0.25, fillColor: "#ffd23f", lineWidth: 0.05, lineColor: "#a67c10", z: 1 }), new FilledCircle({ radius: 0.1, fillColor: "#fff1a8", z: 1 })],
    rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.25 }),
    behaviors: new CollectableBehavior({
      onCollect: () => {
        // We took a coin: count it, and tell everyone else
        take(n, n.me.id, i);
        send({ t: "take", id: n.me.id, coin: i });
        return true;
      },
    }),
  }));
  // ANCHOR_END: coin_actors

  // ANCHOR: my_pirate
  const me = new Actor({
    appearance: pirateLook(colorOf(n, n.me.id)),
    rigidBody: new CircleBody({ cx: 2 + 2 * everyone(n).findIndex(p => p.id == n.me.id), cy: 7.5, radius: 0.36 }, { dynamic: true, disableRotation: true }),
    behaviors: new PlayerControlBehavior(),
  });
  const held = { l: false, r: false, u: false, d: false };
  const bind = (keys: KeyCodes[], k: keyof typeof held) => {
    stage.keyboard.setKeyDownHandler(keys, () => (held[k] = true));
    stage.keyboard.setKeyUpHandler(keys, () => (held[k] = false));
  };
  bind([KeyCodes.KEY_LEFT, KeyCodes.KEY_A], "l"); bind([KeyCodes.KEY_RIGHT, KeyCodes.KEY_D], "r");
  bind([KeyCodes.KEY_UP, KeyCodes.KEY_W], "u"); bind([KeyCodes.KEY_DOWN, KeyCodes.KEY_S], "d");
  stage.world.repeatEvents.push(() => {
    if (n.winner) { me.rigidBody.setVelocity(0, 0); return; }
    const dx = (held.r ? 1 : 0) - (held.l ? 1 : 0), dy = (held.d ? 1 : 0) - (held.u ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    me.rigidBody.setVelocity(dx / len * 4.5, dy / len * 4.5);
  });
  // ANCHOR_END: my_pirate

  // ANCHOR: send_position
  // Tell everyone else where we are, twenty times a second
  stage.world.timer.addEvent(new TimedEvent(0.05, true, () => {
    const c = me.rigidBody.getCenter();
    send({ t: "pos", id: n.me.id, x: c.x, y: c.y });
  }));
  // ANCHOR_END: send_position

  // ANCHOR: peer_actors
  // The other players are actors with no behaviors at all, which the network moves.  Each is made the first time that its player is seen.
  const shown = new Map<string, Actor>();
  stage.world.repeatEvents.push(() => {
    for (const p of n.peers.values()) {
      let a = shown.get(p.id);
      if (!a && p.seen) {
        a = new Actor({
          appearance: [...pirateLook(colorOf(n, p.id)), new TextSprite({ center: true, face: "Arimo Regular", size: 16, color: "#222222", strokeColor: "#ffffff", strokeWidth: 3, offset: { dx: 0, dy: -0.75 } }, p.name)],
          rigidBody: new CircleBody({ cx: p.x, cy: p.y, radius: 0.36 }, { kinematic: true, collisionsEnabled: false }),
        });
        shown.set(p.id, a);
      }
      a?.rigidBody.setCenter(p.x, p.y);
    }
    // Players who have left take their actors with them
    for (const id of shown.keys()) if (!n.peers.has(id)) { required(shown.get(id), `the actor for player ${id}`).remove(); shown.delete(id); }
  });
  // ANCHOR_END: peer_actors

  // ANCHOR: coins_sync
  // A coin that anyone has taken is gone from everyone's screen
  stage.world.repeatEvents.push(() => { coins.forEach((c, i) => { if (n.taken.has(i) && c.enabled) c.remove(); }); });
  // ANCHOR_END: coins_sync

  // ANCHOR: hud_fn
  const hud = (x: number, y: number, size: number, color: string, t: () => string) => new Actor({
    appearance: new TextSprite({ center: false, face: "Roboto Black", size, color, strokeColor: "#000000", strokeWidth: 3 }, t),
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.1, height: 0.1 }, { scene: stage.hud }),
  });
  hud(0.3, 0.1, 22, "#ffffff", () => `Room ${room}   First to ${TARGET} coins wins`);
  // ANCHOR_END: hud_fn
  // ANCHOR: scoreboard
  hud(0.3, 0.55, 22, "#ffffff", () => everyone(n).map(p => `${p.name}: ${n.scores.get(p.id) ?? 0}`).join("     "));
  // ANCHOR_END: scoreboard

  // ANCHOR: finish
  // When someone wins, the game is over for everyone, and everyone can go back to the lobby
  let shownEnd = false;
  stage.world.repeatEvents.push(() => {
    if (!n.winner || shownEnd) return;
    shownEnd = true;
    const name = everyone(n).find(p => p.id == n.winner)?.name ?? "Somebody";
    stage.requestOverlay((overlay) => endScreen(overlay, {
      title: n.winner == n.me.id ? "You win!" : `${name} wins!`,
      prompt: "Click or press Enter to go back to the lobby",
      next: () => leave(""),
      background: "#0d2a3fdd", titleColor: n.winner == n.me.id ? "#ffd23f" : "#9fd0ff",
    }), false);
  });
  // ANCHOR_END: finish

  // ANCHOR: leave_button
  new Actor({
    appearance: [new FilledBox({ width: 1.8, height: 0.6, fillColor: "#8a2f2f", lineWidth: 0.04, lineColor: "#ffffff" }), new TextSprite({ center: true, face: "Roboto Black", size: 18, color: "#ffffff" }, "Leave")],
    rigidBody: new BoxBody({ cx: 15, cy: 0.5, width: 1.8, height: 0.6 }, { scene: stage.hud, collisionsEnabled: false }),
    gestures: { onTap: () => { leave(""); return true; } },
  });
  // ANCHOR_END: leave_button
}
// ANCHOR_END: cove

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
