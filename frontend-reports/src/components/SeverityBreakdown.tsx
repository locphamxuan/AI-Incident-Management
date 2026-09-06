const SEVERITY_COLOR: Record<string, string> = {
  low: "#6b7280",
  medium: "#d97706",
  high: "#dc2626",
  critical: "#991b1b",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

export function SeverityBreakdown({ bySeverity }: { bySeverity: Record<string, number> }) {
  const entries = Object.entries(bySeverity).sort(
    ([a], [b]) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b),
  );
  const max = Math.max(1, ...entries.map(([, count]) => count));

  if (entries.length === 0) {
    return <p className="empty-state">No incidents in this range.</p>;
  }

  return (
    <div className="breakdown">
      <h2>By severity</h2>
      <ul className="bar-list">
        {entries.map(([severity, count]) => (
          <li key={severity} className="bar-row">
            <span className="bar-row-label">{severity}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(count / max) * 100}%`, background: SEVERITY_COLOR[severity] ?? "#6b7280" }}
              />
            </div>
            <span className="bar-row-value">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
