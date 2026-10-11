import type { DeepReadonly } from "ts-essentials";
import type { RenderApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import { BACKGROUND } from "./game";
import * as C from "./constants";
import { menuItemRect, menuItems } from "./menus";

const P = {
  white: "#edf5ef",
  muted: "#81959b",
  line: "#26383f",
  mint: "#88f3cb",
  coral: "#ff8e78",
  amber: "#edbf73",
  panel: "#111f27",
};
type Context = CanvasRenderingContext2D;
function text(
  ctx: Context,
  str: string,
  x: number,
  y: number,
  size = 14,
  color: string = P.white,
  weight = 500,
  align: CanvasTextAlign = "left",
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Arial", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}
function mono(
  ctx: Context,
  str: string,
  x: number,
  y: number,
  color: string = P.muted,
  align: CanvasTextAlign = "left",
): void {
  ctx.fillStyle = color;
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}
function line(
  ctx: Context,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string = P.line,
  width = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function box(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 8,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();
}
function circle(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function arrow(ctx: Context, x: number, y: number, color: string): void {
  line(ctx, x - 14, y, x + 8, y, color, 2);
  line(ctx, x + 2, y - 6, x + 8, y, color, 2);
  line(ctx, x + 2, y + 6, x + 8, y, color, 2);
}
function grid(ctx: Context): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#18282f";
  for (let x = 24; x < C.FIELD_W; x += 32)
    for (let y = 24; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
}
function footer(ctx: Context, s: DeepReadonly<CaromState>): void {
  line(ctx, 40, 674, C.FIELD_W - 40, 674);
  mono(ctx, "CAROM  /  A GAME OF ANGLES", 40, 697);
  mono(
    ctx,
    `M  ${s.muted ? "SOUND OFF" : "SOUND ON"}`,
    C.FIELD_W - 40,
    697,
    s.muted ? P.coral : P.muted,
    "right",
  );
}
function menu(ctx: Context, s: DeepReadonly<CaromState>): void {
  menuItems(s).forEach((label, index) => {
    const r = menuItemRect(s, index)!;
    const selected = index === s.menuIndex;
    box(ctx, r.x, r.y, r.w, r.h, selected ? P.mint : P.panel, 5);
    text(
      ctx,
      label,
      r.x + 22,
      r.y + r.h / 2,
      16,
      selected ? BACKGROUND : P.white,
      700,
    );
    if (selected) arrow(ctx, r.x + r.w - 28, r.y + r.h / 2, BACKGROUND);
    else
      mono(
        ctx,
        `0${index + 1}`,
        r.x + r.w - 22,
        r.y + r.h / 2,
        P.muted,
        "right",
      );
  });
}
function emblem(ctx: Context, x: number, y: number): void {
  box(ctx, x, y, 5, 24, P.mint, 2);
  box(ctx, x + 27, y, 5, 24, P.coral, 2);
  circle(ctx, x + 16, y + 12, 4, P.white);
}

function title(ctx: Context, s: DeepReadonly<CaromState>): void {
  emblem(ctx, 100, 72);
  mono(ctx, "INDEPENDENT ARCADE  /  01", 148, 84);
  text(ctx, C.TITLE_TEXT, 92, 212, 112, P.white, 900);
  text(ctx, "Every angle is an opening.", 100, 294, 23, P.muted, 400);
  menu(ctx, s);
  mono(ctx, "W / S  OR  ↑ / ↓   SELECT", 100, 584);
  mono(ctx, "ENTER   PLAY", 100, 606, P.mint);
  // An editorial court diagram: the same paddles, ball, and banking geometry.
  const x = 577,
    y = 116,
    w = 610,
    h = 454;
  box(ctx, x, y, w, h, "#0f1e25", 16);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 22, y + 22, w - 44, h - 44);
  ctx.setLineDash([4, 10]);
  line(ctx, x + w / 2, y + 22, x + w / 2, y + h - 22, P.line);
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(806, 260);
  ctx.rotate(-0.38);
  box(ctx, -8, -52, 16, 104, P.amber, 5);
  ctx.restore();
  ctx.save();
  ctx.translate(978, 438);
  ctx.rotate(-0.38);
  box(ctx, -8, -52, 16, 104, P.amber, 5);
  ctx.restore();
  box(ctx, 611, 310, 12, 80, P.mint, 5);
  box(ctx, 1141, 270, 12, 80, P.coral, 5);
  ctx.beginPath();
  ctx.moveTo(624, 350);
  ctx.bezierCurveTo(675, 350, 754, 309, 786, 265);
  ctx.bezierCurveTo(845, 309, 916, 302, 1061, 215);
  ctx.strokeStyle = P.mint;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(1002, 248);
  ctx.quadraticCurveTo(1033, 232, 1061, 215);
  ctx.strokeStyle = "#bbdcd4";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.stroke();
  circle(ctx, 1061, 215, 11, P.white);
  circle(ctx, 1061, 215, 20, "#edf5ef0c");
  mono(ctx, "01  /  ADD SPIN", 661, 399, P.mint);
  mono(ctx, "02  /  FIND THE BANK", 884, 515, P.amber);
  line(ctx, 1034, 244, 1090, 283, P.line);
  mono(ctx, "YOUR NEXT", 1081, 306, P.muted, "center");
  mono(ctx, "MOVE.", 1081, 324, P.white, "center");
  text(
    ctx,
    "TWO PADDLES. INFINITE POSSIBILITIES.",
    x + 5,
    613,
    13,
    P.muted,
    600,
  );
  footer(ctx, s);
}
function field(ctx: Context, s: DeepReadonly<CaromState>): void {
  // True walls and goal lanes remain visible behind every rally.
  line(ctx, 0, 2, C.FIELD_W, 2, P.line, 4);
  line(ctx, 0, C.FIELD_H - 2, C.FIELD_W, C.FIELD_H - 2, P.line, 4);
  ctx.setLineDash([5, 13]);
  line(ctx, C.NET_X, 104, C.NET_X, C.FIELD_H - 45, P.line);
  ctx.setLineDash([]);
  ctx.strokeStyle = "#26383f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 62, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, C.P1_X0 - 18, 26, C.P1_X0 - 18, C.FIELD_H - 26, "#88f3cb13");
  line(ctx, C.P2_X1 + 18, 26, C.P2_X1 + 18, C.FIELD_H - 26, "#ff8e7813");
  // Quiet, compact HUD leaves the court's central trajectory unobstructed.
  box(ctx, 396, 16, 488, 80, BACKGROUND, 12);
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    520,
    59,
    48,
    P.mint,
    700,
    "center",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    760,
    59,
    48,
    P.coral,
    700,
    "center",
  );
  mono(
    ctx,
    s.mode === "solo" ? "SOLO / CPU" : "LOCAL / VERSUS",
    C.FIELD_CX,
    43,
    P.white,
    "center",
  );
  mono(
    ctx,
    `FIRST TO ${C.WIN_SCORE} · WIN BY ${C.WIN_LEAD}`,
    C.FIELD_CX,
    66,
    P.muted,
    "center",
  );
  mono(
    ctx,
    s.mode === "solo" ? "YOU  /  W S OR ↑ ↓" : "01  /  W S",
    100,
    35,
    P.mint,
  );
  mono(
    ctx,
    s.mode === "solo" ? "CPU  /  02" : "02  /  ↑ ↓",
    C.FIELD_W - 100,
    35,
    P.coral,
    "right",
  );
  mono(ctx, C.TITLE_TEXT, 100, C.FIELD_H - 26, P.muted);
  mono(
    ctx,
    `P  PAUSE    M  ${s.muted ? "SOUND OFF" : "SOUND ON"}`,
    C.FIELD_W - 100,
    C.FIELD_H - 26,
    P.muted,
    "right",
  );
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side];
    const x = side === "left" ? C.P1_X0 : C.P2_X0;
    const color = side === "left" ? P.mint : P.coral;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    box(ctx, x, p.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, color, 6);
    ctx.restore();
    box(ctx, x + 5, p.cy - 17, 2, 34, "#0b151b40", 1);
  }
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    ctx.shadowColor = "#edbf7333";
    ctx.shadowBlur = 18;
    box(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      P.amber,
      5,
    );
    ctx.shadowBlur = 0;
    circle(ctx, 0, 0, 3, "#8b6835");
    line(ctx, 0, -C.OBSTACLE_HH + 12, 0, -C.OBSTACLE_HH + 28, "#fff0c4", 2);
    ctx.restore();
  }
  if (s.ball) {
    const b = s.ball;
    ctx.save();
    ctx.lineCap = "round";
    // The sample clock freezes with the ball, including while simTime runs in pause.
    const trailTime = b.trail[b.trail.length - 1]?.t ?? s.simTime;
    for (let i = 1; i < b.trail.length; i++) {
      const prev = b.trail[i - 1],
        p = b.trail[i];
      const fade = Math.max(0, 1 - (trailTime - p.t) / C.TRAIL_TIME);
      ctx.globalAlpha = fade * 0.55;
      line(ctx, prev.x, prev.y, p.x, p.y, P.white, C.BALL_R * 2 * fade);
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = P.white;
    ctx.shadowBlur = 20;
    circle(ctx, b.x, b.y, C.BALL_R, P.white);
    ctx.restore();
    if (b.held && s.screen === "countdown") {
      ctx.beginPath();
      ctx.arc(
        b.x,
        b.y,
        26,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * b.holdTimer) / C.HOLD_TIME,
      );
      ctx.strokeStyle = P.mint;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  if (s.screen === "countdown") {
    text(
      ctx,
      "GET READY",
      C.FIELD_CX,
      C.FIELD_CY + 79,
      19,
      P.white,
      700,
      "center",
    );
    mono(
      ctx,
      s.receiver === "left" ? "←  SERVING LEFT" : "SERVING RIGHT  →",
      C.FIELD_CX,
      C.FIELD_CY + 107,
      P.muted,
      "center",
    );
  } else if (s.ball && !s.ball.held && Math.abs(s.ball.spin) > 20) {
    mono(
      ctx,
      `SPIN  ${s.ball.spin > 0 ? "+" : "−"}${Math.round(Math.abs(s.ball.spin))}`,
      C.FIELD_CX,
      C.FIELD_H - 27,
      P.amber,
      "center",
    );
  }
}
function howto(ctx: Context, s: DeepReadonly<CaromState>): void {
  emblem(ctx, 100, 65);
  mono(ctx, "FIELD GUIDE  /  01", 148, 78);
  text(ctx, "Make your own angle.", 96, 158, 54, P.white, 700);
  text(
    ctx,
    "Meet the ball. Move through the hit. Change the rally.",
    100,
    218,
    21,
    P.muted,
  );
  const columns = [100, 486, 872];
  const heads = ["MOVE", "CURVE", "CAROM"];
  const descriptions = [
    [
      "Solo: W / S or ↑ / ↓",
      "Versus: W / S left · ↑ / ↓ right",
      "P or Escape pauses. M mutes.",
    ],
    [
      "Strike while moving to add spin.",
      "Hit an edge for a sharper angle.",
      "Each paddle hit adds speed.",
    ],
    [
      "Bank off the amber obstacles.",
      "They sway, rotate, and redirect.",
      "Score beyond the other paddle.",
    ],
  ];
  columns.forEach((x, i) => {
    mono(
      ctx,
      `0${i + 1}`,
      x,
      280,
      i === 0 ? P.mint : i === 1 ? P.coral : P.amber,
    );
    line(ctx, x, 303, x + 300, 303);
    text(ctx, heads[i], x, 336, 25, P.white, 700);
    descriptions[i].forEach((t, j) =>
      text(ctx, t, x, 389 + j * 28, 16, P.muted),
    );
  });
  box(ctx, 100, 490, 1080, 64, P.panel, 6);
  text(
    ctx,
    `FIRST TO ${C.WIN_SCORE}. WIN BY ${C.WIN_LEAD}.`,
    124,
    522,
    16,
    P.mint,
    700,
  );
  text(
    ctx,
    "At deuce, keep playing until someone breaks away.",
    486,
    522,
    17,
    P.muted,
  );
  menu(ctx, s);
  footer(ctx, s);
}
function overlay(ctx: Context, s: DeepReadonly<CaromState>): void {
  ctx.fillStyle = "#071117d9";
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  box(ctx, 407, 153, 466, s.screen === "paused" ? 432 : 370, P.panel, 14);
  line(ctx, 455, 195, 825, 195, P.line);
  mono(
    ctx,
    s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
    C.FIELD_CX,
    223,
    P.muted,
    "center",
  );
  if (s.screen === "paused") {
    text(ctx, "PAUSED", C.FIELD_CX, 282, 49, P.white, 800, "center");
    mono(
      ctx,
      `${s.score.p1}  —  ${s.score.p2}    /    ${s.mode.toUpperCase()}`,
      C.FIELD_CX,
      326,
      P.muted,
      "center",
    );
  } else {
    const label =
      s.winner === "left"
        ? s.mode === "solo"
          ? "YOU WIN"
          : "PLAYER 1 WINS"
        : s.mode === "solo"
          ? "CPU WINS"
          : "PLAYER 2 WINS";
    text(
      ctx,
      label,
      C.FIELD_CX,
      278,
      38,
      s.winner === "left" ? P.mint : P.coral,
      800,
      "center",
    );
    text(
      ctx,
      `${s.score.p1}  —  ${s.score.p2}`,
      C.FIELD_CX,
      323,
      24,
      P.white,
      600,
      "center",
    );
  }
  menu(ctx, s);
}
export function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  grid(ctx);
  if (s.screen === "title") title(ctx, s);
  else if (s.screen === "howto") howto(ctx, s);
  else {
    field(ctx, s);
    if (s.screen === "paused" || s.screen === "matchover") overlay(ctx, s);
  }
  ctx.restore();
}
