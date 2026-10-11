# NavWeave Project Map

One-page overview of where the POC stands and where it is going.

```text
User + Map UI
  → NavWeave planning state
    → Mission JSON v1
      → MavctlClient (Mock default / local dry-run opt-in)
        → mavctl CLI + daemon
          → ArduPilot
```

## Done (POC v0)

- Mission JSON v1 library: parse / validate / serialize / planner-state
  transforms, mirroring mavctl's rules (takeoff-first, terminal rtl/land,
  strict fields, finite ranges, ≤ 100 items);
- offline SVG planning canvas: grid, home/vehicle markers, waypoints,
  polyline, click-to-add, select / delete / reorder buttons;
- global altitude + per-waypoint hold / acceptance-radius editing;
- JSON preview, validation error panel, import/export `mission.json`;
- vehicle status panel with **Mode: Mock** and dev toggles
  (connected / GPS / health-observed);
- mavctl bridge abstraction: `MockMavctlClient` (default) +
  `LocalMavctlClient` (opt-in, dry-run only, temp file deleted);
- safety banner, dry-run review panel, guard reason/hint display;
- docs: architecture, mavctl contract, safety, roadmap.

## Not in the POC

- online map tiles / satellite / search;
- drag-sort, area survey, polygon coverage;
- non-dry-run execution of any kind;
- agent chat / LLM orchestration;
- multi-vehicle, accounts, database, deployment;
- real-aircraft support.

## Next candidates

| Step | Depends on |
| --- | --- |
| SITL planning dry-run loop (mavctl against a local SITL, user-driven) | mavctl + SITL installed by the user |
| `mission download` display + diff vs current plan | read-only bridge extension |
| MapLibre adapter behind the MissionMapCanvas abstraction | offline-capable tile strategy decision |
| Operation display (`mavctl operation get`) for executed missions | mavctl execution flows (out of NavWeave's hands) |
