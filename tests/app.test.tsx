import { StrictMode } from "react";
import { fireEvent, render } from "@testing-library/react";
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
