import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { type Metric, type Reading } from "@/lib/health-data";

export function TrendChart({ metric, readings }: { metric: Metric; readings: Reading[] }) {
  const data = readings
    .filter((r) => r.metric === metric)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((r) => ({
      time: r.timestamp,
      value: r.value,
      diastolic: r.diastolic,
    }));

  const stroke =
    metric === "glucose"
      ? "oklch(0.7 0.17 60)"
      : metric === "heart"
        ? "oklch(0.62 0.22 25)"
        : "oklch(0.55 0.16 250)";

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={(t) => format(t, "MMM d")}
            stroke="oklch(0.5 0.03 220)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
          <Tooltip
            contentStyle={{
              background: "oklch(1 0 0)",
              border: "1px solid oklch(0.92 0.015 210)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(t) => format(t as number, "MMM d, HH:mm")}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#g-${metric})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
