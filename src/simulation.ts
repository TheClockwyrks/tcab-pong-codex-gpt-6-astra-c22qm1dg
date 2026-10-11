import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, PaddleState, Side } from "./game";
import * as C from "./constants";
import { clamp, parkedBall, reconcile } from "./world";
import { readMenus } from "./menus";
import { flyBall } from "./physics";

function integrate(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const proposed = p.cy + vy * dt;
  const cy = clamp(proposed, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: cy !== proposed && dt > 0 ? (cy - p.cy) / dt : vy };
}
function movePaddles(
  s: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  const held = (name: C.ActionName) => api.input.value(name) > 0;
  const solo = s.mode === "solo";
  const up = held("p1-up") || (solo && held("p2-up"));
  const down = held("p1-down") || (solo && held("p2-down"));
  let rightVy =
    (Number(held("p2-down")) - Number(held("p2-up"))) * C.PADDLE_SPEED;
  if (solo) {
    const defend =
      s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
    const target =
      defend && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - s.paddles.right.cy;
    const deadzone = defend ? C.AI_DEADZONE : C.AI_HOME_DEADZONE;
    rightVy =
      !s.ai.movement || Math.abs(diff) <= deadzone
        ? 0
        : Math.sign(diff) *
          Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : C.AI_SPEED);
  }
  const left = s.paddles.left,
    right = s.paddles.right;
  return {
    ...s,
    paddles: {
      left: integrate(
        left,
        left.driven
          ? left.drivenVy
          : (Number(down) - Number(up)) * C.PADDLE_SPEED,
        dt,
      ),
      right: integrate(right, right.driven ? right.drivenVy : rightVy, dt),
    },
  };
}
function scorePoint(s: DeepReadonly<CaromState>, scorer: Side): CaromState {
  const score = {
    p1: s.score.p1 + Number(scorer === "left"),
    p2: s.score.p2 + Number(scorer === "right"),
  };
  const win =
    (score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD) ||
    (score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD);
  return win
    ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
    : {
        ...s,
        score,
        receiver: scorer === "left" ? "right" : "left",
        ball: parkedBall(),
        screen: "countdown",
      };
}
export function update(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = readMenus(state, api);
  s = { ...s, simTime: s.simTime + dt };
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  s = movePaddles(s, api, dt);
  const cues = new Set<C.CueName>();
  if (s.ball) {
    if (s.ball.held) {
      const holdTimer = Math.max(0, s.ball.holdTimer - dt);
      s = { ...s, ball: { ...s.ball, holdTimer } };
      if (holdTimer <= 0 && s.ball) {
        s = {
          ...s,
          screen: "playing",
          ball: {
            ...s.ball,
            held: false,
            trail: [],
            vx:
              (s.receiver === "left" ? -1 : 1) *
              C.SERVE_SPEED *
              Math.cos(C.SERVE_ANGLE),
            vy: s.ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          },
        };
      }
    } else if (s.screen === "playing") s = { ...s, ball: flyBall(s, dt, cues) };
    if (s.ball) {
      s = {
        ...s,
        ball: {
          ...s.ball,
          trail: [
            ...s.ball.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
            { x: s.ball.x, y: s.ball.y, t: s.simTime },
          ],
        },
      };
      if (
        s.ball &&
        (s.ball.x - C.BALL_R > C.FIELD_W || s.ball.x + C.BALL_R < 0)
      ) {
        const scorer = s.ball.x > C.FIELD_W ? "left" : "right";
        s = scorePoint(s, scorer);
        cues.add(C.CUES.score);
      }
    }
  }
  // All substeps see the frame's opening obstacle pose.
  if (s.obstacleClockRunning)
    s = reconcile({ ...s, obstacleClock: s.obstacleClock + dt });
  for (const cue of cues) api.audio.play(cue);
  return s;
}
