import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncidentList } from "../src/components/IncidentList";
import type { Incident } from "../src/api/client";

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "1",
    service: "checkout-api",
    severity: "critical",
    status: "open",
    summary: "PostgreSQL connection pool exhausted on checkout-api",
    opened_at: "2026-09-03T12:44:00Z",
    resolved_at: null,
    ...overrides,
  };
}

describe("IncidentList", () => {
  it("renders an empty state with no incidents", () => {
    render(<IncidentList incidents={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/no incidents yet/i)).toBeInTheDocument();
  });

  it("renders each incident's summary and calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    const incident = makeIncident();
    render(<IncidentList incidents={[incident]} selectedId={null} onSelect={onSelect} />);

    const item = screen.getByText(incident.summary);
    expect(item).toBeInTheDocument();

    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("marks the selected incident", () => {
    const incident = makeIncident();
    render(<IncidentList incidents={[incident]} selectedId="1" onSelect={vi.fn()} />);
    expect(screen.getByText(incident.summary).closest("button")).toHaveClass("selected");
  });
});
