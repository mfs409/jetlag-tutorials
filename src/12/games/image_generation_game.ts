import { Actor, BoxBody, ColorReplaceFilter, Container, FilledBox, HslAdjustmentFilter, ImageSprite, JetLagGameConfig, KeyCodes, PixiSprite, initializeAndLaunch, stage } from "jetlag2d";
import { boundingBox, hudText } from "../common/common";

// ANCHOR: config
/**
 * Screen dimensions and other game configuration, such as the names of all
 * the assets (images and sounds) used by this game.
 */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = false;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
    imageNames: ["snow_ball.png", "grey_ball.png", "carrot.png", "scarf.png"],
  };
}
// ANCHOR_END: config

/** The color of the scarf in `scarf.png`, as red, green, and blue, from 0 to 255 */
const SCARF_RED = [208, 73, 72];
/** Some other colors that the scarf can be */
const SCARF_GREEN = [31, 175, 75];
const SCARF_MUSTARD = [253, 217, 63];
const SCARF_PURPLE = [150, 64, 152];

// ANCHOR: piece
/**
 * Make one piece of the snowman: a Pixi sprite from one of the pictures that
 * we loaded.  Its middle goes at (x, y), measured in pixels from the top left
 * of the snowman, and it's shrunk to be `width` pixels wide.
 *
 * @param name  The name of the picture
 * @param x     The x coordinate of the piece's middle
 * @param y     The y coordinate of the piece's middle
 * @param width How wide the piece should be
 *
 * @returns The sprite
 */
function piece(name: string, x: number, y: number, width: number) {
  const sprite = new PixiSprite(stage.imageLibrary.getImageAsTexture(name));
  sprite.anchor.set(0.5);
  sprite.position.set(x, y);
  // Scale both dimensions by the same amount, so that the picture isn't squashed
  sprite.scale.set(width / sprite.texture.width);
  return sprite;
}
// ANCHOR_END: piece

/**
 * Make one ball of snow.  Each ball is a bit lighter or darker than the next,
 * so that you can tell where one ends and the next begins.
 *
 * @param x         The x coordinate of the ball's middle
 * @param y         The y coordinate of the ball's middle
 * @param width     How wide the ball should be
 * @param lightness How much lighter (up to 1) or darker (down to -1) to make it
 *
 * @returns The sprite
 */
function snowBall(x: number, y: number, width: number, lightness: number) {
  const ball = piece("snow_ball.png", x, y, width);
  // ANCHOR: snow_filter
  // Pixi filters attach to sprites, not textures, which is why we made a sprite.
  // Only the lightness changes.  The filter wants every setting, so the others
  // say "no change"
  ball.filters = [new HslAdjustmentFilter({ hue: 0, saturation: 0, lightness, colorize: false, alpha: 1 })];
  // ANCHOR_END: snow_filter
  return ball;
}

/**
 * Make a snowman, with a scarf of any color.  It's one actor, with one
 * picture, and the picture is made right here, while the game is running.
 *
 * @param cx    The x coordinate of the snowman's middle, in meters
 * @param cy    The y coordinate of the snowman's middle, in meters
 * @param scarf The color of the scarf, as red, green, and blue, from 0 to 255
 *
 * @returns The snowman
 */
