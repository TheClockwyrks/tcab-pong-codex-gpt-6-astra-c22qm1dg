import type { DeepReadonly } from "ts-essentials";
import type { BallState, CaromState, ObstacleState, PaddleState } from "./game";
import * as C from "./constants";
import { clamp } from "./world";

type MovingBall = { -readonly [K in keyof BallState]: BallState[K] };
type Cues = Set<C.CueName>;

function paddleContact(
  b: MovingBall,
  p: DeepReadonly<PaddleState>,
  left: boolean,
  cues: Cues,
): void {
  const x0 = left ? C.P1_X0 : C.P2_X0;
  const x1 = left ? C.P1_X1 : C.P2_X1;
  const y0 = p.cy - C.PADDLE_HALF;
  const y1 = p.cy + C.PADDLE_HALF;
  if (
    b.x <= x0 - C.BALL_R ||
    b.x >= x1 + C.BALL_R ||
    b.y <= y0 - C.BALL_R ||
    b.y >= y1 + C.BALL_R
  )
    return;
  const depths = [
    b.x - (x0 - C.BALL_R),
    x1 + C.BALL_R - b.x,
    b.y - (y0 - C.BALL_R),
    y1 + C.BALL_R - b.y,
  ];
  const face = depths.indexOf(Math.min(...depths));
  if (face < 2) {
    const angle =
      clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
    const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
    b.vx = (left ? 1 : -1) * speed * Math.cos(angle);
    b.vy = speed * Math.sin(angle);
    b.spin = clamp(
      b.spin + p.vy * C.SPIN_FROM_PADDLE,
      -C.SPIN_CLAMP,
      C.SPIN_CLAMP,
    );
    b.x = left ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
    cues.add(C.CUES.paddleHit);
  } else {
    b.y = face === 2 ? y0 - C.BALL_R : y1 + C.BALL_R;
    if ((face === 2 && b.vy > 0) || (face === 3 && b.vy < 0)) {
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
  }
}

function obstacleContact(
  b: MovingBall,
  o: DeepReadonly<ObstacleState>,
  cues: Cues,
): void {
  const cos = Math.cos(o.theta),
    sin = Math.sin(o.theta);
  const dx = b.x - o.cx,
    dy = b.y - o.cy;
  const lx = dx * cos + dy * sin,
    ly = -dx * sin + dy * cos;
  const qx = clamp(lx, -C.OBSTACLE_HW, C.OBSTACLE_HW);
  const qy = clamp(ly, -C.OBSTACLE_HH, C.OBSTACLE_HH);
  const distance = Math.hypot(lx - qx, ly - qy);
  if (distance >= C.BALL_R) return;
  let nx: number, ny: number, push: number;
  if (distance > 0) {
    nx = (lx - qx) / distance;
    ny = (ly - qy) / distance;
    push = C.BALL_R - distance;
  } else {
    const px = C.OBSTACLE_HW - Math.abs(lx),
      py = C.OBSTACLE_HH - Math.abs(ly);
    nx = px <= py ? (lx >= 0 ? 1 : -1) : 0;
    ny = px > py ? (ly >= 0 ? 1 : -1) : 0;
    push = Math.min(px, py) + C.BALL_R;
  }
  const wx = nx * cos - ny * sin,
    wy = nx * sin + ny * cos;
  const dot = b.vx * wx + b.vy * wy;
  if (dot < 0) {
    b.vx -= 2 * dot * wx;
    b.vy -= 2 * dot * wy;
    cues.add(C.CUES.obstacleBounce);
  }
  b.x += wx * push;
  b.y += wy * push;
}

/** Only this private, newly allocated ball is mutable during collision solving. */
export function flyBall(
  state: DeepReadonly<CaromState>,
  dt: number,
  cues: Cues,
): BallState | null {
  if (!state.ball || state.ball.held) return state.ball;
  const b: MovingBall = { ...state.ball };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const angle = (b.spin / speed) * h,
        cos = Math.cos(angle),
        sin = Math.sin(angle);
      const vx = b.vx * cos - b.vy * sin;
      b.vy = b.vx * sin + b.vy * cos;
      b.vx = vx;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      cues.add(C.CUES.wallBounce);
    }
    paddleContact(b, state.paddles.left, true, cues);
    paddleContact(b, state.paddles.right, false, cues);
    for (const o of state.obstacles) obstacleContact(b, o, cues);
  }
  return b;
}
