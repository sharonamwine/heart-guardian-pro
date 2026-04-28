import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public webhook for IoT pillboxes (e.g. ESP32).
// Auth: POST body must include `device_token` that matches a row in iot_devices.
// Example payload:
//   { "device_token": "abc123...", "medication_id": "uuid?", "taken_at": "ISO?", "note": "..." }
//
// Strategy:
// 1. Verify device_token -> resolve user_id + device id.
// 2. If `medication_id` not provided, pick the active medication whose nearest
//    scheduled dose is closest to `taken_at` (within +/- 4h).
// 3. Match to the nearest pending `scheduled_doses` row for that medication;
//    compute `minutes_late`.
// 4. Insert a `dose_events` row via the service-role client.
// 5. Return a minimal, non-PII JSON response.

const PayloadSchema = z.object({
  device_token: z.string().min(16).max(200),
  medication_id: z.string().uuid().optional(),
  taken_at: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/iot/dose")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const parsed = PayloadSchema.safeParse(json);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Invalid payload", issues: parsed.error.flatten() },
            400,
          );
        }
        const { device_token, medication_id, taken_at, note } = parsed.data;

        // 1. Resolve device
        const { data: device, error: devErr } = await supabaseAdmin
          .from("iot_devices")
          .select("id,user_id,active")
          .eq("device_token", device_token)
          .maybeSingle();

        if (devErr || !device || !device.active) {
          return jsonResponse({ error: "Invalid or inactive device" }, 401);
        }

        const userId = device.user_id;
        const takenAt = taken_at ? new Date(taken_at) : new Date();
        if (Number.isNaN(takenAt.getTime())) {
          return jsonResponse({ error: "Invalid taken_at" }, 400);
        }

        // Update last_seen_at (best-effort)
        await supabaseAdmin
          .from("iot_devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", device.id);

        // 2. Resolve medication_id if missing — pick the active med with the
        //    nearest scheduled_doses row within +/- 4h of takenAt.
        let resolvedMedId = medication_id ?? null;
        let matchedDoseId: string | null = null;
        let minutesLate: number | null = null;

        const windowMs = 4 * 60 * 60 * 1000;
        const fromIso = new Date(takenAt.getTime() - windowMs).toISOString();
        const toIso = new Date(takenAt.getTime() + windowMs).toISOString();

        const doseQuery = supabaseAdmin
          .from("scheduled_doses")
          .select("id,medication_id,scheduled_at,status")
          .eq("user_id", userId)
          .gte("scheduled_at", fromIso)
          .lte("scheduled_at", toIso);

        if (resolvedMedId) doseQuery.eq("medication_id", resolvedMedId);

        const { data: candidates } = await doseQuery;

        if (candidates && candidates.length > 0) {
          // Pick the candidate with smallest |scheduled_at - takenAt|
          const best = candidates
            .map((c) => ({
              ...c,
              delta: Math.abs(new Date(c.scheduled_at).getTime() - takenAt.getTime()),
            }))
            .sort((a, b) => a.delta - b.delta)[0];
          matchedDoseId = best.id;
          resolvedMedId = best.medication_id;
          minutesLate = Math.max(
            0,
            Math.round((takenAt.getTime() - new Date(best.scheduled_at).getTime()) / 60000),
          );
        }

        if (!resolvedMedId) {
          // Fall back to any active medication belonging to the user
          const { data: meds } = await supabaseAdmin
            .from("medications")
            .select("id")
            .eq("user_id", userId)
            .eq("active", true)
            .limit(1);
          if (meds && meds.length > 0) resolvedMedId = meds[0].id;
        }

        if (!resolvedMedId) {
          return jsonResponse(
            { error: "No medication found for this device's user" },
            404,
          );
        }

        // 3. Insert the dose event
        const { data: event, error: insErr } = await supabaseAdmin
          .from("dose_events")
          .insert({
            user_id: userId,
            medication_id: resolvedMedId,
            scheduled_dose_id: matchedDoseId,
            device_id: device.id,
            taken_at: takenAt.toISOString(),
            source: "iot",
            minutes_late: minutesLate,
            note: note ?? null,
          })
          .select("id")
          .single();

        if (insErr) {
          return jsonResponse({ error: insErr.message }, 500);
        }

        return jsonResponse(
          {
            ok: true,
            event_id: event.id,
            matched_scheduled_dose: matchedDoseId,
            minutes_late: minutesLate,
          },
          200,
        );
      },
    },
  },
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
