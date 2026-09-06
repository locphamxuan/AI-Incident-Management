import type { ReportSummary } from "../api/client";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function SummaryCards({ summary }: { summary: ReportSummary }) {
  const { totals, mttrSeconds } = summary;
  const cards = [
    { label: "Total incidents", value: totals.total },
    { label: "Open", value: totals.open },
    { label: "Investigating", value: totals.investigating },
    { label: "Resolved", value: totals.resolved },
    { label: "MTTR", value: formatDuration(mttrSeconds) },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span className="summary-card-value">{card.value}</span>
          <span className="summary-card-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
