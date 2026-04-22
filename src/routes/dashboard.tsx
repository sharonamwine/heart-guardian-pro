import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AlertTriangle, LogOut, Plus } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { MetricCard } from "@/components/MetricCard";
import { TrendChart } from "@/components/TrendChart";
import { useApp } from "@/lib/store";
import { evaluate, METRIC_META, type Metric } from "@/lib/health-data";
import { Button } from "@/components/ui/button";
import { useHealthAlerts } from "@/hooks/use-health-alerts";
import { format } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VitalSense" },
      { name: "description", content: "Your real-time vitals dashboard with trends and alerts." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, readings, logout } = useApp();
  const navigate = useNavigate();

  useHealthAlerts();

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const latest = useMemo(() => {
    const out: Partial<Record<Metric, (typeof readings)[number]>> = {};
    for (const r of readings) {
      if (!out[r.metric] || r.timestamp > out[r.metric]!.timestamp) out[r.metric] = r;
    }
    return out;
  }, [readings]);

  const alerts = useMemo(
    () =>
      readings
        .filter((r) => evaluate(r) !== "normal")
        .slice(0, 3),
    [readings],
  );

  if (!user) return null;

  return (
    <MobileShell>
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Hello,</p>
            <h1 className="font-display text-2xl font-bold capitalize">{user.name}</h1>
          </div>
          <button
            onClick={() => {
              logout();
              navigate({ to: "/" });
            }}
            className="size-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <div className="size-8 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive shrink-0 animate-pulse-ring">
              <AlertTriangle className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">
                {alerts.length} reading{alerts.length > 1 ? "s" : ""} need attention
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review your latest abnormal values below.
              </p>
            </div>
            <Link to="/contacts" className="text-xs font-semibold text-destructive">
              SOS
            </Link>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4">
          <MetricCard metric="glucose" reading={latest.glucose} />
          <div className="grid grid-cols-2 gap-4">
            <MetricCard metric="heart" reading={latest.heart} />
            <MetricCard metric="pressure" reading={latest.pressure} />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {(["glucose", "heart", "pressure"] as Metric[]).map((m) => (
            <div key={m} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-display font-semibold">{METRIC_META[m].label}</p>
                  <p className="text-xs text-muted-foreground">Last 14 days</p>
                </div>
                {latest[m] && (
                  <p className="text-xs text-muted-foreground">
                    {format(latest[m]!.timestamp, "MMM d, HH:mm")}
                  </p>
                )}
              </div>
              <TrendChart metric={m} readings={readings} />
            </div>
          ))}
        </div>

        <Button
          asChild
          className="mt-6 w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 shadow-glow font-semibold"
        >
          <Link to="/log">
            <Plus className="size-4" /> Log a new reading
          </Link>
        </Button>
      </div>
    </MobileShell>
  );
}
