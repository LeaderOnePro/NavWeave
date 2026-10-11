import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DryRunPanel } from "../src/components/DryRunPanel";
import type { DryRunResult } from "../src/bridge/types";

const BASE = {
  mode: "mock" as const,
  scenario: "pass" as const,
  binary: "mavctl",
  isValidMission: true,
  busy: false,
  result: null,
  onModeChange: vi.fn(),
  onScenarioChange: vi.fn(),
  onBinaryChange: vi.fn(),
  onRunDryRun: vi.fn(),
};

describe("DryRunPanel", () => {
  it("shows the local dry-run safety warning in local mode", () => {
    const { getByTestId, getByText } = render(
      <DryRunPanel {...BASE} mode="local" />,
    );
    expect(getByTestId("local-dry-run-warning").textContent).toContain(
      "No mission is uploaded and no vehicle state is changed",
    );
    expect(getByText(/only run/)).toBeTruthy();
  });

  it("shows the mock scenario selector in mock mode", () => {
    const { getByLabelText } = render(<DryRunPanel {...BASE} mode="mock" />);
    expect(getByLabelText("mock scenario")).toBeTruthy();
  });

  it("disables the dry-run button when the mission is invalid", () => {
    const { getByTestId } = render(
      <DryRunPanel {...BASE} isValidMission={false} />,
    );
    const button = getByTestId("run-dry-run-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("renders guard checks, reason and hint from the result", () => {
    const result: DryRunResult = {
      ok: false,
      exit_code: 5,
      reason: "mission_requires_disarmed",
      message: "refusing to mission_upload: the vehicle is armed",
      hint: "disarm the vehicle first",
      checks: [
        { name: "confirm", passed: true, detail: "confirmed" },
        { name: "armed", passed: false, detail: "armed=true" },
      ],
    };
    const { getByTestId, getByText } = render(
      <DryRunPanel {...BASE} result={result} />,
    );
    expect(getByTestId("dry-run-result").textContent).toContain("REJECTED");
    expect(getByTestId("dry-run-result").textContent).toContain(
      "mission_requires_disarmed",
    );
    expect(getByText(/disarm the vehicle first/)).toBeTruthy();
    expect(getByText(/✓ confirm/)).toBeTruthy();
    expect(getByText(/✗ armed/)).toBeTruthy();
  });

  it("disables the button while a run is busy", () => {
    const { getByTestId } = render(<DryRunPanel {...BASE} busy />);
    expect((getByTestId("run-dry-run-button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("reports mode changes to the parent", () => {
    const onModeChange = vi.fn();
    const { getByLabelText } = render(
      <DryRunPanel {...BASE} onModeChange={onModeChange} />,
    );
    fireEvent.change(getByLabelText("bridge mode"), {
      target: { value: "local" },
    });
    expect(onModeChange).toHaveBeenCalledWith("local");
  });
});
