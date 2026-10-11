# NavWeave

**NavWeave is a map-first mission planning harness for MAVLink workflows.**

```text
NavWeave plans and reviews missions.
mavctl executes them safely.
```

NavWeave is a standalone companion to [mavctl](https://github.com/LeaderOnePro/mavctl)
— a headless, agent-first ArduPilot ground-control CLI. NavWeave owns the
planning side: a map-style canvas for composing missions, Mission JSON v1
validation, preview, and export. mavctl owns the execution side: MAVLink,
guards, mission wire protocol, and vehicle safety.

```text
┌──────────────────────────────┐
│  NavWeave (this repository)  │
│  plan · validate · preview · │
│  export · dry-run review     │
└──────────────┬───────────────┘
               │  Mission JSON v1 file / mavctl dry-run (opt-in)
               ▼
┌──────────────────────────────┐
│  mavctl CLI + daemon         │
│  guards · MAVLink · ACK      │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  ArduPilot vehicle           │
└──────────────────────────────┘
```

## Status: POC (v0), Mock/SITL planning only

| Implemented | Not implemented |
| --- | --- |
| Offline SVG mission canvas (grid, home/vehicle/waypoint markers, route polyline) | Online map tiles / satellite imagery / map search |
| Click-to-add waypoint, select, delete, reorder (buttons) | Drag-sort waypoints |
| Global altitude + per-waypoint hold / acceptance-radius editing | Area survey / polygon coverage planning |
| Mission JSON v1 validation mirroring mavctl rules | MAVLink wire encoding (never — mavctl owns the wire) |
| JSON preview + import/export (`mission.json`) | Execution: `mission upload` (non-dry-run), `mission start`, `mission clear` |
| mavctl dry-run validation bridge (mock default, local opt-in) | Health-based gating, agent chat / LLM integration |
| Mock vehicle status panel (clearly labelled **Mode: Mock**) | Multi-user, login, database, cloud deployment |
| Safety banner on every screen | Real-aircraft support of any kind |

## Safety statement

- **NavWeave does not directly talk MAVLink** and does not import pymavlink.
- **NavWeave does not control a real aircraft.** The POC targets mock data and
  SITL planning workflows only.
- **NavWeave v0 does not execute upload/start.** It exports Mission JSON v1
  and can perform **dry-run validation only** through an explicit opt-in local
  bridge. mavctl remains required for execution.
- mavctl's guards, ACK handling, and mission protocol are the safety
  authority; NavWeave deliberately does not reimplement any of them.

## UI (ASCII sketch)

```text
┌ NavWeave — Mission Planning ──────────────────────────────────────┐
│ ⚠ Mock / SITL planning only. NavWeave does not execute flight …   │
│                          │  Vehicle: Mode Mock · connected ·      │
│   ┌──────────────────┐   │  GUIDED · rtk_fixed                    │
│   │ coordinate grid  │   │  Home: -35.3632, 149.1652              │
│   │  ▲ home          │   │                                        │
│   │   o──o waypoint  │   │  Waypoints                             │
│   │   \  │           │   │   1 takeoff  alt 10 m        [↑][↓][×] │
│   │    o o waypoints │   │   2 waypoint alt 10 m hold 0 [↑][↓][×] │
│   │   ╲│  polyline   │   │   3 rtl                                │
│   └──────────────────┘   │  [Export mission.json] [Dry-run ▶]     │
│  click grid = add wp     │  ┌ Mission JSON preview / errors ┐     │
└──────────────────────────┴──┴───────────────────────────────┴─────┘
```

## Mission JSON v1 example

NavWeave produces exactly what mavctl consumes:

```json
{
  "version": 1,
  "items": [
    { "type": "takeoff", "altitude_m": 10 },
    {
      "type": "waypoint",
      "lat_deg": -35.3632,
      "lon_deg": 149.1652,
      "altitude_m": 10,
      "hold_s": 0,
      "accept_radius_m": 0
    },
    { "type": "rtl" }
  ]
}
```

Validation rules mirror mavctl's Mission JSON v1 (takeoff-first, terminal
`land`/`rtl`, max 100 items, strict field sets, finite numeric ranges).

## Local development

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev         # offline planning UI at http://localhost:5173 (Mock Mode)
pnpm test        # Vitest unit/component tests
pnpm lint        # ESLint (flat config)
pnpm typecheck   # tsc --noEmit (strict)
pnpm build       # typecheck + production build
```

Default bridge mode is **Mock** — no mavctl binary is invoked. To review a
mission against your local mavctl (dry-run only), enable **Local dry-run
mode** in the bridge panel; NavWeave will then run
`mavctl mission upload <temp-file> --confirm --dry-run --json` against a
temporary file that is deleted afterwards. Nothing is ever uploaded.

## Development workflow

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for commands, layout and the
bridge-mode matrix.

## Relation to mavctl

- mavctl is the execution layer and the schema authority
  (see [MAVCTL_CONTRACT.md](docs/MAVCTL_CONTRACT.md)).
- NavWeave consumes the mavctl CLI as an external process — it never links
  mavctl code, never opens a MAVLink connection, and never imports pymavlink.
- If mavctl is absent, NavWeave keeps working in Mock Mode with local
  validation only.

## License

MIT — see [LICENSE](LICENSE).

[中文说明](README_ZH.md)。
