import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, LogOut, Stethoscope, Users, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clinician")({
  head: () => ({ meta: [{ title: "Care team — AdhereAI" }] }),
  component: ClinicianDashboard,
});

type Patient = {
  patient_id: string;
  relationship: string;
  full_name: string | null;
  phone: string | null;
  adherence_7d: number;
  missed_7d: number;
  last_alert_at: string | null;
};

function ClinicianDashboard() {
  const { user, loading, signOut } = useAuth();
  const { role, loading: roleLoading, isClinician } = useRole();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (roleLoading) return;
    if (role === "admin") navigate({ to: "/admin" });
    else if (role === "patient") navigate({ to: "/dashboard" });
  }, [roleLoading, role, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data: links } = await supabase
      .from("patient_links")
      .select("patient_id,relationship")
      .eq("clinician_id", user.id);
    const ids = (links ?? []).map((l) => l.patient_id);
    if (ids.length === 0) {
      setPatients([]);
      setBusy(false);
      return;
    }
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [profRes, dosesRes, eventsRes, alertRes] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone").in("id", ids),
      supabase
        .from("scheduled_doses")
        .select("user_id,scheduled_at,status")
        .in("user_id", ids)
        .gte("scheduled_at", since)
        .lte("scheduled_at", new Date().toISOString()),
      supabase
        .from("dose_events")
        .select("user_id,scheduled_dose_id,minutes_late")
        .in("user_id", ids)
        .gte("taken_at", since),
      supabase
        .from("alert_log")
        .select("patient_id,created_at")
        .in("patient_id", ids)
        .order("created_at", { ascending: false }),
    ]);

    const profs = new Map((profRes.data ?? []).map((p) => [p.id, p]));
    const lastAlert = new Map<string, string>();
    for (const a of alertRes.data ?? []) {
      if (!lastAlert.has(a.patient_id)) lastAlert.set(a.patient_id, a.created_at);
    }
    const result: Patient[] = (links ?? []).map((l) => {
      const dueDoses = (dosesRes.data ?? []).filter((d) => d.user_id === l.patient_id);
      const taken = new Set(
        (eventsRes.data ?? [])
          .filter((e) => e.user_id === l.patient_id && e.scheduled_dose_id)
          .map((e) => e.scheduled_dose_id as string),
      );
      const total = dueDoses.length;
      const adherence = total === 0 ? 1 : taken.size / total;
      const missed = Math.max(0, total - taken.size);
      const p = profs.get(l.patient_id);
      return {
        patient_id: l.patient_id,
        relationship: l.relationship,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        adherence_7d: adherence,
        missed_7d: missed,
        last_alert_at: lastAlert.get(l.patient_id) ?? null,
      };
    });
    setPatients(result.sort((a, b) => a.adherence_7d - b.adherence_7d));
    setBusy(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[760px] min-h-screen pb-12">
        <header className="bg-gradient-hero text-white px-6 pt-10 pb-8 rounded-b-[1.75rem]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <p className="text-xs text-white/70 capitalize">{role ?? "Clinician"}</p>
                <h1 className="font-display text-xl font-bold">Care team dashboard</h1>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Patients" value={patients.length} />
            <Stat
              label="At risk"
              value={patients.filter((p) => p.adherence_7d < 0.8).length}
            />
            <Stat
              label="Missed (7d)"
              value={patients.reduce((s, p) => s + p.missed_7d, 0)}
            />
          </div>
        </header>

        <section className="px-6 pt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Linked patients</h2>
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link to="/join">Redeem invite</Link>
            </Button>
          </div>

          {busy ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : patients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Users className="size-6 text-muted-foreground mx-auto" />
              <p className="font-semibold mt-2">No patients linked yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Ask a patient to share their care-team invite code, then redeem it to start
                monitoring their adherence.
              </p>
              <Button asChild className="mt-4 rounded-xl">
                <Link to="/join">Redeem an invite code</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {patients.map((p) => (
                <li
                  key={p.patient_id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {(p.full_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.full_name ?? "Patient"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {p.relationship} · {p.phone ?? "no phone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-xl font-bold ${
                          p.adherence_7d < 0.6
                            ? "text-destructive"
                            : p.adherence_7d < 0.85
                              ? "text-warning-foreground"
                              : "text-success"
                        }`}
                      >
                        {Math.round(p.adherence_7d * 100)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        7d adherence
                      </p>
                    </div>
                  </div>

                  {(p.missed_7d > 0 || p.last_alert_at) && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      {p.missed_7d > 0 && (
                        <span className="inline-flex items-center gap-1 text-destructive font-medium">
                          <AlertTriangle className="size-3" /> {p.missed_7d} missed
                        </span>
                      )}
                      {p.last_alert_at && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Activity className="size-3" />
                          Alerted{" "}
                          {new Date(p.last_alert_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground ml-auto" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-3">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-white/80 mt-0.5">{label}</p>
    </div>
  );
}
