import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { App } from "../src/App";
import type { ReportSummary } from "../src/api/client";

function makeSummary(rangeDays: number): ReportSummary {
  return {
    rangeDays,
    totals: { total: 1, open: 1, investigating: 0, resolved: 0 },
    bySeverity: { high: 1 },
    byService: [{ service: "checkout-api", total: 1, open: 1 }],
    mttrSeconds: null,
    trend: [{ date: "2026-09-01", opened: 1, resolved: 0 }],
  };
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const days = Number(new URL(url).searchParams.get("days"));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeSummary(days)),
        } as Response);
      }),
    );
  });

  it("loads the default 30-day summary and renders it", async () => {
    render(<App />);

    expect(await screen.findByText("Total incidents")).toBeInTheDocument();
    expect(screen.getByText("checkout-api")).toBeInTheDocument();
  });

  it("re-fetches when a different range is selected", async () => {
    render(<App />);
    await screen.findByText("Total incidents");

    fireEvent.click(screen.getByText("7d"));

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("days=7"));
    });
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response)),
    );

    render(<App />);

    expect(await screen.findByText(/failed to load report data/i)).toBeInTheDocument();
  });
});
