import { StrictMode } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/app/App";

describe("App shell", () => {
  it("renders the planning header and mock-mode safety banner", () => {
    const { getByRole, getByText } = render(<StrictMode><App /></StrictMode>);
    expect(getByRole("heading", { name: /navweave — mission planning/i })).toBeTruthy();
    expect(getByText(/mavctl executes them safely/i)).toBeTruthy();
    expect(getByText(/mock \/ sitl planning only/i)).toBeTruthy();
  });
});

describe("planner interactions", () => {
  it("adds a waypoint on canvas click and shows the derived mission", () => {
    render(<App />);
    const canvas = document.querySelector('[data-testid="mission-map-canvas"]');
    if (!(canvas instanceof SVGSVGElement)) throw new Error("canvas missing");
    fireEvent.click(canvas);
    expect(
      document.querySelectorAll('[data-testid^="waypoint-row-"]').length,
    ).toBe(1);
    expect(
      document.querySelector('[data-testid="auto-row-takeoff"]')?.textContent,
    ).toContain("takeoff");
    expect(
      document.querySelector('[data-testid="auto-row-rtl"]')?.textContent,
    ).toContain("rtl");
  });

  it("updates the JSON preview and keeps it valid after edits", () => {
    render(<App />);
    const canvas = document.querySelector('[data-testid="mission-map-canvas"]');
    if (!(canvas instanceof SVGSVGElement)) throw new Error("canvas missing");
    fireEvent.click(canvas);
    const preview = document.querySelector('[data-testid="json-preview"]');
    expect(preview?.textContent).toContain('"type": "takeoff"');
    expect(preview?.textContent).toContain('"type": "waypoint"');
    // no validation errors for a well-formed plan
    expect(document.querySelector('[data-testid="validation-errors"]')).toBeNull();
  });

  it("shows the mock mode banner and vehicle panel", () => {
    render(<App />);
    expect(document.querySelector('[data-testid="bridge-mode"]')?.textContent).toBe(
      "Mock",
    );
    expect(document.querySelector('[data-testid="status-gps"]')?.textContent).toContain(
      "rtk_fixed",
    );
  });
});

// -- delete / reorder / altitude / import coverage -------------------------------


function clickCanvasAdd(times: number): void {
  const canvas = document.querySelector('[data-testid="mission-map-canvas"]');
  if (!(canvas instanceof SVGSVGElement)) throw new Error("canvas missing");
  // Click different grid positions so waypoints have distinct coordinates.
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(canvas, { clientX: 100 + i * 60, clientY: 120 + i * 40 });
  }
}

function waypointAltitudeInput(row: number): HTMLInputElement {
  const input = document.querySelector(
    `[aria-label="waypoint ${row} altitude"]`,
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`altitude input for waypoint ${row} missing`);
  }
  return input;
}

function deleteButton(row: number): HTMLButtonElement {
  const button = document.querySelector(`[aria-label="delete waypoint ${row}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`delete button for waypoint ${row} missing`);
  }
  return button;
}

describe("planner edit interactions", () => {
  it("deletes a waypoint and reduces the mission rows", () => {
    render(<App />);
    clickCanvasAdd(2);
    expect(
      document.querySelectorAll('[data-testid^="waypoint-row-"]').length,
    ).toBe(2);
    fireEvent.click(deleteButton(2));
    expect(
      document.querySelectorAll('[data-testid^="waypoint-row-"]').length,
    ).toBe(1);
  });

  it("reorders waypoints with the up/down buttons", () => {
    render(<App />);
    clickCanvasAdd(2);
    // Make the two waypoints distinguishable.
    fireEvent.change(waypointAltitudeInput(2), { target: { value: "20" } });
    expect(waypointAltitudeInput(2).value).toBe("20");

    // Move waypoint 3 up: the 20 m waypoint lands in row 3.
    const upButton = document.querySelector('[aria-label="move waypoint 3 up"]');
    if (!(upButton instanceof HTMLButtonElement)) throw new Error("up missing");
    fireEvent.click(upButton);
    expect(waypointAltitudeInput(3).value).toBe("20");

    // Move it back: with two waypoints the 20 m one is now last, so the
    // row-2 item moves down to restore the original order.
    const downButton = document.querySelector('[aria-label="move waypoint 2 down"]');
    if (!(downButton instanceof HTMLButtonElement)) throw new Error("down missing");
    fireEvent.click(downButton);
    expect(waypointAltitudeInput(2).value).toBe("20");
    expect(waypointAltitudeInput(3).value).toBe("10");
  });

  it("reflects altitude edits in the mission JSON preview", () => {
    render(<App />);
    clickCanvasAdd(1);
    fireEvent.change(waypointAltitudeInput(2), { target: { value: "20" } });

    const preview = document.querySelector('[data-testid="json-preview"]');
    const previewText = preview?.textContent ?? "";
    if (previewText === "") {
      throw new Error("preview empty");
    }
    const parsed = JSON.parse(previewText) as {
      items: Array<{ type: string; altitude_m: number }>;
    };
    expect(parsed.items[1]?.altitude_m).toBe(20);
  });

  it("rejects an invalid imported mission and shows the error", async () => {
    render(<App />);
    clickCanvasAdd(1);
    const input = document.querySelector('[aria-label="import mission json file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("import input missing");
    const file = new File(
      [JSON.stringify({ version: 1, items: [] })],
      "mission.json",
      { type: "application/json" },
    );
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      const error = document.querySelector('[data-testid="import-error"]');
      expect(error?.textContent).toContain("rejected:");
      expect(error?.textContent).toContain("upload missions must not be empty");
    });
  });

  it("imports a valid mission and replaces the planner", async () => {
    render(<App />);
    clickCanvasAdd(1);
    const input = document.querySelector('[aria-label="import mission json file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("import input missing");
    const file = new File(
      [
        JSON.stringify({
          version: 1,
          items: [
            { type: "takeoff", altitude_m: 7 },
            { type: "waypoint", lat_deg: -35.3, lon_deg: 149.1, altitude_m: 7 },
            { type: "rtl" },
          ],
        }),
      ],
      "mission.json",
      { type: "application/json" },
    );
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(waypointAltitudeInput(2).value).toBe("7");
    });
  });
});
