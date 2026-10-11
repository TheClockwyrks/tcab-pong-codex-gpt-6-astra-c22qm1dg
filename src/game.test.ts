import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import type { Engine } from "@clockwyrks/simple-2d";
import { BACKGROUND, game } from "./game";
import type { CaromState, CaromDebugApi, Screen } from "./game";
import * as C from "./constants";

const engines: Engine<CaromState, CaromDebugApi>[] = [];
afterEach(() => {
  for (const e of engines) e.destroy();
  engines.length = 0;
});
async function harness(step = 8) {
  const target = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const e = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    background: BACKGROUND,
    clock: new ConstantClock(step),
    layout: C.LAYOUT,
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  engines.push(e);
  const cues: string[] = [];
  e.events.on("cue:played", (event) => cues.push(event.cue));
  await e.initialize();
  const d = e.debug;
  const key = (code: string, down = true) =>
    target.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const tap = async (code: string) => {
    key(code);
    await e.advance(1);
    key(code, false);
  };
  const pointer = (
    type: "down" | "move" | "up",
    x: number,
    y: number,
    id = 1,
    device = "mouse",
  ) =>
    target.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: id === 1,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const pose = (x = C.FIELD_CX, y = C.FIELD_CY, vx = 400, vy = 0, spin = 0) => {
    e.apply((s) => d.clearWorld(s));
    e.apply((s) => d.spawnBall(s));
    e.apply((s) => d.setScreen(s, "playing"));
    e.apply((s) => d.setMode(s, "versus"));
    e.apply((s) => d.setBallHeld(s, false));
    e.apply((s) => d.setBallPosition(s, x, y));
    e.apply((s) => d.setBallVelocity(s, vx, vy));
    e.apply((s) => d.setBallSpin(s, spin));
  };
  return { e, d, key, tap, pointer, pose, cues, canvas };
}

