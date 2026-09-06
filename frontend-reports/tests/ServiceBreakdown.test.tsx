import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceBreakdown } from "../src/components/ServiceBreakdown";

describe("ServiceBreakdown", () => {
  it("shows an empty state with no incidents", () => {
    render(<ServiceBreakdown byService={[]} />);
    expect(screen.getByText(/no incidents in this range/i)).toBeInTheDocument();
  });

  it("renders a row per service", () => {
    render(<ServiceBreakdown byService={[{ service: "checkout-api", total: 4, open: 1 }]} />);

    expect(screen.getByText("checkout-api")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
