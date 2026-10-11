# NavWeave Development

Local development guide for the planning POC.

## Prerequisites

- Node 20+ (tested on Node 24)
- [pnpm](https://pnpm.io) 10+ (`corepack enable pnpm` works)
- No SITL, no daemon, no mavctl required — the POC runs fully offline in
  Mock Mode.

## Commands

```bash
pnpm install        # once per clone
pnpm dev            # offline planning UI on http://localhost:5173
pnpm test           # Vitest run (unit + component)
pnpm test:watch     # Vitest watch mode
pnpm lint           # ESLint (flat config)
pnpm typecheck      # tsc --noEmit (strict)
pnpm build          # typecheck + production build into dist/
```

All four gates (lint, typecheck, test, build) must pass before every commit.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the layering and the ownership
split with mavctl. The short version:

- `src/mission/` — pure Mission JSON v1 library (no React, no DOM);
- `src/vehicle/` — vehicle status types + deterministic mock state;
- `src/bridge/` — the only mavctl-facing layer; Mock by default,
  Node-only local client behind the argv dry-run invariant;
- `src/components/`, `src/app/`, `src/hooks/` — React planning UI.

## Bridge modes

| Mode | What it does | Where it runs |
| --- | --- | --- |
| **Mock** (default) | deterministic status/telemetry + dry-run scenarios | browser |
| **Local dry-run** | `mavctl mission upload --dry-run` against a temp file | Node-only module; unit-tested; browser wiring needs the future local host bridge (see ROADMAP.md) |

The UI always shows the active mode. Never mistake Mock for a live vehicle.

## Testing notes

- Tests live in `tests/` and run in jsdom via Vitest;
- the spawn seam (`SpawnFunction`) is injected — the unit suite never calls
  the real mavctl binary;
- clocks are faked where relevant; no sleeps.

## Publishing checklist (for maintainers)

Before creating any public artifact:

- `git status` clean; no stray files (`eeprom.bin`, `*.tlog`, `terrain/`,
  `logs/`, `.env`, `MAVCTL_HOME/` are gitignored but double-check);
- no tokens/keys anywhere in the tree;
- all four gates green.
