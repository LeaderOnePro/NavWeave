# NavWeave Safety

## Non-negotiables

1. **NavWeave never talks MAVLink.** No pymavlink import, no MAVLink framing,
   no serial/TCP/UDP vehicle endpoints.
2. **NavWeave never executes flight commands.** The only mavctl invocation in
   the POC is `mission upload --confirm --dry-run --json` against a temporary
   file (opt-in), plus read-only `status --json` / `telemetry --json`.
3. **Mock Mode is the default.** The UI always shows the active bridge mode;
   the default is Mock, clearly labelled, and works with mavctl absent.
4. **mavctl is the safety authority.** Guards, ACK handling, and the mission
   wire protocol are mavctl's job; NavWeave's validation is a UX pre-check
   only and never claims "approved".
5. **Stale/unknown vehicle data is never treated as healthy.** The mock
   vehicle panel can be toggled to disconnected / no-GPS / health-unknown so
   agents and users see honest unknown states.
6. **No secrets, no cloud.** No map tokens, no API keys, no telemetry upload,
   no accounts, no database.
7. **No real-aircraft claims.** The POC is validated against mock state and
   (eventually) SITL planning workflows only.

## Failure behaviour

When the local dry-run bridge fails (mavctl missing, daemon down, guard
rejection), NavWeave surfaces mavctl's `reason` / `message` / `hint` verbatim
and keeps the mission in the editor. It never retries silently and never
falls back to a non-dry-run command — there is no non-dry-run code path to
fall back to.

## Threat model notes

- A malicious mission file is bounded by the same strict schema mavctl
  enforces: unknown fields rejected, numeric ranges enforced, no arbitrary
  commands or parameters representable in Mission JSON v1.
- The temporary mission file is written with restrictive defaults in the OS
  temp dir and deleted in a `finally` block.
- The dev server binds to localhost; NavWeave v0 is not a network service.
