import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import { createElement } from "react";
import { evaluate, METRIC_META, type Reading } from "@/lib/health-data";
import { useApp } from "@/lib/store";

/**
 * Watches the readings list and pops a toast whenever a new reading
 * with severity warning/critical appears. Also performs a one-time
 * scan on mount to surface any pre-existing abnormal latest readings.
 */
export function useHealthAlerts() {
  const { readings } = useApp();
  const seenIds = useRef<Set<string> | null>(null);
  const didInitialScan = useRef(false);

  useEffect(() => {
    // Initialize seen set on first run without firing toasts for history
    if (seenIds.current === null) {
      seenIds.current = new Set(readings.map((r) => r.id));

      // One-time scan: alert on the latest abnormal reading per metric
      if (!didInitialScan.current) {
        didInitialScan.current = true;
        const latestPerMetric: Record<string, Reading> = {};
        for (const r of readings) {
          const cur = latestPerMetric[r.metric];
          if (!cur || r.timestamp > cur.timestamp) latestPerMetric[r.metric] = r;
        }
        Object.values(latestPerMetric).forEach((r) => {
          const sev = evaluate(r);
          if (sev !== "normal") fireAlert(r, sev);
        });
      }
      return;
    }

    // Fire toasts for any newly added readings
    for (const r of readings) {
      if (seenIds.current.has(r.id)) continue;
      seenIds.current.add(r.id);
      const sev = evaluate(r);
      if (sev !== "normal") fireAlert(r, sev);
    }
  }, [readings]);
}

function fireAlert(r: Reading, sev: "warning" | "critical") {
  const meta = METRIC_META[r.metric];
  const valueText =
    r.metric === "pressure"
      ? `${r.value}/${r.diastolic ?? "—"} ${meta.unit}`
      : `${r.value} ${meta.unit}`;

  const title =
    sev === "critical"
      ? `Critical ${meta.label.toLowerCase()} reading`
      : `${meta.label} out of range`;

  const description =
    sev === "critical"
      ? `${valueText} — consider contacting your doctor or emergency services.`
      : `${valueText} — keep monitoring closely.`;

  const icon = createElement(sev === "critical" ? AlertOctagon : AlertTriangle, {
    className: "size-4",
  });

  if (sev === "critical") {
    toast.error(title, { description, icon, duration: 8000 });
  } else {
    toast.warning(title, { description, icon, duration: 6000 });
  }
}
