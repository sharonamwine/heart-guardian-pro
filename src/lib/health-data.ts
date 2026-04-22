export type Metric = "glucose" | "heart" | "pressure";

export type Reading = {
  id: string;
  metric: Metric;
  value: number; // glucose mg/dL, heart bpm, pressure systolic
  diastolic?: number; // for pressure
  timestamp: number;
  note?: string;
};

export type Reminder = {
  id: string;
  title: string;
  time: string; // HH:mm
  enabled: boolean;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type Severity = "normal" | "warning" | "critical";

export const METRIC_META: Record<
  Metric,
  { label: string; unit: string; gradient: string; color: string }
> = {
  glucose: { label: "Blood Sugar", unit: "mg/dL", gradient: "bg-gradient-glucose", color: "text-glucose" },
  heart: { label: "Heart Rate", unit: "bpm", gradient: "bg-gradient-heart", color: "text-heart" },
  pressure: { label: "Blood Pressure", unit: "mmHg", gradient: "bg-gradient-pressure", color: "text-pressure" },
};

export function evaluate(r: Reading): Severity {
  if (r.metric === "glucose") {
    if (r.value < 55 || r.value > 250) return "critical";
    if (r.value < 70 || r.value > 180) return "warning";
    return "normal";
  }
  if (r.metric === "heart") {
    if (r.value < 40 || r.value > 130) return "critical";
    if (r.value < 55 || r.value > 100) return "warning";
    return "normal";
  }
  // pressure
  const sys = r.value;
  const dia = r.diastolic ?? 80;
  if (sys >= 180 || dia >= 120 || sys < 80) return "critical";
  if (sys >= 140 || dia >= 90 || sys < 90) return "warning";
  return "normal";
}

export function severityLabel(s: Severity) {
  return s === "normal" ? "In range" : s === "warning" ? "Out of range" : "Critical";
}

export function seedReadings(): Reading[] {
  const now = Date.now();
  const day = 86_400_000;
  const out: Reading[] = [];
  for (let i = 13; i >= 0; i--) {
    const t = now - i * day;
    out.push({
      id: `g${i}`,
      metric: "glucose",
      value: Math.round(95 + Math.sin(i / 2) * 25 + (Math.random() * 20 - 10)),
      timestamp: t + 8 * 3600_000,
    });
    out.push({
      id: `h${i}`,
      metric: "heart",
      value: Math.round(72 + Math.sin(i / 3) * 8 + (Math.random() * 10 - 5)),
      timestamp: t + 9 * 3600_000,
    });
    out.push({
      id: `p${i}`,
      metric: "pressure",
      value: Math.round(120 + Math.sin(i / 4) * 8 + (Math.random() * 8 - 4)),
      diastolic: Math.round(78 + Math.sin(i / 5) * 4 + (Math.random() * 6 - 3)),
      timestamp: t + 10 * 3600_000,
    });
  }
  return out;
}
