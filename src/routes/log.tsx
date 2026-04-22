import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { evaluate, METRIC_META, type Metric, severityLabel } from "@/lib/health-data";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Log reading — VitalSense" },
      { name: "description", content: "Add a new blood sugar, heart rate or blood pressure reading." },
    ],
  }),
  component: LogPage,
});

function LogPage() {
  const { user, addReading } = useApp();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>("glucose");
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [feedback, setFeedback] = useState<null | { sev: "normal" | "warning" | "critical" }>(null);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(value);
    if (!v) return;
    const r = {
      metric,
      value: v,
      diastolic: metric === "pressure" ? Number(diastolic) || 80 : undefined,
    };
    const sev = evaluate({ ...r, id: "tmp", timestamp: Date.now() });
    addReading(r);
    setFeedback({ sev });
    setValue("");
    setDiastolic("");
  };

  return (
    <MobileShell>
      <div className="px-5 pt-12 pb-6">
        <h1 className="font-display text-2xl font-bold">New reading</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick what you measured and enter the value.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {(["glucose", "heart", "pressure"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMetric(m);
                setFeedback(null);
              }}
              className={cn(
                "p-3 rounded-2xl border text-left transition-smooth",
                metric === m
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <p className="text-xs font-semibold">{METRIC_META[m].label}</p>
              <p className="text-[10px] text-muted-foreground">{METRIC_META[m].unit}</p>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {metric === "pressure" ? "Systolic" : "Value"} ({METRIC_META[metric].unit})
            </label>
            <Input
              inputMode="numeric"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={metric === "glucose" ? "e.g. 110" : metric === "heart" ? "e.g. 72" : "e.g. 120"}
              className="h-14 rounded-xl text-2xl font-display font-semibold"
            />
          </div>
          {metric === "pressure" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Diastolic (mmHg)</label>
              <Input
                inputMode="numeric"
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="e.g. 80"
                className="h-14 rounded-xl text-2xl font-display font-semibold"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 shadow-glow font-semibold"
          >
            Save reading
          </Button>
        </form>

        {feedback && (
          <div
            className={cn(
              "mt-6 rounded-2xl p-4 flex items-start gap-3 border",
              feedback.sev === "normal"
                ? "border-success/30 bg-success/10"
                : feedback.sev === "warning"
                  ? "border-warning/40 bg-warning/10"
                  : "border-destructive/40 bg-destructive/10",
            )}
          >
            <div
              className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0",
                feedback.sev === "normal"
                  ? "bg-success/20 text-success-foreground"
                  : feedback.sev === "critical"
                    ? "bg-destructive/20 text-destructive animate-pulse-ring"
                    : "bg-warning/20 text-warning-foreground",
              )}
            >
              {feedback.sev === "normal" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{severityLabel(feedback.sev)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {feedback.sev === "normal"
                  ? "Reading saved. Keep up the good work."
                  : feedback.sev === "warning"
                    ? "This value is outside the normal range. Monitor closely."
                    : "Critical reading detected. Consider contacting a healthcare provider."}
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
