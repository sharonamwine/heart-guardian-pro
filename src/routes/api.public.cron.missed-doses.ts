import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public cron endpoint: scans for missed doses (overdue > 60min, no dose_event)
// and writes alert_log entries (one per dose, per care-team member).
// If TWILIO is configured (TWILIO_API_KEY + TWILIO_FROM_NUMBER), sends SMS.
// Idempotent: skips doses that already have an alert_log entry.
//
// Configure pg_cron (or external scheduler) to call this URL every 15 minutes:
//   GET /api/public/cron/missed-doses
//
// Optional: protect with ?token=<CRON_SHARED_SECRET>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/cron/missed-doses")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: handler,
      POST: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const expected = process.env.CRON_SHARED_SECRET;
    if (expected && token !== expected) {
      return json({ error: "unauthorized" }, 401);
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - 60 * 60_000); // 60 min late
    const lookback = new Date(now.getTime() - 24 * 60 * 60_000); // last 24h only

    // 1. Pull overdue scheduled doses with no matching dose_event
    const { data: overdueRows, error: overdueErr } = await supabaseAdmin
      .from("scheduled_doses")
      .select("id,user_id,medication_id,scheduled_at,status")
      .gte("scheduled_at", lookback.toISOString())
      .lte("scheduled_at", cutoff.toISOString())
      .neq("status", "taken")
      .limit(500);
    if (overdueErr) throw overdueErr;

    if (!overdueRows || overdueRows.length === 0) {
      return json({ ok: true, scanned: 0, alerts_created: 0 });
    }

    // 2. Filter out those that have a dose_event
    const ids = overdueRows.map((r) => r.id);
    const { data: takenEvents } = await supabaseAdmin
      .from("dose_events")
      .select("scheduled_dose_id")
      .in("scheduled_dose_id", ids);
    const takenSet = new Set((takenEvents ?? []).map((e) => e.scheduled_dose_id as string));

    // 3. Filter out doses we already alerted on
    const { data: existingAlerts } = await supabaseAdmin
      .from("alert_log")
      .select("scheduled_dose_id")
      .in("scheduled_dose_id", ids);
    const alertedSet = new Set(
      (existingAlerts ?? []).map((a) => a.scheduled_dose_id as string),
    );

    const missed = overdueRows.filter(
      (r) => !takenSet.has(r.id) && !alertedSet.has(r.id),
    );

    if (missed.length === 0) {
      return json({ ok: true, scanned: overdueRows.length, alerts_created: 0 });
    }

    // 4. Resolve patient -> care team
    const patientIds = Array.from(new Set(missed.map((m) => m.user_id)));
    const [{ data: links }, { data: profiles }, { data: meds }] = await Promise.all([
      supabaseAdmin
        .from("patient_links")
        .select("patient_id,clinician_id,relationship,alerts_enabled")
        .in("patient_id", patientIds)
        .eq("alerts_enabled", true),
      supabaseAdmin.from("profiles").select("id,full_name,phone").in("id", patientIds),
      supabaseAdmin
        .from("medications")
        .select("id,name")
        .in("id", missed.map((m) => m.medication_id).filter(Boolean) as string[]),
    ]);

    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const medMap = new Map((meds ?? []).map((m) => [m.id, m]));
    const clinicianIds = Array.from(new Set((links ?? []).map((l) => l.clinician_id)));
    const { data: clinProfs } = clinicianIds.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,phone").in("id", clinicianIds)
      : { data: [] };
    const clinMap = new Map((clinProfs ?? []).map((p) => [p.id, p]));

    // 5. For each missed dose, log alerts (in-app for patient + each clinician)
    type AlertInsert = {
      patient_id: string;
      scheduled_dose_id: string;
      kind: string;
      channel: string;
      recipient: string;
      message: string;
      status: string;
      error: string | null;
    };
    const alerts: AlertInsert[] = [];
    let smsSent = 0;
    const twilioKey = process.env.TWILIO_API_KEY;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER;
    const lovableKey = process.env.LOVABLE_API_KEY;

    for (const dose of missed) {
      const med = medMap.get(dose.medication_id ?? "");
      const patient = profMap.get(dose.user_id);
      const minsLate = Math.round((now.getTime() - new Date(dose.scheduled_at).getTime()) / 60000);
      const scheduledTime = new Date(dose.scheduled_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const baseMsg = `Missed dose: ${med?.name ?? "medication"} scheduled at ${scheduledTime} (${minsLate} min late).`;

      // Patient in-app
      alerts.push({
        patient_id: dose.user_id,
        scheduled_dose_id: dose.id,
        kind: "missed_dose",
        channel: "in_app",
        recipient: dose.user_id,
        message: baseMsg,
        status: "logged",
        error: null,
      });

      // Care team
      const careTeam = (links ?? []).filter((l) => l.patient_id === dose.user_id);
      for (const link of careTeam) {
        const clin = clinMap.get(link.clinician_id);
        const phone = clin?.phone;
        const careMsg = `[AdhereAI] ${patient?.full_name ?? "Your patient"} missed a dose of ${med?.name ?? "medication"} (${scheduledTime}, ${minsLate} min late).`;

        if (phone && twilioKey && twilioFrom && lovableKey) {
          const result = await sendSms(phone, careMsg, twilioKey, twilioFrom, lovableKey);
          alerts.push({
            patient_id: dose.user_id,
            scheduled_dose_id: dose.id,
            kind: "missed_dose",
            channel: "sms",
            recipient: phone,
            message: careMsg,
            status: result.ok ? "sent" : "failed",
            error: result.error,
          });
          if (result.ok) smsSent++;
        } else {
          alerts.push({
            patient_id: dose.user_id,
            scheduled_dose_id: dose.id,
            kind: "missed_dose",
            channel: "in_app",
            recipient: link.clinician_id,
            message: careMsg,
            status: "logged",
            error: phone ? "twilio_not_configured" : "no_phone",
          });
        }
      }
    }

    if (alerts.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("alert_log").insert(alerts);
      if (insErr) throw insErr;
    }

    // Mark scheduled_doses status=missed
    await supabaseAdmin
      .from("scheduled_doses")
      .update({ status: "missed" })
      .in("id", missed.map((m) => m.id));

    return json({
      ok: true,
      scanned: overdueRows.length,
      missed: missed.length,
      alerts_created: alerts.length,
      sms_sent: smsSent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("missed-doses cron error:", msg);
    return json({ error: msg }, 500);
  }
}

async function sendSms(
  to: string,
  body: string,
  twilioKey: string,
  from: string,
  lovableKey: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, error: `twilio ${resp.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sms_failed" };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
