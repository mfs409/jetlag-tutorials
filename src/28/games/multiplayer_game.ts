import { Actor, BoxBody, CircleBody, DebugToggle, getAppearance, ImageSprite, JetLagGameConfig, PlayerControlBehavior, TextSprite, TiltMovement, initializeAndLaunch, SessionValue, stage } from "jetlag2d";
import { boundingBox, enableArrowKeyForces } from "../common/common";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  // Use {16, 9} for landscape mode, and {9, 16} for portrait mode.
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["sprites.json"],
  };
}

/**
 * The RemoteActor type is just a way of bundling together several pieces of
 * information that we need to track in order to know how to use a remote user's
 * network messages to move their actor on our screen.
 */
class RemoteActor {
  /**
   * Construct a RemoteActor object
   *
   * @param userId    The id of the user
   * @param userName  The name of the user
   * @param actor     The Actor object in the game that is controlled by userId
   */
  constructor(
    public userId: string,
    public userName: string,
    public actor: Actor,
  ) {}
}

/**
 * The ActorState type is a convenient way of bundling up the information that
 * gets sent by a remote user to let us know how to move their actor in our
 * world.
 */
class ActorState {
  /**
   * Construct an ActorState object
   *
   * @param userId The Id of the user who created this ActorState
   * @param cx     The center X for userId's Actor
   * @param cy     The center Y for userId's Actor
   * @param rot    The rotation for userId's Actor
   * @param img    The image to display for the actor
   */
  constructor(
    public userId: string,
    public cx: number,
    public cy: number,
    public rot: number,
    public img: string,
  ) {}
}

/**
 * Make an actor and put it on the screen.  This can make a local actor who is
 * controlled by tilt and broadcasts its state over the network, or a remote
 * actor who will be controlled by the network.
 *
 * @param local   True if this actor is controlled locally, false if it is
 *                controlled by the network.
 * @param userId  The Id of the person who controls this actor
 * @param img     The initial image to use for the actor.  Note that we don't
 *                use AnimatedSprite, instead we manually toggle the image.
 *
 * @returns       The actor that was created
 */
function makeActor(local: boolean, userId: string, img: string) {
  if (local) {
    // The local actor will be a Hero controlled by Tilt.  We have to give it a
    // role, or it will pass through the walls!
    let actor = new Actor({
      appearance: new ImageSprite({ width: 0.75, height: 0.75, img }),
      rigidBody: new CircleBody({ cx: 1, cy: 1, radius: 0.375 }, { friction: 0.3 }),
      movement: new TiltMovement(),
      behaviors: new PlayerControlBehavior(),
    });
    // Broadcast this actor's position on every render (dozens of times per
    // second), so everyone else in the room can update where it's drawn on
    // their own screen.
    stage.world.repeatEvents.push(() => {
      stage.network.sendBroadcast(
        JSON.stringify(
          new ActorState(
            userId,
            actor.rigidBody.getCenter().x,
            actor.rigidBody.getCenter().y,
            actor.rigidBody.rotation,
            getAppearance(actor, ImageSprite).img,
          ),
        ),
      );
    });
    return actor;
  } else {
    // A remote actor will not have any Behaviors or a movement controller.
    // The network will handle it for us.
    return new Actor({
      appearance: new ImageSprite({ width: 0.75, height: 0.75, img: "green_ball.png" }),
      rigidBody: new CircleBody({ cx: -1, cy: -1, radius: 0.375 }, { kinematic: true }),
    });
  }
}

/**
 * All the info about the distributed game state: our user Id/name, whether
 * we're connected, what room we're in, and the actors (ours and everyone
 * else's)
 */
class LoginInfo {
  userId = "";
  userName = "";
  connected = false;
  room = "";
  remoteActors = new Map<string, RemoteActor>();
  myActor: Actor | undefined = undefined;
}

/**
 * The login info, in session storage, since it needs to survive for as long
 * as the game runs, but there's no reason for it to outlive the page.  It's
 * `undefined` until we've tried to connect.
 */
const USER = new SessionValue<LoginInfo | undefined>("user", () => undefined);

/**
 * Connect the current user to a server, then set up the actor for this user
 * once they're connected.
 *
 * @param userId     The Id to use for the new user
 * @param userName   The name to use for the new user
 * @param createRoom Should the user go into a new room (else we'll ask what
 *                   room to join)
 * @param imgName    The image to use when making this user's actor
 */
