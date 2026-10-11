/**
 * NavWeave — map-first mission planning harness for MAVLink workflows.
 *
 * NavWeave plans and reviews missions.
 * mavctl executes them safely.
 *
 * v0 POC is Mock/SITL-only: it never talks MAVLink directly, never imports
 * pymavlink, and never executes upload/start. It exports Mission JSON v1 and
 * can run mavctl dry-run validation through an explicit opt-in bridge.
 */
import { SafetyBanner } from "../components/SafetyBanner";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>NavWeave — Mission Planning</h1>
        <p className="app-tagline">
          NavWeave plans and reviews missions. mavctl executes them safely.
        </p>
      </header>
      <SafetyBanner />
      <main className="app-main">
        {/* Planning canvas, waypoint editor, preview and dry-run panels are
            added by the mission-planning milestones. */}
      </main>
    </div>
  );
}
