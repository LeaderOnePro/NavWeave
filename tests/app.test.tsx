import { StrictMode } from "react";
import { render } from "@testing-library/react";
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
