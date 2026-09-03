import type { IncidentDetail } from "../api/client";

export function IncidentTimeline({ detail }: { detail: IncidentDetail | null }) {
  if (!detail) {
    return <p className="empty-state">Select an incident to see its timeline.</p>;
  }

  const { incident, events, analyses } = detail;

  return (
    <div className="incident-detail">
      <h2>{incident.summary}</h2>
      <p className="incident-meta">
        {incident.service} · {incident.severity} · {incident.status} · opened{" "}
        {new Date(incident.opened_at).toLocaleString()}
      </p>

      <h3>Timeline</h3>
      <ol className="timeline">
        {events.map((event, i) => (
          <li key={i}>
            <span className="timeline-time">{new Date(event.at).toLocaleTimeString()}</span>
            <span className="timeline-type">{event.type}</span>
          </li>
        ))}
      </ol>

      <h3>Root cause analysis</h3>
      {analyses.length === 0 ? (
        <p className="empty-state">AI agent hasn't produced an analysis yet.</p>
      ) : (
        <pre className="root-cause">{analyses[0].narrative}</pre>
      )}
    </div>
  );
}
