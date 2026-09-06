import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryCards } from "../src/components/SummaryCards";
import type { ReportSummary } from "../src/api/client";

function makeSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    rangeDays: 30,
    totals: { total: 5, open: 2, investigating: 0, resolved: 3 },
    bySeverity: {},
    byService: [],
    mttrSeconds: 125.5,
    trend: [],
    ...overrides,
  };
}

describe("SummaryCards", () => {
  it("renders totals and a formatted MTTR", () => {
    render(<SummaryCards summary={makeSummary()} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Total incidents")).toBeInTheDocument();
    expect(screen.getByText("2m")).toBeInTheDocument();
  });

  it("shows a dash when MTTR is unavailable", () => {
    render(<SummaryCards summary={makeSummary({ mttrSeconds: null })} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
