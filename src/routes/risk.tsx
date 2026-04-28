import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { AdherenceRing } from "@/components/AdherenceRing";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { computeRisk, levelLabel, type DoseRow, type EventRow } from "@/lib/adherence";
import { toast } from "sonner";

export const Route = createFileRoute("/risk")({
  head: () => ({ meta: [{ title: "Risk assessment — AdhereAI" }] }),
  component: RiskPage,
});

function RiskPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [aiGuidance, setAiGuidance] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const [d, e, latest] = await Promise.all([
      supabase.from("scheduled_doses").select("id,scheduled_at,status,medication_id").eq("user_id", user.id).gte("scheduled_at", since),
      supabase.from("dose_events").select("scheduled_dose_id,medication_id,taken_at,minutes_late").eq("user_id", user.id).gte("taken_at", since),
      supabase.from("risk_assessments").select("ai_guidance").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setDoses((d.data ?? []) as DoseRow[]);
    setEvents((e.data ?? []) as EventRow[]);
    setAiGuidance(latest.data?.ai_guidance ?? null);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const risk = computeRisk(new Date(), doses, events);

  const generateAI = async () => {
    if (!user) return;
    setAiBusy(true);
    // Save rule-based snapshot (AI guidance is simulated client-side for now)
    const factors = risk.factors.map((f) => ({ label: f.label, weight: f.weight }));
    const guidance = buildCoaching(risk);
    const { error } = await supabase.from("risk_assessments").insert({
      user_id: user.id,
      score: risk.score,
      level: risk.level,
      adherence_7d: risk.adherence7d,
      adherence_30d: risk.adherence30d,
      missed_7d: risk.missed7d,
      late_7d: risk.late7d,
      factors,
      ai_guidance: guidance,
      ai_summary: `${levelLabel(risk.level)} · score ${risk.score}`,
    });
    setAiBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAiGuidance(guidance);
    toast.success("Risk assessment saved");
  };

  const gradient =
    risk.level === "low"
      ? "bg-gradient-risk-low"
      : risk.level === "medium"
      ? "bg-gradient-risk-med"
      : "bg-gradient-risk-high";

  return (
    <MobileShell>
      <header className={`${gradient} text-white px-5 pt-10 pb-6 rounded-b-[1.75rem]`}>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-white/85 text-sm">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-3 flex items-center gap-5">
          <AdherenceRing value={risk.adherence30d} label="30-day" sublabel="adherence" />
          <div>
            <p className="text-white/85 text-xs uppercase font-semibold tracking-wide">
              {levelLabel(risk.level)}
            </p>
            <p className="font-display text-4xl font-bold tabular-nums">
              {risk.score}
              <span className="text-base font-medium text-white/80">/100</span>
            </p>
            <p className="text-xs text-white/80 mt-1">combined risk score</p>
          </div>
        </div>
      </header>

      <section className="px-5 pt-5">
        <h2 className="font-display text-lg font-bold mb-2">Contributing factors</h2>
        {risk.factors.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No risk factors detected — keep it up.
          </div>
        ) : (
          <ul className="space-y-2">
            {risk.factors.map((f, i) => (
              <li
                key={i}
                className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-soft"
              >
                {f.weight >= 0 ? (
                  <div className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <TrendingUp className="size-4" />
                  </div>
                ) : (
                  <div className="size-9 rounded-lg bg-success/15 text-success flex items-center justify-center">
                    <TrendingDown className="size-4" />
                  </div>
                )}
                <p className="flex-1 text-sm">{f.label}</p>
                <span className="text-xs font-mono text-muted-foreground">
                  {f.weight > 0 ? `+${f.weight}` : f.weight}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-5 pt-6">
        <div className="rounded-2xl bg-gradient-care text-primary-foreground p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <p className="font-display font-semibold">Personalized guidance</p>
          </div>
          {aiGuidance ? (
            <p className="text-sm text-white/90 mt-2 leading-relaxed whitespace-pre-wrap">{aiGuidance}</p>
          ) : (
            <p className="text-sm text-white/80 mt-2">
              Generate an assessment to get tailored coaching based on your adherence.
            </p>
          )}
          <Button
            onClick={generateAI}
            disabled={aiBusy}
            variant="secondary"
            className="mt-3 rounded-xl h-10 bg-white/95 hover:bg-white text-primary font-semibold"
          >
            {aiBusy ? "Saving…" : aiGuidance ? "Re-run assessment" : "Generate assessment"}
          </Button>
        </div>
      </section>

      <div className="h-10" />
    </MobileShell>
  );
}

function buildCoaching(r: ReturnType<typeof computeRisk>): string {
  const parts: string[] = [];
  if (r.level === "high") {
    parts.push("Your adherence has dropped into a high-risk zone. Missing ART doses raises the chance of viral rebound and resistance.");
    if (r.missed7d > 0) parts.push(`You have ${r.missed7d} missed dose${r.missed7d > 1 ? "s" : ""} this week. Reach out to your care team today.`);
  } else if (r.level === "medium") {
    parts.push("You're mostly on track, but a few slips are adding up.");
    if (r.late7d > 0) parts.push(`${r.late7d} dose${r.late7d > 1 ? "s were" : " was"} taken more than 30 minutes late this week — consistent timing keeps drug levels steady.`);
  } else {
    parts.push("Great work — you're keeping your adherence in the protective range.");
    parts.push("Keep your dosing routine and schedule your next lab follow-up if it's coming due.");
  }
  parts.push("Tip: pair your dose with a daily anchor (brushing teeth, morning coffee) to reduce missed pills.");
  return parts.join(" ");
}
