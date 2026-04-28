// Rule-based adherence + risk scoring shared between client and server function.

export type DoseRow = {
  id: string;
  scheduled_at: string;
  status: string;
  medication_id: string;
};

export type EventRow = {
  scheduled_dose_id: string | null;
  medication_id: string | null;
  taken_at: string;
  minutes_late: number | null;
};

export type AdherenceWindow = {
  scheduled: number;
  taken: number;
  late: number; // taken but >30 min late
  missed: number; // scheduled in the past and not taken
  rate: number; // 0..1
};

export const LATE_THRESHOLD_MIN = 30;

export function windowStats(
  now: Date,
  days: number,
  doses: DoseRow[],
  events: EventRow[],
): AdherenceWindow {
  const since = new Date(now.getTime() - days * 86_400_000);
  const relevant = doses.filter((d) => {
    const t = new Date(d.scheduled_at);
    return t >= since && t <= now;
  });
  const eventsByDose = new Map<string, EventRow>();
  for (const e of events) if (e.scheduled_dose_id) eventsByDose.set(e.scheduled_dose_id, e);

  let taken = 0;
  let late = 0;
  let missed = 0;
  for (const d of relevant) {
    const e = eventsByDose.get(d.id);
    if (e) {
      taken += 1;
      if ((e.minutes_late ?? 0) > LATE_THRESHOLD_MIN) late += 1;
    } else {
      missed += 1;
    }
  }
  const scheduled = relevant.length;
  const rate = scheduled === 0 ? 1 : taken / scheduled;
  return { scheduled, taken, late, missed, rate };
}

export type RiskLevel = "low" | "medium" | "high";

export type RiskResult = {
  score: number; // 0..100 (higher = more risk)
  level: RiskLevel;
  factors: { label: string; weight: number }[];
  adherence7d: number;
  adherence30d: number;
  missed7d: number;
  late7d: number;
};

export function computeRisk(now: Date, doses: DoseRow[], events: EventRow[]): RiskResult {
  const w7 = windowStats(now, 7, doses, events);
  const w30 = windowStats(now, 30, doses, events);

  const factors: { label: string; weight: number }[] = [];
  let score = 0;

  // Missed doses in last 7 days — heaviest factor
  const missedPenalty = Math.min(45, w7.missed * 12);
  if (w7.missed > 0) {
    factors.push({ label: `${w7.missed} missed dose${w7.missed > 1 ? "s" : ""} in last 7 days`, weight: missedPenalty });
    score += missedPenalty;
  }

  // Late doses in last 7 days
  const latePenalty = Math.min(20, w7.late * 5);
  if (w7.late > 0) {
    factors.push({ label: `${w7.late} late dose${w7.late > 1 ? "s" : ""} (>30 min) this week`, weight: latePenalty });
    score += latePenalty;
  }

  // 30-day adherence trend
  if (w30.scheduled >= 10) {
    if (w30.rate < 0.85) {
      const p = Math.round((0.95 - w30.rate) * 60);
      factors.push({ label: `30-day adherence ${Math.round(w30.rate * 100)}% (target ≥95%)`, weight: p });
      score += p;
    } else if (w30.rate >= 0.95) {
      factors.push({ label: `Excellent 30-day adherence (${Math.round(w30.rate * 100)}%)`, weight: -5 });
      score -= 5;
    }
  }

  // Streak break — consecutive missed in last 3 days
  const threeDayWin = windowStats(now, 3, doses, events);
  if (threeDayWin.missed >= 2) {
    factors.push({ label: `${threeDayWin.missed} missed in last 72 hours`, weight: 15 });
    score += 15;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: RiskLevel = score >= 60 ? "high" : score >= 25 ? "medium" : "low";

  return {
    score,
    level,
    factors,
    adherence7d: w7.rate,
    adherence30d: w30.rate,
    missed7d: w7.missed,
    late7d: w7.late,
  };
}

export function levelLabel(l: RiskLevel) {
  return l === "low" ? "Low risk" : l === "medium" ? "Needs attention" : "High risk";
}
