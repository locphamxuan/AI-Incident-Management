import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendChart } from "../src/components/TrendChart";

describe("TrendChart", () => {
  it("shows an empty state with no trend data", () => {
    render(<TrendChart trend={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  it("renders one bar group per day with a descriptive title", () => {
    render(
      <TrendChart
        trend={[
          { date: "2026-09-01", opened: 2, resolved: 1 },
          { date: "2026-09-02", opened: 0, resolved: 1 },
        ]}
      />,
    );

    expect(screen.getByText("2026-09-01: 2 opened, 1 resolved")).toBeInTheDocument();
    expect(screen.getByText("2026-09-02: 0 opened, 1 resolved")).toBeInTheDocument();
  });
});
