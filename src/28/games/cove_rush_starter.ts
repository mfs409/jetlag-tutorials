import { Actor, BoxBody, DebugToggle, FilledBox, initializeAndLaunch, JetLagGameConfig, SessionValue, stage, TextSprite } from "jetlag2d";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf", "Roboto-Black.ttf"],
  };
}

/**
 * STARTER CODE for Cove Rush.
 *
 * The lobby is drawn, with a button to host a game, and one to join.  They
 * don't connect to anything yet.  The types, and the little helpers, are
 * here.  The comments below say what each stage adds.
 *
 * To test this chapter, you need a server (the `multiplayer-server` folder of
 * your JetLag repository, started with `npm start`) and at least two browser
 * windows.
 *
 * TODO (Connecting): a lobby that hosts or joins a game, through the server, and a room to be in, with its code and the names of who is there.
 *
 * TODO (Seeing each other): your pirate, and everyone else's, moving in everyone's room.
 *
 * TODO (The same coins): coins that are in the same places for everybody, and a scoreboard.
 *
 * TODO (A winner): a rule that ends the game for everyone, when someone collects seven coins.
 */

// ---------------------------------------------------------------------------
// What gets sent, and what is known
// ---------------------------------------------------------------------------

/**
 * The messages that players send to each other, through the server.  Each
 * has a `t` that says what kind it is.  The server doesn't look inside them.
 */
export type Msg =
  | { t: "pos"; id: string; x: number; y: number }
  | { t: "take"; id: string; coin: number };

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

/** How many coins it takes to win */
export const TARGET = 7;
/** The colors that players are given, in the order that they arrive */
export const COLORS = ["#e0463c", "#3c7de0", "#3cbf6a", "#e0b83c", "#9b5de5"];

/** What's known about the network game, in session storage.  There is none until we try to connect, and `leave` forgets it. */
const NET = new SessionValue<Net | undefined>("net", () => undefined);

/** What to tell the player in the lobby about how the last try went */
const LOBBY_STATUS = new SessionValue<string>("lobbyStatus", () => "");

/** The server address that was last asked for */
const ADDRESS = new SessionValue<string>("address", () => "localhost:3000");

/**
 * Everyone in the game, in a fixed order, so that everyone gets the same color for the same player
 *
 * @param n The network game
 */
export const everyone = (n: Net) => [{ id: n.me.id, name: n.me.name }, ...[...n.peers.values()].map(p => ({ id: p.id, name: p.name }))].sort((a, b) => (a.id < b.id ? -1 : 1));

// ---------------------------------------------------------------------------
// Talking to the server
// ---------------------------------------------------------------------------

/**
 * Connect to the server, and log in, and make or join a room.  (Not built yet.)
 *
 * @param _address The server's address
 * @param _name    What the player calls themselves
 * @param _room    The room to join, or nothing, to make a new one
 */
function connect(_address: string, _name: string, _room?: string) {
  LOBBY_STATUS.set("Connecting isn't built yet: that's stage 1");
}

// ---------------------------------------------------------------------------
// The screens
// ---------------------------------------------------------------------------

/** Build either the lobby, or the cove, depending on whether there's a room yet */
function builder() {
  DebugToggle.enable();
  const n = NET.get();
  stage.backgroundColor = "#7ec8e3";
  if (!n || !n.room) return lobby();
  cove(n);
}

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
}

/** Build either the lobby, or the cove, depending on whether there's a room yet */
function cove(_n: Net) { }

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