function makeSnowman(cx: number, cy: number, scarf: number[]) {
  // ANCHOR: container
  // A container holds the pieces.  The ones that go in first are behind the
  // ones that go in later
  const snowman = new Container();
  // ANCHOR_END: container
  // ANCHOR: snow_balls
  // Three balls of snow: the bottom one first, because the others overlap it
  snowman.addChild(snowBall(76, 238, 152, -0.06));
  snowman.addChild(snowBall(76, 126, 116, 0));
  snowman.addChild(snowBall(76, 42, 84, 0.06));
  // ANCHOR_END: snow_balls
  // ANCHOR: face_parts
  // The eyes, and the buttons, are all the same picture: a dark ball
  snowman.addChild(piece("grey_ball.png", 62, 34, 14));
  snowman.addChild(piece("grey_ball.png", 90, 34, 14));
  snowman.addChild(piece("grey_ball.png", 76, 112, 16));
  snowman.addChild(piece("grey_ball.png", 76, 136, 16));
  snowman.addChild(piece("grey_ball.png", 76, 160, 16));
  snowman.addChild(piece("carrot.png", 76, 58, 15));
  // ANCHOR_END: face_parts
  // ANCHOR: scarf_part
  // The scarf is red in its picture.  A ColorReplaceFilter swaps that red for
  // the color that we asked for.  It wants red, green, and blue from 0 to 1,
  // and not from 0 to 255, so each number is divided by 255.  The tolerance is
  // tiny, so that nothing else changes color by accident
  const scarfPiece = piece("scarf.png", 76, 99, 106);
  scarfPiece.filters = [new ColorReplaceFilter({
    originalColor: SCARF_RED.map(v => v / 255),
    targetColor: scarf.map(v => v / 255),
    tolerance: 0.001,
  })];
  snowman.addChild(scarfPiece);
  // ANCHOR_END: scarf_part
  // ANCHOR: flatten
  // Now flatten the whole container into one texture.  All of the layering and
  // coloring happens once, right here, and not on every frame
  const texture = stage.renderer.pixi.renderer.generateTexture(snowman);
  // The pieces have done their job
  snowman.destroy({ children: true });
  // The picture is `texture.width` pixels wide.  There are 80 pixels to a meter
  // here, so that the snowman is about as tall as half of the screen
  const width = texture.width / 80;
  const height = texture.height / 80;
  return new Actor({
    appearance: new ImageSprite({ width, height, img: new PixiSprite(texture) }),
    rigidBody: new BoxBody({ cx, cy, width, height }, { dynamic: true, disableRotation: true }),
  });
  // ANCHOR_END: flatten
}

/**
 * Draw the first scene that shows when the game starts.
 */
function builder() {
  boundingBox();

  // A night sky, and some ground
  new Actor({
    appearance: new FilledBox({ width: 16, height: 9, fillColor: "#1c2541", z: -4 }),
    rigidBody: new BoxBody({ cx: 8, cy: 4.5, width: 16, height: 9 }, { collisionsEnabled: false }),
  });
  new Actor({
    appearance: new FilledBox({ width: 16, height: 3, fillColor: "#2c3a57", z: -3 }),
    rigidBody: new BoxBody({ cx: 8, cy: 7.5, width: 16, height: 3 }, { collisionsEnabled: false }),
  });

  let snowman = makeSnowman(8, 4.9, SCARF_RED);
  hudText(0.3, 0.5, 22, "#ffffff", () => "1 2 3 4: change the scarf     Arrow keys: walk");

  // ANCHOR: recolor
  /**
   * Make the snowman over, with a different scarf, in the same place.  That's
   * the only way to change a picture that's been flattened: make it again
   *
   * @param scarf The color of the new scarf
   */
  const recolor = (scarf: number[]) => {
    const where = snowman.rigidBody.getCenter();
    snowman.remove();
    snowman = makeSnowman(where.x, where.y, scarf);
  };
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT1, () => recolor(SCARF_RED));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT2, () => recolor(SCARF_GREEN));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT3, () => recolor(SCARF_MUSTARD));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DIGIT4, () => recolor(SCARF_PURPLE));
  // ANCHOR_END: recolor

  // Pressing an arrow key sets the snowman's velocity, and letting go stops it
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_UP, KeyCodes.KEY_DOWN], () => (snowman.rigidBody.yVelocity = 0));
  stage.keyboard.setKeyUpHandler([KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT], () => (snowman.rigidBody.xVelocity = 0));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_UP, () => (snowman.rigidBody.yVelocity = -3));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_DOWN, () => (snowman.rigidBody.yVelocity = 3));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_LEFT, () => (snowman.rigidBody.xVelocity = -3));
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_RIGHT, () => (snowman.rigidBody.xVelocity = 3));
}

// call the function that starts running the game in the `game-player` div tag
// of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
