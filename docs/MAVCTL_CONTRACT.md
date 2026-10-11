# NavWeave ⇄ mavctl contract

The mavctl CLI is NavWeave's only window into the vehicle side. This document
records the exact surface the POC is allowed to use.

## Allowed commands (POC surface)

```bash
mavctl status --json
mavctl telemetry --json
mavctl mission upload <file> --confirm --dry-run --json
mavctl mission download --json
mavctl operation get <id> --json
```

**POC only invokes `mission upload` in dry-run form. No non-dry-run command
may be triggered by NavWeave v0.** `mission download` and
`operation get <id>` are read-only and reserved for later milestones — the
POC bridge implements status, telemetry, and dry-run validation only.

## Explicitly forbidden (NavWeave must never run)

```text
mavctl arm / disarm / disarm --force
mavctl takeoff / land / rtl / mode
mavctl mission upload            (without --dry-run)
mavctl mission clear
mavctl mission start
any MAV_CMD_RUN_PREARM_CHECKS or raw MAVLink traffic
```

## Dry-run semantics

`mavctl mission upload <file> --confirm --dry-run` runs every guard and
schema validation and **sends nothing to the vehicle**. Exit codes
(mirrored by the bridge):

| exit | meaning |
| --- | --- |
| 0 | guards pass; dry-run would execute |
| 2 | argument / mission-file error |
| 3 | mavctl daemon not running |
| 4 | vehicle not connected |
| 5 | safety guard rejected (`reason` / `hint` in error detail) |
| 6 | vehicle NACK / timeout path |

Error payloads follow mavctl's `{"error": {"code", "message", "detail":
{"reason", "hint", ...}}}` shape; the bridge surfaces `reason`, `message`,
and `hint` to the UI and renders `detail.checks` when present.

## Browser POC limitation

NavWeave v0 ships as a browser app; a browser cannot spawn local processes.
`LocalMavctlClient` is therefore implemented as a **Node-only module**,
fully covered by unit tests with a mocked spawn seam, and is not wired into
the browser UI — selecting "Local dry-run mode" shows the warning and a
disabled run button with `localSpawnUnavailable`. Wiring it to a small local
host bridge is v0.x roadmap work (docs/ROADMAP.md).

## Local bridge rules (`LocalMavctlClient`)

- spawn with an **argument array** (never a shell string);
- the mission is written to a temporary file, deleted in `finally`, and
  never retained;
- the binary location is opt-in configuration; when missing, the bridge
  returns `reason = "mavctl_unavailable"`,
  `hint = "install mavctl or switch to Mock Mode"`;
- the daemon/SITL is **never** started by NavWeave;
- the UI must show "Local dry-run mode" plus the warning that only
  `--dry-run` is executed before the local client can be enabled.

## Schema authority

Mission JSON v1 rules are mirrored from mavctl
(`src/mavctl/models/mission.py`, `docs/design/mission-protocol-v1.md` in the
mavctl repository): `version === 1` (strict integer), 1–100 items,
takeoff-first, terminal `land`/`rtl`, strict field sets, finite numeric
ranges. mavctl remains the authority — NavWeave validation is a UX pre-check,
not a safety guarantee.
