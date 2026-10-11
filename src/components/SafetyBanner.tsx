/**
 * Always-visible safety banner. NavWeave v0 is a planning POC: it never
 * executes flight commands. The banner text is intentionally blunt.
 */
export function SafetyBanner() {
  return (
    <div className="safety-banner" role="note">
      <strong>Mock / SITL planning only.</strong> NavWeave does not execute
      flight commands. It plans missions, exports Mission JSON v1, and can run
      mavctl dry-run validation. Execution always belongs to mavctl.
    </div>
  );
}
