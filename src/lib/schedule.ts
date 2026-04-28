import { supabase } from "@/integrations/supabase/client";

type Medication = {
  id: string;
  user_id: string;
  schedule_times: string[]; // ["08:00","20:00"]
  active: boolean;
};

/**
 * Ensures scheduled_doses rows exist for each active medication for the
 * given day range (default: today -> +6 days). Idempotent via unique (medication_id, scheduled_at).
 */
export async function ensureScheduledDoses(userId: string, daysAhead = 7) {
  const { data: meds, error } = await supabase
    .from("medications")
    .select("id,user_id,schedule_times,active")
    .eq("user_id", userId)
    .eq("active", true);
  if (error || !meds) return;

  const rows: { user_id: string; medication_id: string; scheduled_at: string; status: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(today.getTime() + d * 86_400_000);
    for (const med of meds as Medication[]) {
      for (const hhmm of med.schedule_times ?? []) {
        const [h, m] = hhmm.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const dt = new Date(day);
        dt.setHours(h, m, 0, 0);
        rows.push({
          user_id: userId,
          medication_id: med.id,
          scheduled_at: dt.toISOString(),
          status: "pending",
        });
      }
    }
  }
  if (rows.length === 0) return;
  // Upsert on unique (medication_id, scheduled_at) — ignore duplicates
  await supabase.from("scheduled_doses").upsert(rows, {
    onConflict: "medication_id,scheduled_at",
    ignoreDuplicates: true,
  });
}
