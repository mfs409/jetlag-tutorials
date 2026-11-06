import { Actor, BoxBody, CircleBody, CollectableBehavior, FilledBox, FilledCircle, FilledPolygon, GoalBehavior, initializeAndLaunch, JetLagGameConfig, KeyCodes, ScoreService, stage, TextSprite, TimedEvent } from "jetlag2d";
import { hudText } from "../common/common";
import { ARENA, CHARGE_TIME, MAX_GENERATION, MAX_SLIMES, SPLIT_EVERY, LOSE_REASON, isSlime, announce, blast, clamp, spotAwayFrom, startArena } from "./helpers";

/** Screen dimensions and other game configuration */
class Config implements JetLagGameConfig {
  aspectRatio = { width: 16, height: 9 };
  hitBoxes = true;
  resources = {
    fonts: ["Arimo-Regular.ttf"],
  };
}

/**
 * MILESTONE 6 for Slime Time: meteors escalate.  The comments say what each remaining piece needs.
 */

/** Build the one and only level of the game */
function builder() {
  // The arena, the hero, and the slimes come from `helpers.ts`.
  const { hero, body, health, canHurt, slimes, makeSlime, squash, targets, dash } = startArena(builder);

  // ANCHOR: dash_state
  let dashReady = true;
  // ANCHOR_END: dash_state
  stage.keyboard.setKeyDownHandler(KeyCodes.KEY_SPACE, () => {
    // ANCHOR: dash_guard
    // A dash that isn't ready does nothing, and starting one makes it not ready
    if (!dashReady) return;
    dashReady = false;
    body.lineColor = "#ffffff";
    // ANCHOR_END: dash_guard
    dash();
    // ANCHOR: dash_cooldown
    // 0.7 seconds later, the dash is ready again.  That's something to *do*
    // later, so it's a one-shot timer.
    stage.world.timer.addEvent(new TimedEvent(0.7, false, () => { dashReady = true; body.lineColor = "#39c2ff"; }));
    // ANCHOR_END: dash_cooldown
  });

  // ANCHOR: portal
  // The portal is made at the start, but it's switched off until it's fully
  // charged.  Reaching it wins the level.
  const portal = new Actor({
    appearance: [new FilledCircle({ radius: 0.9, fillColor: "#39c2ff55", lineWidth: 0.12, lineColor: "#39c2ff" }), new FilledCircle({ radius: 0.4, fillColor: "#ffffffaa" })],
    rigidBody: new CircleBody({ cx: 3, cy: 3, radius: 0.9 }, { collisionsEnabled: false }),
    behaviors: new GoalBehavior({ onArrival: () => { stage.score.winLevel(); return true; } }),
  });
  portal.enabled = false;
  targets.push({ actor: portal, label: "portal" });
  stage.world.timer.addEvent(new TimedEvent(0.25, true, () => {
    if (portal.enabled || charge() < CHARGE_TIME) return;
    const [x, y] = spotAwayFrom(hero, 5, 9);
    portal.rigidBody.setCenter(x, y);
    portal.enabled = true;
    announce("The portal is open!  Get to it!");
  }));
  // ANCHOR_END: portal

  // ANCHOR: crate
  // A crate that holds a bomb.  Grabbing it pops every slime that is near the hero.
  const dropCrate = (x: number, y: number) => {
  const crate = new Actor({
    appearance: [new FilledBox({ width: 0.9, height: 0.9, fillColor: "#b07a3c", lineWidth: 0.07, lineColor: "#5e3f1c" }), new TextSprite({ center: true, face: "Arimo Regular", size: 16, color: "#ffffff" }, "BOOM")],
    rigidBody: new BoxBody({ cx: x, cy: y, width: 0.9, height: 0.9 }),
    behaviors: new CollectableBehavior({
      onCollect: () => {
        // The crate holds a bomb that pops every nearby slime
        const hc = hero.rigidBody.getCenter();
        blast(hc.x, hc.y, 4.5, "#ffffff55", 0.35, isSlime, (slime: Actor) => { if (isSlime(slime)) squash(slime); });
        announce("Boom!");
        return true;
      },
    }),
  });
  targets.push({ actor: crate, label: "crate" });
  };
  // ANCHOR_END: crate

  // ANCHOR: supply_drops
  const supplyDrop = (at: number) => stage.world.timer.addEvent(new TimedEvent(at, false, () => {
    const [x, y] = spotAwayFrom(hero, 6, 11);
    announce("Supply drop incoming!");
    const shadow = new Actor({
      appearance: new FilledCircle({ radius: 0.6, fillColor: "#00000066" }),
      rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }),
    });
    stage.world.timer.addEvent(new TimedEvent(2, false, () => {
      shadow.remove();
      dropCrate(x, y);
    }));
  }));
  supplyDrop(15);
  supplyDrop(38);
  // ANCHOR_END: supply_drops

  // ANCHOR: hourglasses
  const hourglassTimes = [8, 22, 31, 46];
  for (const at of hourglassTimes) {
    stage.world.timer.addEvent(new TimedEvent(at, false, () => {
      const [x, y] = spotAwayFrom(hero, 4, 9);
      const glass = new Actor({
        appearance: [
          new FilledPolygon({ vertices: [{ x: -0.25, y: -0.35 }, { x: 0.25, y: -0.35 }, { x: 0, y: 0 }], fillColor: "#ffe08a", lineWidth: 0.04, lineColor: "#a07a1c" }),
          new FilledPolygon({ vertices: [{ x: 0, y: 0 }, { x: 0.25, y: 0.35 }, { x: -0.25, y: 0.35 }], fillColor: "#ffe08a", lineWidth: 0.04, lineColor: "#a07a1c" }),
        ],
        rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.35 }),
        behaviors: new CollectableBehavior({
          onCollect: () => {
            // It's been collected, so there's no need to remove it later
            vanish.cancelled = true;
            stage.score.counters.add("bonus", 4);
            announce("Hourglass: portal charge +4 seconds");
            return true;
          },
        }),
      });
      targets.push({ actor: glass, label: "hourglass" });
      announce("An hourglass appeared!");
      // Hourglasses don't wait forever
      const vanish = new TimedEvent(9, false, () => glass.remove());
      stage.world.timer.addEvent(vanish);
    }));
  }
  // ANCHOR_END: hourglasses

  // ANCHOR: splitting
  stage.world.timer.addEvent(new TimedEvent(0.5, true, () => {
    const born: { x: number; y: number; gen: number }[] = [];
    for (const s of slimes) {
      s.data.age += 0.5;
      if (s.data.age < SPLIT_EVERY || s.data.gen >= MAX_GENERATION) continue;
      s.data.age = 0;
      const c = s.rigidBody.getCenter();
      born.push({ x: c.x + (stage.random.next() - 0.5) * 1.2, y: c.y + (stage.random.next() - 0.5) * 1.2, gen: s.data.gen + 1 });
    }
    for (const baby of born) makeSlime(baby.x, baby.y, baby.gen);
    if (slimes.length >= MAX_SLIMES) {
      LOSE_REASON.set("The slimes overran the arena.");
      stage.score.loseLevel();
    }
  }));
  // ANCHOR_END: splitting
  // ANCHOR: ooze
  // A fresh slime oozes in from a corner every so often
  stage.world.timer.addEvent(new TimedEvent(7, true, () => {
    const corners = [[1.5, 1.5], [ARENA.w - 1.5, 1.5], [1.5, ARENA.h - 1.5], [ARENA.w - 1.5, ARENA.h - 1.5]];
    const [x, y] = corners[Math.floor(stage.random.next() * 4)];
    makeSlime(x, y, 0);
  }));
  // ANCHOR_END: ooze

  // ANCHOR: meteor
  // A meteor: a warning circle appears near the hero, and 1.3 seconds later, the meteor lands there
  const meteor = () => {
  const c = hero.rigidBody.getCenter();
  const x = clamp(c.x + (stage.random.next() - 0.5) * 9, 1, ARENA.w - 1), y = clamp(c.y + (stage.random.next() - 0.5) * 6, 1, ARENA.h - 1);
  const warning = new Actor({
    appearance: new FilledCircle({ radius: 1.3, fillColor: "#ff3b3b33", lineWidth: 0.05, lineColor: "#ff3b3b" }),
    rigidBody: new CircleBody({ cx: x, cy: y, radius: 0.01 }, { collisionsEnabled: false }),
  });
  stage.world.timer.addEvent(new TimedEvent(1.3, false, () => {
    warning.remove();
    // The blast is as big as the warning, and it squashes every slime that it touches.  It hurts the hero too.
    blast(x, y, 1.3, "#ffb347cc", 0.3, (other: Actor) => isSlime(other) || other == hero, (other: Actor) => {
      if (isSlime(other)) squash(other);
      else if (canHurt()) health.damage(1);
    });
  }));
  };
  // ANCHOR_END: meteor

  // ANCHOR: meteors
  // Meteors: one repeating timer that counts down to the next meteor.  The
  // countdown gets shorter as the portal charges, so the rate escalates.
  let untilMeteor = 6;
  stage.world.timer.addEvent(new TimedEvent(0.25, true, () => {
    untilMeteor -= 0.25;
    if (untilMeteor > 0) return;
    untilMeteor = Math.max(0.6, 4 - charge() / 17);
    meteor();
  }));
  // ANCHOR_END: meteors

  // TODO (Arrow): When the portal, a crate, or an hourglass is off-screen, an arrow near the edge of the screen points toward it.
  // `makeArrow(hero)` makes the arrow, and its `point` function is given a target (one of `targets`), and points at it if it's
  // off-screen.  A fast monitoring timer (every 0.05 seconds) can keep it up to date: it should point at the portal, if
  // it's there, then a crate, then anything else.

// The HUD
  // ANCHOR: hud_portal
  hudText(2.2, 0.15, 24, "#39c2ff", () => portal.enabled ? "Portal: OPEN" : `Portal: ${Math.floor(100 * charge() / CHARGE_TIME)}%`, { outline: "#000000" });
  // ANCHOR_END: hud_portal
  // ANCHOR: hud_dash
  hudText(10.3, 0.15, 24, "#ffffff", () => dashReady ? "Dash: ready" : "Dash: ...", { outline: "#000000" });
  // ANCHOR_END: hud_dash
}

// ANCHOR: charge_fn
/**
 * How charged the portal is, in seconds: the stopwatch, plus whatever bonus the
 * hourglasses have given, but never more than it takes to be fully charged
 */
function charge() {
  return Math.min(CHARGE_TIME, stage.score.counters.get(ScoreService.STOPWATCH) + stage.score.counters.get("bonus"));
}
// ANCHOR_END: charge_fn

// call the function that starts running the game in the `game-player` div
// tag of `index.html`
initializeAndLaunch("game-player", new Config(), builder);
