import { BarChart3 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import type { AnalyticsCsvRow } from "@/features/analytics/domain/csv";
import { formatAnalyticsShortDate } from "@/features/analytics/domain/date-range";

type AnalyticsOrdersByDayProps = {
  rows: AnalyticsCsvRow[];
  formatMoney: (amount: number) => string;
};

function OrdersTrendChart({ rows }: { rows: AnalyticsCsvRow[] }) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 36, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxOrders = Math.max(...rows.map((row) => row.orderCount), 1);
  const yMax = Math.max(2, Math.ceil(maxOrders));

  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (rows.length - 1)) * plotWidth;
    const y =
      padding.top + plotHeight - (row.orderCount / yMax) * plotHeight;
    return { x, y, row };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding.left} ${
    padding.top + plotHeight
  } L ${points[0]?.x ?? padding.left} ${padding.top + plotHeight} Z`;

  const yTicks = Array.from({ length: yMax + 1 }, (_, index) => index);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-56 w-full"
      role="img"
      aria-label="Orders by day trend chart"
    >
      <defs>
        <linearGradient id="ordersAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => {
        const y = padding.top + plotHeight - (tick / yMax) * plotHeight;
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-400 text-[11px]"
            >
              {tick}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#ordersAreaFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point) => (
        <g key={point.row.date}>
          <circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            className="fill-gray-500 text-[11px]"
          >
            {formatAnalyticsShortDate(point.row.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AnalyticsOrdersByDay({
  rows,
  formatMoney,
}: AnalyticsOrdersByDayProps) {
  const maxOrders = Math.max(...rows.map((row) => row.orderCount), 1);

  return (
    <Card className="rounded-2xl p-5 sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Orders by Day</h2>
          <p className="mt-1 text-sm text-gray-500">
            Daily Order Trends and Revenue
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <BarChart3 className="h-4 w-4" aria-hidden />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">
          No orders in this range.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <OrdersTrendChart rows={rows} />
          </div>

          <div className="mt-6 space-y-3">
            {rows.map((row) => {
              const widthPct = Math.max(
                8,
                Math.round((row.orderCount / maxOrders) * 100),
              );
              return (
                <div
                  key={row.date}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3"
                >
                  <p className="text-sm font-medium text-gray-700">
                    {formatAnalyticsShortDate(row.date)}
                  </p>
                  <div className="relative h-9 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="relative z-10 ml-3 inline-flex h-full items-center text-xs font-semibold text-white">
                      {row.orderCount} orders
                    </span>
                  </div>
                  <p className="text-right text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {formatMoney(row.revenueAmount)}
                    </span>{" "}
                    revenue
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
