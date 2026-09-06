import { useEffect, useState } from "react";
import { fetchReportSummary, type ReportSummary } from "./api/client";
import { SummaryCards } from "./components/SummaryCards";
import { SeverityBreakdown } from "./components/SeverityBreakdown";
import { ServiceBreakdown } from "./components/ServiceBreakdown";
import { TrendChart } from "./components/TrendChart";

const RANGE_OPTIONS = [7, 30, 90];

export function App() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchReportSummary(days)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load report data.");
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="app">
      <header>
        <h1>Incident Reports</h1>
        <div className="range-picker">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={option === days ? "range-option selected" : "range-option"}
              onClick={() => setDays(option)}
            >
              {option}d
            </button>
          ))}
        </div>
      </header>
      <main>
        {error && <p className="empty-state">{error}</p>}
        {!error && !summary && <p className="empty-state">Loading…</p>}
        {summary && (
          <>
            <SummaryCards summary={summary} />
            <div className="breakdown-grid">
              <SeverityBreakdown bySeverity={summary.bySeverity} />
              <ServiceBreakdown byService={summary.byService} />
            </div>
            <TrendChart trend={summary.trend} />
          </>
        )}
      </main>
    </div>
  );
}
