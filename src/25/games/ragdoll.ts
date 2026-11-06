import { Actor, BoxBody, CircleBody, DebugToggle, FilledBox, FilledCircle, JetLagGameConfig, SolidBehavior, initializeAndLaunch, stage } from "jetlag2d";

// [mfs] Be sure to leverage helpers.ts as appropriate

// [mfs] Vet the other games in the folder.  Do we still need all those demos?

/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  // Use 16/9 for landscape mode, and 9/16 for portrait mode
  aspectRatio = { width: 32, height: 18 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * Draw a ragdoll on the screen, and give it some movement
 *
 * @param headCx The X coordinate of the ragdoll's head
 * @param headCy The Y coordinate of the ragdoll's head
 * @param vx     The X velocity of the ragdoll
 * @param vy     The Y velocity of the ragdoll
 * @param va     The angular velocity of the ragdoll
 */
function makeRagDoll(
  headCx: number,
  headCy: number,
  vx: number,
  vy: number,
  va: number,
) {
  // Make the head
  const HR = 0.65; // head radius
  let head = new Actor({
    appearance: new FilledCircle({ radius: HR, fillColor: "#FFFF00" }),
    rigidBody: new CircleBody(
      { cx: headCx, cy: headCy, radius: HR },
      { density: 1, friction: 0.4, elasticity: 0.3, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });
  // Make the torso
  const TW = 1.8; // torso width
  const TH = 2.4; // torso height
  let torso = new Actor({
    appearance: new FilledBox({ width: TW, height: TH, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody(
      {
        width: TW,
        height: TH,
        cx: head.rigidBody.getCenter().x,
        cy: head.rigidBody.getCenter().y + HR + TH / 2,
      },
      { density: 1, friction: 0.4, elasticity: 0.1, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });

  // Make the arms
  const AW = 1.8; // arm width
  const AH = 0.55; // arm height
  let lArm = new Actor({
    appearance: new FilledBox({ width: AW, height: AH, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody(
      {
        width: AW,
        height: AH,
        cx: torso.rigidBody.getCenter().x - TW / 2 - AW / 2 - 0.05,
        cy: torso.rigidBody.getCenter().y - TH / 2 + AH / 2 + 0.05,
      },
      { density: 1, friction: 0.4, elasticity: 0.1, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });
  let rArm = new Actor({
    appearance: new FilledBox({ width: AW, height: AH, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody(
      {
        width: AW,
        height: AH,
        cx: torso.rigidBody.getCenter().x + TW / 2 + AW / 2 + 0.05,
        cy: torso.rigidBody.getCenter().y - TH / 2 + AH / 2 + 0.05,
      },
      { density: 1, friction: 0.4, elasticity: 0.1, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });

  // Make the legs
  const LW = 0.5; // leg width
  const LH = 1.8; // leg height
  let lLeg = new Actor({
    appearance: new FilledBox({ width: LW, height: LH, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody(
      {
        width: LW,
        height: LH,
        cx: torso.rigidBody.getCenter().x - TW / 2 + LW / 2,
        cy: torso.rigidBody.getCenter().y + TH / 2 + LH / 2 + 0.09,
      },
      { density: 1, friction: 0.4, elasticity: 0.1, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });
  let rLeg = new Actor({
    appearance: new FilledBox({ width: LW, height: LH, fillColor: "#FFFF00" }),
    rigidBody: new BoxBody(
      {
        width: LW,
        height: LH,
        cx: torso.rigidBody.getCenter().x + TW / 2 - LW / 2,
        cy: torso.rigidBody.getCenter().y + TH / 2 + LH / 2 + 0.09,
      },
      { density: 1, friction: 0.4, elasticity: 0.1, dynamic: true },
    ),
    behaviors: new SolidBehavior(),
  });

  // Join head to torso
  join(torso, 0, -TH / 2 - 0.02, head, 0, HR + 0.02, -25, 25);
  // Join arms to torso
  join(
    torso,
    -TW / 2 - 0.02,
    -TH / 2 + AH / 2,
    lArm,
    AW / 2 + 0.02,
    AH / 2,
    -95,
    35,
  );
  join(
    torso,
    TW / 2 + 0.02,
    -TH / 2 + AH / 2,
    rArm,
    -AW / 2 + -0.02,
    AH / 2,
    -35,
    95,
  );
  // Join legs to torso
  join(
    torso,
    -TW / 2 + LW / 2,
    TH / 2 + 0.01,
    lLeg,
    0,
    -LH / 2 - 0.01,
    -40,
    40,
  );
  join(torso, TW / 2 - LW / 2, TH / 2 + 0.01, rLeg, 0, -LH / 2 - 0.01, -40, 40);

  // Toss the torso to make the whole body move
  torso.rigidBody.setVelocity(vx, vy);
  torso.rigidBody.body.SetAngularVelocity(va);
}

/**
 * Build the levels of the game: drop a few ragdolls, with different
 * starting velocities and spins, and give them stairs and a box to land on.
 *
 */
function builder() {
  DebugToggle.enable();

  // Different starting velocities/spins show how the joints react each time
  makeRagDoll(5, 1, 10, -10, 2);
  makeRagDoll(5, -10, 0, 0, 0);
  makeRagDoll(28, -10, 0, 0, 100);

  // Floor
  new Actor({
    appearance: new FilledBox({ width: 32, height: 1, fillColor: "#ff0000" }),
    rigidBody: new BoxBody({ cx: 16, cy: 18.5, width: 32, height: 1 }),
    behaviors: new SolidBehavior(),
  });

  // Left stairs
  for (let i = 1; i < 11; ++i) {
    new Actor({
      appearance: new FilledBox({ width: i, height: 1, fillColor: "#0000ff" }),
      rigidBody: new BoxBody(
        { cx: i / 2, cy: 7 + i + 0.5, width: i, height: 1 },
        { density: 1, elasticity: 0.3, friction: 0.4 },
      ),
      behaviors: new SolidBehavior(),
    });
  }

  // Right stairs
  for (let i = 1; i < 11; ++i) {
    new Actor({
      appearance: new FilledBox({ width: i, height: 1, fillColor: "#0000ff" }),
      rigidBody: new BoxBody(
        { cx: 32 - i / 2, cy: 7 + i + 0.5, width: i, height: 1 },
        { density: 1, elasticity: 0.3, friction: 0.4 },
      ),
      behaviors: new SolidBehavior(),
    });
  }

  // Box in the middle
  new Actor({
    appearance: new FilledBox({ width: 6, height: 4, fillColor: "#0000ff" }),
    rigidBody: new BoxBody(
      { cx: 16, cy: 16, width: 6, height: 4 },
      { density: 1, elasticity: 0.3, friction: 0.4 },
    ),
    behaviors: new SolidBehavior(),
  });

  stage.world.gravity = { x: 0, y: 10 };
}

// call the function that kicks off the game
initializeAndLaunch("game-player", new Config(), builder);

/**
 * Connect two bodies with a revolute joint that has limits, in degrees.  This
 * helper makes ragdoll construction a lot easier.
 *
 * @param bodyA    The first body
 * @param anchorAX The X coordinate of the anchor for the first body
 * @param anchorAY The Y coordinate of the anchor for the first body
 * @param bodyB    The second body
 * @param anchorBX The X coordinate of the anchor for the second body
 * @param anchorBY The Y coordinate of the anchor for the second body
 * @param lower    The lower joint angle in degrees
 * @param upper    The upper joint angle in degrees
 *
 * @return The joint that was created
 */
function join(
  bodyA: Actor,
  anchorAX: number,
  anchorAY: number,
  bodyB: Actor,
  anchorBX: number,
  anchorBY: number,
  lower: number,
  upper: number,
) {
  return bodyB.rigidBody.addRevoluteJoint({
    anchor: bodyA,
    anchorPoint: { x: anchorAX, y: anchorAY },
    localPoint: { x: anchorBX, y: anchorBY },
    limits: { lower: (lower * Math.PI) / 180, upper: (upper * Math.PI) / 180 },
  });
}
