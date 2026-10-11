# NavWeave Architecture

## Layering

```text
User + Map UI
  → NavWeave planning state (React app state, pure transforms)
    → Mission JSON v1 (validated document)
      → MavctlClient abstraction
        → mavctl CLI (external process, opt-in, dry-run only)
          → mavctl daemon
            → ArduPilot
```

NavWeave terminates at the MavctlClient boundary. Everything below that line
belongs to mavctl.

## Ownership split

NavWeave only owns:

- **planning** — planner state (home, waypoints, altitudes) and the
  transforms between planner state and Mission JSON v1;
- **visualization** — the offline SVG canvas (grid, markers, polyline);
- **preview** — the live JSON preview and the validation error panel;
- **confirmation UX** — export flow, dry-run review panel, safety banners;
- **future agent orchestration** — the reason a dedicated harness exists.

mavctl owns:

- **MAVLink** — connections, streams, and the wire protocol;
- **mission wire protocol** — home-slot conventions, upload/download/clear
  transactions, relay-residue handling;
- **guards** — confirm gating, fresh ground evidence, link freshness, mode
  checks, altitude ceilings;
- **command ACK** — transaction semantics, retries, NACK/timeout mapping;
- **operations** — long-running command observation, supersession;
- **vehicle state contract** — status/telemetry/health JSON shapes.

## Module map

```text
src/
├── mission/      pure TypeScript Mission JSON v1 library
│   ├── types.ts        document + item types
│   ├── schema.ts       structural parsing (unknown JSON → MissionV1)
│   ├── validation.ts   mavctl-mirroring semantic rules
│   ├── serialize.ts    stable export formatting
│   └── transforms.ts   planner state ⇄ mission document
├── vehicle/      vehicle status types + mock vehicle state
├── bridge/       MavctlClient abstraction (Mock default, local opt-in)
├── components/   React presentation components
├── app/          page composition + planner state hooks
└── main.tsx      entry point
```

## Key invariants

1. `src/mission/` and `src/vehicle/` never import React or the bridge — they
   are pure libraries, testable without a DOM.
2. Only `src/bridge/LocalMavctlClient.ts` may touch `child_process`, and only
   for the allow-listed dry-run/status commands (see
   [MAVCTL_CONTRACT.md](MAVCTL_CONTRACT.md)).
3. Only `src/bridge/MockMavctlClient.ts` is wired into the UI by default;
   switching to the local client requires an explicit user action.
4. Validation in NavWeave is a **pre-check for UX** — mavctl re-validates
   everything server-side. NavWeave never claims a mission is "approved".
