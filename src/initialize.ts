import type { InitApi } from "@clockwyrks/simple-2d";
import type { CaromState, CaromDebugApi } from "./game";
import * as C from "./constants";
import { initialState } from "./world";
import { createDebug } from "./debug";

export function initialize(
  api: InitApi<CaromState>,
): [CaromState, CaromDebugApi] {
  for (const name of C.ACTIONS)
    api.input.register(name, { keys: [...C.BINDINGS[name]] });
  api.audio.define(C.CUES.paddleHit, {
    wave: "triangle",
    freq: 540,
    freqTo: 270,
    durationMs: 75,
    gain: 0.18,
  });
  api.audio.define(C.CUES.wallBounce, {
    freq: 250,
    freqTo: 190,
    durationMs: 45,
    gain: 0.13,
  });
  api.audio.define(C.CUES.obstacleBounce, {
    wave: "triangle",
    freq: 870,
    freqTo: 470,
    durationMs: 95,
    gain: 0.14,
  });
  api.audio.define(C.CUES.score, {
    wave: "sine",
    freq: 420,
    freqTo: 840,
    durationMs: 230,
    gain: 0.2,
  });
  api.diagnostics.register("screen", (s) => s.screen);
  api.diagnostics.register("mode", (s) => s.mode);
  api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
  api.diagnostics.register("ball position", (s) =>
    s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "absent",
  );
  api.diagnostics.register("ball velocity", (s) =>
    s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "absent",
  );
  api.diagnostics.register("ball speed", (s) =>
    s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0,
  );
  api.diagnostics.register("spin", (s) => s.ball?.spin ?? 0);
  for (const side of ["left", "right"] as const) {
    api.diagnostics.register(`${side} center`, (s) => s.paddles[side].cy);
    api.diagnostics.register(`${side} velocity`, (s) => s.paddles[side].vy);
  }
  return [initialState(), createDebug()];
}
