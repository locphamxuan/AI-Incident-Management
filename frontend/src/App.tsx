import { useEffect, useState } from "react";
import { fetchIncidentDetail, fetchIncidents, type Incident, type IncidentDetail } from "./api/client";
import { useIncidentSocket } from "./hooks/useIncidentSocket";
import { IncidentList } from "./components/IncidentList";
import { IncidentTimeline } from "./components/IncidentTimeline";

export function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    fetchIncidents().then(setIncidents).catch(() => setIncidents([]));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchIncidentDetail(selectedId).then(setDetail).catch(() => setDetail(null));
  }, [selectedId]);

  useIncidentSocket((event) => {
    if (event.type === "incident.updated" || event.type === "incident.analyzed") {
      fetchIncidents().then(setIncidents).catch(() => {});
      if (event.incidentId === selectedId) {
        fetchIncidentDetail(event.incidentId).then(setDetail).catch(() => {});
      }
    }
  });

  return (
    <div className="app">
      <header>
        <h1>AI Incident Management</h1>
      </header>
      <main>
        <section className="sidebar">
          <IncidentList incidents={incidents} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
        <section className="content">
          <IncidentTimeline detail={detail} />
        </section>
      </main>
    </div>
  );
}
