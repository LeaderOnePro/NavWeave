# NavWeave Roadmap

POC-first. Every step keeps the invariant: **NavWeave plans and reviews
missions; mavctl executes them safely.**

## v0 — Planning POC (this repository, initial scope)

- [x] Mission JSON v1 library (parse / validate / serialize / transforms)
- [x] Offline SVG mission canvas + waypoint editor
- [x] JSON preview, validation panel, import/export
- [x] Mock vehicle status (clearly labelled)
- [x] Bridge abstraction: Mock (default) + local dry-run (opt-in)

## v0.x — Planning depth

- [ ] `mission download` read-only display, diff against the current plan
- [ ] Land item editing (lat/lon/alt + abort altitude) in the canvas
- [ ] Multiple saved plans in browser storage
- [ ] MapLibre adapter (offline tile strategy decided first)

## v1 — SITL planning loop

- [ ] Documented SITL dry-run workflow (user-installed mavctl + SITL)
- [ ] Operation display (`mavctl operation get`) read-only panel

## v1+ — Agent orchestration (deliberately deferred)

- Agent runtime integration (runtime choice deliberately open)
- Mission planning conversation flows
- No model emits MAVLink; the action space stays bounded to mavctl tools

Non-goals for any version: executing flight commands, non-dry-run upload,
online-only maps, accounts/cloud, real-aircraft support claims.