function connectUser(
  userId: string,
  userName: string,
  createRoom: boolean,
  imgName: string,
) {
  // If we've already called this and it didn't fail, then don't try to connect
  // again
  if (USER.get()) return;

  // This is where we'll keep all the info about the distributed game state:
  // our user Id/name, whether we're connected, what room we're in, and the
  // actors (ours and everyone else's). It goes in `stage.storage`'s *session*
  // tier, since it needs to survive for as long as the game runs, but there's
  // no reason for it to outlive the page.
  const loginInfo = new LoginInfo();
  USER.set(loginInfo);

  // We aren't going to deal with these events in this demo, so instruct JetLag
  // to just print something when any of them happen:
  let fatalError = (msg: string) => {
    window.alert(msg);
    stage.network.disconnect();
    stage.network.reset();
    USER.clear();
  };
  stage.network.onDisconnected = fatalError;
  stage.network.onErrHasUser = fatalError;
  stage.network.onErrNoUser = fatalError;
  stage.network.onErrHasRoom = fatalError;
  stage.network.onErrNoRoom = fatalError;
  stage.network.onErrFormat = fatalError;
  stage.network.onLoggedOut = fatalError;
  stage.network.onErrUserTaken = fatalError;

  // Before we can connect, we have to set up the handlers for the various
  // network events
  stage.network.onConnected = () => {
    // Once we connect, remember that we're connected, and try to log in
    loginInfo.connected = true;
    stage.network.requestLogin(userId, userName);
  };
  stage.network.onLoggedIn = () => {
    // We're logged in.  First, save this user's info to loginInfo
    loginInfo.userId = userId;
    loginInfo.userName = userName;
    // Should we ask the server to create a room for us?
    if (createRoom) {
      stage.network.requestCreate();
    }
    // If not, get a room Id from the user, ask the server to join us to it
    else {
      // NB: You should use a nicer UI for this!
      let roomId = window.prompt("Enter a Room Id");
      if (roomId == null) {
        fatalError("Invalid Room Id");
        return;
      }
      stage.network.requestJoin(roomId);
    }
  };
  stage.network.onCreated = (msg: string) => {
    // Once the server creates a room for us, put an actor in it
    let m = JSON.parse(msg);
    // Tell the user their room, so they can tell their friends.
    // NB: You should use a nicer UI for this!
    window.alert(`You are now in room ${m.roomId}`);
    loginInfo.room = m.roomId;
    loginInfo.myActor = makeActor(true, userId, imgName);
  };
  stage.network.onUserJoined = (msg: string) => {
    // When a remote user joins a room, add it to the remote actors list, and
    // set up an Actor for it in the world
    //
    // NB: The image doesn't really matter... it will get overridden soon, and
    //     we initially draw the actor off-screen
    let m = JSON.parse(msg);
    loginInfo.remoteActors.set(m.userId, new RemoteActor(m.userId, m.userName, makeActor(false, m.userId, "red_ball.png")));
  };
  stage.network.onUserLeft = (msg: string) => {
    // When a remote user exits the room, take them out of the world and remote
    // actor list
    let m = JSON.parse(msg);
    const gone = loginInfo.remoteActors.get(m.userId);
    if (gone) {
      gone.actor.enabled = false;
      loginInfo.remoteActors.delete(m.userId);
    }
  };
  stage.network.onBroadcast = (msg: string) => {
    // When a remote user sends a state update, handle it
    let outer = JSON.parse(msg);
    let m: ActorState = JSON.parse(outer.msg);
    let a = loginInfo.remoteActors.get(m.userId);
    if (!a) return;
    getAppearance(a.actor, ImageSprite).img = m.img;
    a.actor.rigidBody.setCenter(m.cx, m.cy);
    a.actor.rigidBody.rotation = m.rot;
  };
  stage.network.onSent = () => {
    // We don't bother announcing when a broadcast succeeds
  };
  stage.network.onJoined = (msg: string) => {
    // When joining an existing room, be sure to add all users and oneself
    let m = JSON.parse(msg);
    loginInfo.room = m.roomId;
    for (let p of m.peers)
      loginInfo.remoteActors.set(p.id, new RemoteActor(p.id, p.name, makeActor(false, p.id, "red_ball.png")));
    loginInfo.myActor = makeActor(true, userId, imgName);
  };

  // Now that the event handlers are all set, we can ask for the server address
  // and then connect
  // NB: You should use a nicer UI for this!
  let address = window.prompt("Enter the Address:");
  if (address == null) return;
  stage.network.connect(address);
}

/**
 * This function draws the first scene that shows when the game starts.  In this
 * code, it's an interactive world that cannot be won or lost.  After your game
 * starts becoming more polished, you will probably want to use several
 * functions like this one as a way to organize the parts of your game (levels,
 * chooser, welcome screen, store, etc).
 *
 * @param level Which level of the game should be displayed
 */
function builder() {
  DebugToggle.enable();

  // Set up three buttons for creating three different users.  The server
  // doesn't validate login tokens, so testing multiplayer alone just means
  // opening a few browser windows and clicking a different button in each.
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 24, color: "#000000" }, "Log In User #1"),
    rigidBody: new BoxBody({ cx: 14, cy: 0.5, width: 2, height: 0.25 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        connectUser("user1", "User #1", true, "green_ball.png");
        return true;
      },
    },
  });
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 24, color: "#000000" }, "Log In User #2"),
    rigidBody: new BoxBody({ cx: 14, cy: 1, width: 2, height: 0.25 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        connectUser("user2", "User #2", false, "blue_ball.png");
        return true;
      },
    },
  });
  new Actor({
    appearance: new TextSprite({ center: true, face: "Arimo Regular", size: 24, color: "#000000" }, "Log In User #3"),
    rigidBody: new BoxBody({ cx: 14, cy: 1.5, width: 2, height: 0.25 }, { scene: stage.hud }),
    gestures: {
      onTap: () => {
        connectUser("user3", "User #3", false, "purple_ball.png");
        return true;
      },
    },
  });

  // Set up the walls, give them some friction
  let walls = boundingBox();
  walls.l.rigidBody.setPhysics({ friction: 0.2 });
  walls.r.rigidBody.setPhysics({ friction: 0.2 });
  walls.t.rigidBody.setPhysics({ friction: 0.2 });
  walls.b.rigidBody.setPhysics({ friction: 0.2 });

  enableArrowKeyForces(5, 5);
}

// call the function that starts running the game in the `game-player` div tag
// of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
