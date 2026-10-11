# Carom

A browser paddle duel about angles, spin, and bank shots. Slide into a hit to curve the ball, use the two swaying, rotating obstacles, and play to 11 with a two-point lead. Play Solo against the CPU or Versus with a friend on one keyboard.

Everything is drawn on canvas. Sounds are synthesized by the Simple 2D engine. The game needs no backend, accounts, runtime downloads, or external assets.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Production

```sh
npm ci
npm run build
```

Serve `dist/` from the root of any static host. To inspect the production build locally, run `npm run preview`.

## Controls

| Action | Keyboard |
| --- | --- |
| Solo movement | W / S or Up / Down |
| Versus, left player | W / S |
| Versus, right player | Up / Down |
| Select a menu item | W / S or Up / Down |
| Confirm | Enter or Space |
| Pause / resume | P or Escape |
| Back | Escape |
| Mute | M |
| Debug overlay | Backtick |

Menus also accept mouse clicks and touch. On a touchscreen, the engine shows paddle sliders and menu controls automatically. Keep moving at contact to add spin; strike near a paddle's end for a steeper return. Amber obstacles preserve the ball's speed and spin while changing its direction.

## Verification and layout

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests create a Simple 2D engine over an in-process canvas and advance counted frames. They cover input precedence, screens, AI, independent debug poses, spin, collisions, scoring, and agreement between different frame lengths.

`src/game.ts` exports the state contract and game. `world.ts`, `simulation.ts`, and `physics.ts` implement value transitions; `menus.ts` handles input and shared hit regions; `render.ts` draws the screens. The engine owns the clock, canvas fit, audio, input, and diagnostics. The debug surface returned from initialization is accessible through `engine.debug`; it is never installed globally by the game.

The [showcase](showcase/showcase.md) includes actual game screenshots and an engine-recorded rally.
