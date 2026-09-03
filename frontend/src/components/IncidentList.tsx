import type { Incident } from "../api/client";

const SEVERITY_COLOR: Record<Incident["severity"], string> = {
  low: "#6b7280",
  medium: "#d97706",
  high: "#dc2626",
  critical: "#991b1b",
};

export function IncidentList({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (incidents.length === 0) {
    return <p className="empty-state">No incidents yet.</p>;
  }

  return (
    <ul className="incident-list">
      {incidents.map((incident) => (
        <li key={incident.id}>
          <button
            className={incident.id === selectedId ? "incident-item selected" : "incident-item"}
            onClick={() => onSelect(incident.id)}
          >
            <span className="severity-dot" style={{ background: SEVERITY_COLOR[incident.severity] }} />
            <span className="incident-summary">{incident.summary}</span>
            <span className="incident-meta">
              {incident.service} · {incident.status}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
