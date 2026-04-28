import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeRisk, levelLabel, type DoseRow, type EventRow } from "@/lib/adherence";

type Guidance = {
  score: number;
  level: "low" | "medium" | "high";
  adherence7d: number;
  adherence30d: number;
  missed7d: number;
  late7d: number;
  factors: { label: string; weight: number }[];
  guidance: string;
  summary: string;
  saved: boolean;
};

/**
 * Computes a rule-based risk score AND generates personalized AI coaching via
 * the Lovable AI Gateway (google/gemini-2.5-flash). Persists the result to
 * risk_assessments so the client can show historical assessments.
 */
export const generateRiskAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Guidance> => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();

    const [dosesRes, eventsRes] = await Promise.all([
      supabase
        .from("scheduled_doses")
        .select("id,scheduled_at,status,medication_id")
        .eq("user_id", userId)
        .gte("scheduled_at", since),
      supabase
        .from("dose_events")
        .select("scheduled_dose_id,medication_id,taken_at,minutes_late")
        .eq("user_id", userId)
        .gte("taken_at", since),
    ]);

    const doses = (dosesRes.data ?? []) as DoseRow[];
    const events = (eventsRes.data ?? []) as EventRow[];
    const risk = computeRisk(new Date(), doses, events);

    const summary = `${levelLabel(risk.level)} · score ${risk.score}/100`;
    let guidance = fallbackGuidance(risk);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey) {
      try {
        const factorLines = risk.factors.length
          ? risk.factors.map((f) => `- ${f.label} (weight ${f.weight})`).join("\n")
          : "- No risk factors detected";

        const prompt = [
          `You are an HIV treatment adherence coach. Write a brief, warm, non-judgmental note (max 110 words) to the patient based on their adherence metrics.`,
          ``,
          `Rule-based risk score: ${risk.score}/100 (${risk.level})`,
          `7-day adherence: ${Math.round(risk.adherence7d * 100)}%`,
          `30-day adherence: ${Math.round(risk.adherence30d * 100)}%`,
          `Missed doses (7d): ${risk.missed7d}`,
          `Late doses (7d, >30 min): ${risk.late7d}`,
          ``,
          `Factors:`,
          factorLines,
          ``,
          `Respond with 2–3 short paragraphs: (1) acknowledge how they're doing, (2) the most important action, (3) one concrete habit tip. Do not diagnose or prescribe medication.`,
        ].join("\n");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are a compassionate HIV treatment adherence coach. Keep replies short, specific, and actionable. Never prescribe medication or diagnose.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (typeof text === "string" && text.trim().length > 0) {
            guidance = text.trim();
          }
        } else {
          console.error("Lovable AI error:", res.status, await res.text());
        }
      } catch (err) {
        console.error("AI guidance failed:", err);
      }
    }

    const { error: insErr } = await supabase.from("risk_assessments").insert({
      user_id: userId,
      score: risk.score,
      level: risk.level,
      adherence_7d: risk.adherence7d,
      adherence_30d: risk.adherence30d,
      missed_7d: risk.missed7d,
      late_7d: risk.late7d,
      factors: risk.factors,
      ai_guidance: guidance,
      ai_summary: summary,
    });

    return {
      score: risk.score,
      level: risk.level,
      adherence7d: risk.adherence7d,
      adherence30d: risk.adherence30d,
      missed7d: risk.missed7d,
      late7d: risk.late7d,
      factors: risk.factors,
      guidance,
      summary,
      saved: !insErr,
    };
  });

function fallbackGuidance(r: ReturnType<typeof computeRisk>) {
  const parts: string[] = [];
  if (r.level === "high") {
    parts.push(
      "Your adherence has dropped into a high-risk zone. Missing ART doses raises the chance of viral rebound and resistance.",
    );
    if (r.missed7d > 0) {
      parts.push(`You have ${r.missed7d} missed dose${r.missed7d > 1 ? "s" : ""} this week. Reach out to your care team today.`);
    }
  } else if (r.level === "medium") {
    parts.push("You're mostly on track, but a few slips are adding up.");
    if (r.late7d > 0) {
      parts.push(`${r.late7d} dose${r.late7d > 1 ? "s were" : " was"} taken more than 30 minutes late this week — consistent timing keeps drug levels steady.`);
    }
  } else {
    parts.push("Great work — your adherence is in the protective range.");
    parts.push("Keep your dosing routine and check in with your clinician on upcoming labs.");
  }
  parts.push("Tip: pair your dose with a daily anchor (brushing teeth, morning coffee) to cut missed pills.");
  return parts.join(" ");
}
