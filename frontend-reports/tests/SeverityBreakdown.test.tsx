import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeverityBreakdown } from "../src/components/SeverityBreakdown";

describe("SeverityBreakdown", () => {
  it("shows an empty state with no incidents", () => {
    render(<SeverityBreakdown bySeverity={{}} />);
    expect(screen.getByText(/no incidents in this range/i)).toBeInTheDocument();
  });

  it("orders severities from critical to low", () => {
    render(<SeverityBreakdown bySeverity={{ low: 1, critical: 4, medium: 2 }} />);

    const labels = screen.getAllByText(/critical|high|medium|low/).map((el) => el.textContent);
    expect(labels).toEqual(["critical", "medium", "low"]);
  });
});
