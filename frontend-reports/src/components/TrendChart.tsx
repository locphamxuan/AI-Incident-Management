import type { ReportTrendPoint } from "../api/client";

const CHART_HEIGHT = 160;
const BAR_WIDTH = 14;
const BAR_GAP = 6;

export function TrendChart({ trend }: { trend: ReportTrendPoint[] }) {
  if (trend.length === 0) {
    return <p className="empty-state">No trend data for this range.</p>;
  }

  const max = Math.max(1, ...trend.map((point) => Math.max(point.opened, point.resolved)));
  const width = trend.length * (BAR_WIDTH * 2 + BAR_GAP);

  return (
    <div className="breakdown">
      <h2>Opened vs. resolved per day</h2>
      <svg
        role="img"
        aria-label="Incidents opened and resolved per day"
        width="100%"
        viewBox={`0 0 ${width} ${CHART_HEIGHT + 20}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {trend.map((point, index) => {
          const x = index * (BAR_WIDTH * 2 + BAR_GAP);
          const openedHeight = (point.opened / max) * CHART_HEIGHT;
          const resolvedHeight = (point.resolved / max) * CHART_HEIGHT;
          return (
            <g key={point.date} transform={`translate(${x}, 0)`}>
              <title>
                {point.date}: {point.opened} opened, {point.resolved} resolved
              </title>
              <rect
                x={0}
                y={CHART_HEIGHT - openedHeight}
                width={BAR_WIDTH}
                height={openedHeight}
                fill="#dc2626"
              />
              <rect
                x={BAR_WIDTH}
                y={CHART_HEIGHT - resolvedHeight}
                width={BAR_WIDTH}
                height={resolvedHeight}
                fill="#16a34a"
              />
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "#dc2626" }} /> opened
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: "#16a34a" }} /> resolved
        </span>
      </div>
    </div>
  );
}