describe("state and debug contract", () => {
  it("initializes the complete immutable world and diagnostics", async () => {
    const { e, d } = await harness();
    const s = d.snapshot(e.state);
    expect(s.version).toBe(C.CAROM_DEBUG_VERSION);
    expect(s.screen).toBe("title");
    expect(s.ball?.held).toBe(true);
    expect(s.ball?.holdTimer).toBe(C.HOLD_TIME);
    expect(s.obstacles).toHaveLength(2);
    expect(s.obstacles[0]).toEqual({
      index: 0,
      cx: C.OBSTACLE_CENTERS[0].x,
      cy: C.OBSTACLE_CENTERS[0].y,
      theta: 0,
    });
    const previous = structuredClone(e.state);
    const next = d.setScore(e.state, 5, 7);
    expect(e.state).toEqual(previous);
    expect(next.score).toEqual({ p1: 5, p2: 7 });
    expect(e.diagnostics().every((r) => r.error === undefined)).toBe(true);
    expect(e.diagnostics().length).toBeGreaterThanOrEqual(11);
  });
  it("poses every independent field, reports velocity-derived speed, and resets", async () => {
    const { e, d } = await harness();
    e.apply((s) => d.setMode(s, "versus"));
    e.apply((s) => d.setScreen(s, "paused"));
    e.apply((s) => d.setMenuIndex(s, 2));
    e.apply((s) => d.setTitleIndex(s, 1));
    e.apply((s) => d.setResumeScreen(s, "countdown"));
    e.apply((s) => d.setScore(s, 4, 9));
    e.apply((s) => d.setWinner(s, "right"));
    e.apply((s) => d.setReceiver(s, "right"));
    e.apply((s) => d.setPaddleCy(s, "left", 219));
    e.apply((s) => d.setPaddleVy(s, "left", 123));
    e.apply((s) => d.setPaddleDriven(s, "left", true));
    e.apply((s) => d.setAiTracking(s, false));
    e.apply((s) => d.setAiMovement(s, false));
    e.apply((s) => d.setBallPosition(s, 321, 123));
    e.apply((s) => d.setBallVelocity(s, 300, 400));
    e.apply((s) => d.setBallSpin(s, 81));
    e.apply((s) => d.setBallHeld(s, false));
    e.apply((s) => d.setBallHoldTimer(s, 0.2));
    e.apply((s) => d.setBallServeSign(s, -1));
    e.apply((s) => d.setMuted(s, true));
    e.apply((s) => d.setObstacleClockRunning(s, false));
    e.apply((s) => d.setObstacleClock(s, 0.7));
    const snap = d.snapshot(e.state);
    expect(snap.ball).toMatchObject({
      x: 321,
      y: 123,
      vx: 300,
      vy: 400,
      speed: 500,
      spin: 81,
      held: false,
      holdTimer: 0.2,
      serveSign: -1,
    });
    expect(snap.paddles.left).toEqual({
      cy: 219,
      vy: 0,
      drivenVy: 123,
      driven: true,
    });
    expect(snap.ai).toEqual({ tracking: false, movement: false });
    expect(snap).toMatchObject({
      screen: "paused",
      mode: "versus",
      menuIndex: 2,
      titleIndex: 1,
      resumeScreen: "countdown",
      winner: "right",
      receiver: "right",
      muted: true,
      obstacleClock: 0.7,
      obstacleClockRunning: false,
    });
    e.apply((s) => d.reset(s));
    expect(e.state).toMatchObject({
      screen: "title",
      mode: "solo",
      menuIndex: 0,
      titleIndex: 0,
      simTime: 0,
      muted: true,
      winner: null,
    });
    expect(e.state.paddles.left.driven).toBe(false);
    expect(e.state.ai.movement).toBe(true);
  });
  it("clears and respawns entities; absent ball poses and invalid obstacles throw", async () => {
    const { e, d } = await harness();
    e.apply((s) => d.clearWorld(s));
    expect(d.snapshot(e.state).ball).toBeNull();
    expect(e.state.obstacles).toEqual([]);
    expect(() => d.setBallPosition(e.state, 1, 2)).toThrow("No ball");
    expect(() => d.setBallVelocity(e.state, 1, 2)).toThrow();
    expect(() => d.setBallHeld(e.state, true)).toThrow();
    expect(() => d.spawnObstacle(e.state, 2)).toThrow();
    e.apply((s) => d.setScreen(s, "playing"));
    await e.advance(4);
    expect(e.state.score).toEqual({ p1: 0, p2: 0 });
    e.apply((s) => d.spawnObstacle(s, 1));
    e.apply((s) => d.spawnObstacle(s, 0));
    e.apply((s) => d.spawnObstacle(s, 1));
    expect(e.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    e.apply((s) => d.spawnBall(s));
    expect(e.state.ball?.held).toBe(true);
  });
  it("reconciles idempotently without serving, collisions, clocks, or sound", async () => {
    const { e, d, cues } = await harness();
    e.apply((s) => d.setBallPosition(s, C.P1_X0, C.FIELD_CY));
    e.apply((s) => d.setBallHoldTimer(s, 0));
    e.apply((s) => d.setObstacleClock(s, 1.2));
    const before = structuredClone(e.state);
    e.apply((s) => d.reconcile(s));
    e.apply((s) => d.reconcile(s));
    expect(e.state).toEqual(before);
    expect(cues).toEqual([]);
    expect(e.state.obstacles[0].theta).toBeCloseTo(C.OBSTACLE_SPIN_RATE * 1.2);
  });
  it("draws both serve signs without changing other ball fields", async () => {
    const { e, d } = await harness();
    const signs = new Set<number>();
    const initial = e.state.ball!;
    for (let i = 0; i < 100; i++) {
      e.apply((s) => d.drawBallServeSign(s));
      signs.add(e.state.ball!.serveSign);
      expect({ ...e.state.ball, serveSign: initial.serveSign }).toEqual(
        initial,
      );
    }
    expect(signs.size).toBe(2);
  });
});

describe("menus and controls", () => {
  it("wraps, prioritizes up and movement, and remembers the confirmed title item", async () => {
    const { e, key, tap } = await harness();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(2);
    key("KeyW", false);
    key("KeyS", false);
    key("Enter", false);
    await tap("Enter");
    expect(e.state.screen).toBe("howto");
    expect(e.state.titleIndex).toBe(2);
    await tap("Escape");
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(2);
    await tap("ArrowDown");
    expect(e.state.menuIndex).toBe(0);
    await tap("Escape");
    expect(e.state.screen).toBe("title");
  });
  it("starts versus, pauses once on Escape, resumes, restarts, and quits", async () => {
    const { e, d, tap } = await harness();
    await tap("KeyS");
    await tap("Space");
    expect(e.state.mode).toBe("versus");
    expect(e.state.screen).toBe("countdown");
    expect(e.state.ball!.holdTimer).toBeLessThan(C.HOLD_TIME);
    await tap("Escape");
    expect(e.state.screen).toBe("paused");
    const frozen = {
      ball: e.state.ball,
      paddles: e.state.paddles,
      obstacles: e.state.obstacles,
    };
    const time = e.state.simTime;
    await e.advance(10);
    expect({
      ball: e.state.ball,
      paddles: e.state.paddles,
      obstacles: e.state.obstacles,
    }).toEqual(frozen);
    expect(e.state.simTime).toBeGreaterThan(time);
    await tap("Escape");
    expect(e.state.screen).toBe("countdown");
    e.apply((s) => d.setScore(s, 4, 5));
    await tap("KeyP");
    await tap("KeyS");
    await tap("Enter");
    expect(e.state.score).toEqual({ p1: 0, p2: 0 });
    expect(e.state.screen).toBe("countdown");
    await tap("KeyP");
    await tap("KeyW");
    await tap("Enter");
    expect(e.state.screen).toBe("title");
    expect(e.state.mode).toBe("solo");
    expect(e.state.menuIndex).toBe(1);
  });
  it("confirms pointer and touch only when both edges share an item", async () => {
    const { e, d, pointer } = await harness();
    const r0 = d.menuItemRect(e.state, 0)!,
      r1 = d.menuItemRect(e.state, 1)!;
    pointer("down", r0.x + 20, r0.y + 20);
    await e.advance(1);
    pointer("up", r1.x + 20, r1.y + 20);
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    pointer("down", 10, 10);
    pointer("up", r0.x + 20, r0.y + 20);
    await e.advance(1);
    expect(e.state.screen).toBe("title");
    pointer("down", r1.x + 20, r1.y + 20, 2, "touch");
    await e.advance(1);
    pointer("up", r1.x + 20, r1.y + 20, 2, "touch");
    await e.advance(1);
    expect(e.state.mode).toBe("versus");
    expect(e.state.screen).toBe("countdown");
    expect(d.menuItemRect(e.state, 0)).toBeNull();
    expect(d.menuItemRect(e.state, -1)).toBeNull();
  });
  it("supports a same-frame click and gives keyboard confirmation priority", async () => {
    const { e, d, key, pointer } = await harness();
    const r = d.menuItemRect(e.state, 1)!;
    key("Enter");
    pointer("down", r.x + 20, r.y + 20);
    pointer("up", r.x + 20, r.y + 20);
    await e.advance(1);
    expect(e.state.mode).toBe("solo");
    e.apply((s) => d.reset(s));
    key("Enter", false);
    pointer("down", r.x + 20, r.y + 20);
    pointer("up", r.x + 20, r.y + 20);
    await e.advance(1);
    expect(e.state.mode).toBe("versus");
  });
  it("pointer selection follows keyboard movement, and how-to confirm returns", async () => {
    const { e, d, key, pointer, tap } = await harness();
    const r = d.menuItemRect(e.state, 2)!;
    key("KeyS");
    pointer("move", r.x + 20, r.y + 20);
    await e.advance(1);
    key("KeyS", false);
    expect(e.state.menuIndex).toBe(2);
    await tap("Enter");
    expect(d.menuItemRect(e.state, 1)).toBeNull();
    await tap("Enter");
    expect(e.state.screen).toBe("title");
  });
  it("mute works on every screen and debug mute reaches the cue bus", async () => {
    const { e, d, tap, pose } = await harness();
    for (const screen of [
      "title",
      "howto",
      "playing",
      "countdown",
      "paused",
      "matchover",
    ] as Screen[]) {
      e.apply((s) => d.setScreen(s, screen));
      const muted = e.state.muted;
      await tap("KeyM");
      expect(e.state.muted).toBe(!muted);
    }
    let gain = -1;
    e.events.on("cue:played", (v) => {
      gain = v.gain;
    });
    e.apply((s) => d.setMuted(s, true));
    pose(500, C.BALL_R + 1, 0, -500);
    await e.advance(1);
    expect(gain).toBe(0);
  });
});

describe("paddles, serving, and AI", () => {
  it("moves both paddles during hold; solo arrows move left only", async () => {
    const { e, d, key, tap } = await harness(10);
    await tap("Enter");
    key("ArrowDown");
    await e.advance(5);
    key("ArrowDown", false);
    expect(e.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.05,
    );
    expect(e.state.paddles.right.cy).toBe(C.FIELD_CY);
    e.apply((s) => d.setMode(s, "versus"));
    key("KeyW");
    key("ArrowDown");
    await e.advance(5);
    expect(e.state.paddles.left.cy).toBeCloseTo(C.FIELD_CY);
    expect(e.state.paddles.right.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.05,
    );
  });
  it("serves at the end of the timer without advancing position that frame", async () => {
    const { e, d } = await harness(10);
    e.apply((s) => d.setScreen(s, "countdown"));
    e.apply((s) => d.setBallHoldTimer(s, 0.01));
    e.apply((s) => d.setBallServeSign(s, -1));
    await e.advance(1);
    expect(e.state.screen).toBe("playing");
    expect(e.state.ball).toMatchObject({
      held: false,
      holdTimer: 0,
      x: C.FIELD_CX,
      y: C.FIELD_CY,
      serveSign: -1,
    });
    expect(e.state.ball!.vx).toBeCloseTo(
      -C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    expect(e.state.ball!.vy).toBeCloseTo(
      -C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
    );
    await e.advance(1);
    expect(e.state.ball!.x).toBeLessThan(C.FIELD_CX);
    e.apply((s) => d.spawnBall(s));
    e.apply((s) => d.setScreen(s, "countdown"));
    e.apply((s) => d.setReceiver(s, "right"));
    e.apply((s) => d.setBallHoldTimer(s, 0));
    await e.advance(1);
    expect(e.state.ball!.vx).toBeGreaterThan(0);
  });
  it("drives independently, retains drivenVy, and integrates the actual clamped velocity", async () => {
    const { e, d } = await harness(10);
    e.apply((s) => d.setScreen(s, "countdown"));
    e.apply((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    expect(e.state.paddles.left.vy).toBe(0);
    e.apply((s) => d.setPaddleDriven(s, "left", true));
    e.apply((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 1));
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBeCloseTo(100);
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(0);
    expect(e.state.paddles.left.drivenVy).toBe(C.PADDLE_SPEED);
    e.apply((s) => d.setPaddleVy(s, "left", -C.PADDLE_SPEED));
    await e.advance(1);
    expect(e.state.paddles.left.cy).toBeCloseTo(C.PADDLE_MAX_CY - 7.2);
  });
  it("AI tracks with lag, gates faculties, returns home, and yields to a driver", async () => {
    const { e, d, pose } = await harness(10);
    pose(800, 600, 400, 100);
    e.apply((s) => d.setMode(s, "solo"));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(C.AI_SPEED);
    e.apply((s) => d.setAiMovement(s, false));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
    e.apply((s) => d.setAiMovement(s, true));
    e.apply((s) => d.setAiTracking(s, false));
    e.apply((s) => d.setPaddleCy(s, "right", 600));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(-C.AI_SPEED);
    e.apply((s) => d.setPaddleDriven(s, "right", true));
    e.apply((s) => d.setPaddleVy(s, "right", 200));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(200);
  });
  it("freezes every inactive screen while simulation time continues", async () => {
    const { e, d } = await harness();
    for (const screen of [
      "title",
      "howto",
      "paused",
      "matchover",
    ] as Screen[]) {
      e.apply((s) => d.setScreen(s, screen));
      const before = structuredClone(e.state);
      await e.advance(2);
      expect(e.state.ball).toEqual(before.ball);
      expect(e.state.obstacles).toEqual(before.obstacles);
      expect(e.state.paddles).toEqual(before.paddles);
      expect(e.state.simTime).toBeGreaterThan(before.simTime);
    }
  });
});

describe("frozen presentation", () => {
  it("keeps the ball trail visually frozen throughout a pause", async () => {
    const { e, pose, tap, canvas } = await harness();
    pose(300, 350, 400, 80);
    await e.advance(10);
    await tap("KeyP");
    const before = canvas.toBuffer("image/png");
    await e.advance(40);
    expect(canvas.toBuffer("image/png")).toEqual(before);
  });
});

describe("flight, contacts, and scoring", () => {
  it("turns by spin while preserving speed, decays by half, and bounds the trail by time", async () => {
    const { e, pose } = await harness(8);
    pose(300, 350, 400, 0, 180);
    await e.advance(100);
    expect(e.state.ball!.spin).toBeCloseTo(90, 8);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(400, 8);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(
      e.state.ball!.trail.every((p) => e.state.simTime - p.t <= C.TRAIL_TIME),
    ).toBe(true);
    expect(e.state.ball!.trail.length).toBeGreaterThan(10);
  });
  it("reflects both walls, preserves spin except decay, and deduplicates frame cues", async () => {
    const { e, pose, cues } = await harness(16);
    pose(700, C.BALL_R + 1, 0, -980, 30);
    await e.advance(1);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(e.state.ball!.y).toBeGreaterThanOrEqual(C.BALL_R);
    expect(cues).toEqual([C.CUES.wallBounce]);
    pose(700, C.FIELD_H - C.BALL_R - 1, 0, 980);
    await e.advance(1);
    expect(e.state.ball!.vy).toBeLessThan(0);
    expect(cues).toHaveLength(2);
  });
  it.each(["left", "right"] as const)(
    "bounces off the %s paddle, accelerates and adds integrated paddle spin",
    async (side) => {
      const { e, d, pose, cues } = await harness(8);
      const left = side === "left";
      pose(
        left ? C.P1_X1 + C.BALL_R + 2 : C.P2_X0 - C.BALL_R - 2,
        C.FIELD_CY + 3,
        left ? -600 : 600,
        0,
      );
      e.apply((s) => d.setPaddleDriven(s, side, true));
      e.apply((s) => d.setPaddleVy(s, side, 200));
      await e.advance(1);
      expect(Math.sign(e.state.ball!.vx)).toBe(left ? 1 : -1);
      expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
        600 * C.SPEED_MULT,
      );
      expect(e.state.ball!.spin).toBeGreaterThan(160);
      expect(cues).toEqual([C.CUES.paddleHit]);
    },
  );
  it("caps paddle speed and spin and preserves a stationary paddle's spin", async () => {
    const { e, d, pose } = await harness(4);
    pose(C.P1_X1 + C.BALL_R + 1, C.FIELD_CY, -C.SPEED_CAP, 0, 850);
    e.apply((s) => d.setPaddleDriven(s, "left", true));
    e.apply((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    await e.advance(1);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(
      C.SPEED_CAP,
    );
    expect(e.state.ball!.spin).toBeLessThanOrEqual(C.SPIN_CLAMP);
    expect(e.state.ball!.spin).toBeGreaterThan(895);
  });
  it("resolves paddle end caps like walls without speed or spin injection", async () => {
    const { e, pose, cues } = await harness(8);
    pose(
      (C.P1_X0 + C.P1_X1) / 2,
      C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1,
      0,
      600,
      50,
    );
    await e.advance(1);
    expect(e.state.ball!.vy).toBeLessThan(0);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(600);
    expect(cues).toEqual([C.CUES.wallBounce]);
  });
  it("reflects an oriented obstacle along its world normal, retaining speed", async () => {
    const { e, d, pose, cues } = await harness(4);
    const t = 0.75,
      theta = C.OBSTACLE_SPIN_RATE * t;
    const cy =
      C.OBSTACLE_CENTERS[0].y +
      C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD);
    const nx = Math.cos(theta),
      ny = Math.sin(theta);
    pose(
      C.OBSTACLE_CENTERS[0].x + (C.OBSTACLE_HW + C.BALL_R + 1) * nx,
      cy + (C.OBSTACLE_HW + C.BALL_R + 1) * ny,
      -600 * nx,
      -600 * ny,
      10,
    );
    e.apply((s) => d.setObstacleClock(s, t));
    e.apply((s) => d.setObstacleClockRunning(s, false));
    e.apply((s) => d.spawnObstacle(s, 0));
    await e.advance(1);
    expect(e.state.ball!.vx).toBeGreaterThan(0);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(Math.hypot(e.state.ball!.vx, e.state.ball!.vy)).toBeCloseTo(600);
    expect(cues).toEqual([C.CUES.obstacleBounce]);
    expect(e.state.obstacleClock).toBe(t);
  });
  it("pushes an embedded stationary ball out of an obstacle without a false cue", async () => {
    const { e, d, pose, cues } = await harness(8);
    const center = C.OBSTACLE_CENTERS[0];
    pose(center.x, center.y, 0, 0);
    e.apply((s) => d.spawnObstacle(s, 0));
    e.apply((s) => d.setObstacleClockRunning(s, false));
    await e.advance(1);
    expect(e.state.ball!.x).toBe(center.x + C.OBSTACLE_HW + C.BALL_R);
    expect(cues).toEqual([]);
  });
  it("advances mirrored obstacle poses from one clock and holds on pause", async () => {
    const { e, d } = await harness(10);
    e.apply((s) => d.setScreen(s, "countdown"));
    await e.advance(40);
    expect(e.state.obstacleClock).toBeCloseTo(0.4);
    expect(e.state.obstacles[0].cy + e.state.obstacles[1].cy).toBeCloseTo(
      C.FIELD_H,
    );
    expect(e.state.obstacles[1].theta).toBeCloseTo(0.4 * C.OBSTACLE_SPIN_RATE);
    e.apply((s) => d.setScreen(s, "paused"));
    await e.advance(5);
    expect(e.state.obstacleClock).toBeCloseTo(0.4);
  });
  it("scores only after the entire ball passes the edge and serves toward the receiver", async () => {
    const { e, pose, cues } = await harness(8);
    pose(C.FIELD_W + C.BALL_R - 5, 80, 500, 0);
    await e.advance(1);
    expect(e.state.score.p1).toBe(0);
    await e.advance(1);
    expect(e.state.score.p1).toBe(1);
    expect(e.state.receiver).toBe("right");
    expect(e.state.screen).toBe("countdown");
    expect(e.state.ball!.trail).toEqual([]);
    expect(e.state.ball!.holdTimer).toBe(C.HOLD_TIME);
    expect(cues).toEqual([C.CUES.score]);
  });
  it("plays through deuce, ends with a two-point lead, and supports rematch and menu", async () => {
    const { e, d, pose, tap } = await harness(8);
    e.apply((s) => d.setScore(s, 10, 10));
    pose(C.FIELD_W + C.BALL_R + 1, 100, 100, 0);
    await e.advance(1);
    expect(e.state.score.p1).toBe(11);
    expect(e.state.screen).toBe("countdown");
    pose(C.FIELD_W + C.BALL_R + 1, 100, 100, 0);
    await e.advance(1);
    expect(e.state.screen).toBe("matchover");
    expect(e.state.winner).toBe("left");
    expect(e.state.ball!.x).toBeGreaterThan(C.FIELD_W);
    await tap("Enter");
    expect(e.state.screen).toBe("countdown");
    e.apply((s) => d.setScore(s, 0, 10));
    pose(-C.BALL_R - 1, 100, -100, 0);
    await e.advance(1);
    expect(e.state.winner).toBe("right");
    await tap("Escape");
    expect(e.state.screen).toBe("title");
  });
  it("agrees on contacts and scoring at 2ms and 16ms frame lengths", async () => {
    const run = async (step: number) => {
      const { e, d, pose, cues } = await harness(step);
      pose(300, C.FIELD_CY, -600, 0, 0);
      e.apply((s) => d.setPaddleCy(s, "right", C.PADDLE_MIN_CY));
      let elapsed = 0;
      while (e.state.score.p1 === 0 && elapsed < 4000) {
        await e.advance(1);
        elapsed += step;
      }
      return { score: e.state.score, cues, elapsed };
    };
    const a = await run(2),
      b = await run(16);
    expect(a.score).toEqual(b.score);
    expect(a.cues).toEqual(b.cues);
    expect(Math.abs(a.elapsed - b.elapsed) / a.elapsed).toBeLessThan(0.08);
  });
});
