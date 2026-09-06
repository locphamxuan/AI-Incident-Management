import type { ReportSummary } from "../api/client";

export function ServiceBreakdown({ byService }: { byService: ReportSummary["byService"] }) {
  if (byService.length === 0) {
    return <p className="empty-state">No incidents in this range.</p>;
  }

  return (
    <div className="breakdown">
      <h2>By service</h2>
      <table className="service-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Total</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {byService.map((row) => (
            <tr key={row.service}>
              <td>{row.service}</td>
              <td>{row.total}</td>
              <td>{row.open}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
