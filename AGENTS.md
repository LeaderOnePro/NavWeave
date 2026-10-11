# AGENTS.md — NavWeave

Guidance for coding agents working in this repository.

## What NavWeave is

NavWeave is a map-first mission planning harness for MAVLink workflows.

```text
NavWeave plans and reviews missions.
mavctl executes them safely.
```

## Hard rules

- **No direct MAVLink.** NavWeave never opens a MAVLink connection, never
  encodes or decodes MAVLink wire frames, and never imports pymavlink.
- **No flight command execution.** Do not add code paths that run
  `mavctl arm / disarm / takeoff / land / rtl / mode`,
  non-dry-run `mission upload`, `mission clear`, or `mission start`.
- **Dry-run only bridge.** The only mavctl invocation NavWeave may perform is
  `mavctl mission upload <temp-file> --confirm --dry-run --json` (plus the
  read-only `status --json` / `telemetry --json`). It must always be an
  explicit opt-in (Local dry-run mode); the default is Mock Mode.
- **Mock-first.** The POC must be fully demonstrable without mavctl
  installed, without a daemon, and without SITL.
- **Do not reimplement mavctl safety/protocol logic.** Guards, ACK handling,
  heartbeat tracking, mission wire protocol, and the operation registry
  belong to mavctl. NavWeave validates the JSON document *before* handing it
  to mavctl, and trusts mavctl for everything on the vehicle side.
- **No secrets.** No map API keys, no tokens, no `.env` files in the repo.
  The offline canvas must stay offline; no remote tile URLs, no commercial
  map SDK tokens.
- **PRs use GitHub "Create a merge commit"** (Conventional Commits preserved).
  Do not squash by default and do not delete feature branches automatically.
- Version numbers, tags, and releases for mavctl are out of scope here;
  NavWeave does not create npm/PyPI packages in this POC.

## Validation gates

Run before every commit:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass. TypeScript `strict` is on; `any` and `ts-ignore` are
rejected by lint.
