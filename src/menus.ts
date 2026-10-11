import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import * as C from "./constants";
import { returnTitle, startMatch } from "./world";

export function menuItems(s: DeepReadonly<CaromState>): readonly string[] {
  switch (s.screen) {
    case "title":
      return C.TITLE_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    case "paused":
      return C.PAUSE_ITEMS;
    case "matchover":
      return C.MATCHOVER_ITEMS;
    default:
      return [];
  }
}
export function menuItemRect(s: DeepReadonly<CaromState>, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= menuItems(s).length)
    return null;
  if (s.screen === "title")
    return { x: 100, y: 350 + index * 66, w: 370, h: 56 };
  if (s.screen === "howto") return { x: 100, y: 590, w: 370, h: 56 };
  return { x: 455, y: 356 + index * 66, w: 370, h: 56 };
}
function hit(s: DeepReadonly<CaromState>, x: number, y: number): number {
  return menuItems(s).findIndex((_, i) => {
    const r = menuItemRect(s, i)!;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  });
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  switch (s.screen) {
    case "title": {
      const next = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...next, screen: "howto", menuIndex: 0 }
        : startMatch(next, s.menuIndex === 0 ? "solo" : "versus");
    }
    case "howto":
      return returnTitle(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? startMatch(s, s.mode)
          : returnTitle(s);
    case "matchover":
      return s.menuIndex === 0 ? startMatch(s, s.mode) : returnTitle(s);
    default:
      return s;
  }
}

/** Gesture origins are a cache of the engine's current contacts, not world data. */
export interface MenuGesture {
  readonly screen: CaromState["screen"];
  readonly starts: Readonly<Record<number, number>>;
}
export type MenuState = CaromState & { readonly menuGesture?: MenuGesture };

export function readMenus(
  state: DeepReadonly<MenuState>,
  api: UpdateApi,
): CaromState {
  const edges = Object.fromEntries(
    C.ACTIONS.map((name) => [name, api.input.pressed(name)]),
  );
  const samples = api.input.pointerSamples();
  const contacts = api.input.pointerContacts();
  api.input.pointer();
  const { menuGesture, ...world } = state;
  let s: MenuState = world;
  api.audio.setMuted(edges.mute ? !s.muted : s.muted);
  s = { ...s, muted: api.audio.muted() };
  if (s.screen === "countdown" || s.screen === "playing") {
    return edges.pause
      ? { ...s, resumeScreen: s.screen, screen: "paused", menuIndex: 0 }
      : s;
  }
  if (s.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen };
  if ((s.screen === "howto" || s.screen === "matchover") && edges.back)
    return returnTitle(s);
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  const count = menuItems(s).length;
  let keyboardConfirm = false;
  if (up || down)
    s = { ...s, menuIndex: (s.menuIndex + (up ? -1 : 1) + count) % count };
  else keyboardConfirm = edges.confirm;
  // Keyboard confirmation wins the frame even if a pointer also releases.
  if (keyboardConfirm) return confirm(s);
  const starts = {
    ...(menuGesture?.screen === s.screen ? menuGesture.starts : {}),
  };
  let pointerConfirm = false;
  for (const sample of samples) {
    const index = hit(s, sample.x, sample.y);
    if (index >= 0) s = { ...s, menuIndex: index };
    if (sample.type === "down" && sample.button === "primary")
      starts[sample.id] = index;
    if (sample.type === "up") {
      if (index >= 0 && starts[sample.id] === index) pointerConfirm = true;
      delete starts[sample.id];
    }
  }
  const active = new Set(contacts.map((contact) => contact.id));
  for (const id of Object.keys(starts)) {
    if (!active.has(Number(id))) delete starts[Number(id)];
  }
  s = { ...s, menuGesture: { screen: s.screen, starts } };
  return pointerConfirm ? confirm(s) : s;
}
