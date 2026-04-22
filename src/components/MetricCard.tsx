import { type Metric, METRIC_META, type Reading, evaluate, severityLabel } from "@/lib/health-data";
import { cn } from "@/lib/utils";
import { Droplet, Heart, Activity } from "lucide-react";

const ICONS: Record<Metric, React.ElementType> = {
  glucose: Droplet,
  heart: Heart,
  pressure: Activity,
};

export function MetricCard({ metric, reading }: { metric: Metric; reading?: Reading }) {
  const meta = METRIC_META[metric];
  const Icon = ICONS[metric];
  const severity = reading ? evaluate(reading) : "normal";

  const sevColor =
    severity === "normal"
      ? "bg-success/15 text-success-foreground"
      : severity === "warning"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/15 text-destructive";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 text-white shadow-elegant transition-smooth",
        meta.gradient,
      )}
    >
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div className="size-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon className={cn("size-5", metric === "heart" && "animate-heartbeat")} />
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full", sevColor)}>
          {severityLabel(severity)}
        </span>
      </div>
      <div className="relative mt-4">
        <p className="text-xs uppercase tracking-wider opacity-80">{meta.label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-4xl font-display font-bold">
            {reading ? (metric === "pressure" ? `${reading.value}/${reading.diastolic}` : reading.value) : "—"}
          </span>
          <span className="text-sm opacity-80">{meta.unit}</span>
        </div>
      </div>
    </div>
  );
}
