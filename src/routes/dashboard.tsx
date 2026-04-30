import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Check, Clock, LogOut, Pill, Plus, ShieldCheck, Users } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { AdherenceRing } from "@/components/AdherenceRing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { ensureScheduledDoses } from "@/lib/schedule";
import { computeRisk, type DoseRow, type EventRow, levelLabel } from "@/lib/adherence";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CareSync HIV" }] }),
  component: Dashboard,
});

type MedMap = Record<string, { name: string; dosage: string }>;

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { role, loading: roleLoading, isClinician } = useRole();
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [meds, setMeds] = useState<MedMap>({});
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (roleLoading) return;
    if (role === "admin") navigate({ to: "/admin" });
    else if (isClinician) navigate({ to: "/clinician" });
  }, [role, roleLoading, isClinician, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    await ensureScheduledDoses(user.id);
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const [dosesRes, eventsRes, medsRes, profRes] = await Promise.all([
      supabase
        .from("scheduled_doses")
        .select("id,scheduled_at,status,medication_id")
        .eq("user_id", user.id)
        .gte("scheduled_at", since)
        .order("scheduled_at"),
      supabase
        .from("dose_events")
        .select("scheduled_dose_id,medication_id,taken_at,minutes_late")
        .eq("user_id", user.id)
        .gte("taken_at", since),
      supabase.from("medications").select("id,name,dosage").eq("user_id", user.id),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    setDoses((dosesRes.data ?? []) as DoseRow[]);
    setEvents((eventsRes.data ?? []) as EventRow[]);
    const m: MedMap = {};
    for (const r of medsRes.data ?? []) m[r.id] = { name: r.name, dosage: r.dosage };
    setMeds(m);
    setProfile(profRes.data ?? null);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const risk = computeRisk(now, doses, events);

  // Today's schedule
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const takenDoseIds = new Set(events.map((e) => e.scheduled_dose_id).filter(Boolean) as string[]);
  const todays = doses
    .filter((d) => {
      const t = new Date(d.scheduled_at);
      return t >= startOfDay && t < endOfDay;
    })
    .map((d) => ({ ...d, taken: takenDoseIds.has(d.id) }));

  const markTaken = async (dose: DoseRow) => {
    if (!user) return;
    const scheduledAt = new Date(dose.scheduled_at);
    const minutesLate = Math.max(0, Math.round((Date.now() - scheduledAt.getTime()) / 60000));
    const { error } = await supabase.from("dose_events").insert({
      user_id: user.id,
      medication_id: dose.medication_id,
      scheduled_dose_id: dose.id,
      taken_at: new Date().toISOString(),
      source: "manual",
      minutes_late: minutesLate,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dose logged");
    await load();
  };

  const riskGradient =
    risk.level === "low" ? "bg-gradient-risk-low" : risk.level === "medium" ? "bg-gradient-risk-med" : "bg-gradient-risk-high";

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-white px-5 pt-10 pb-8 rounded-b-[1.75rem]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs">Welcome back</p>
            <h1 className="font-display text-xl font-bold">
              {profile?.full_name ?? user?.email?.split("@")[0] ?? "Friend"}
            </h1>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-smooth"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <AdherenceRing value={risk.adherence7d} label="7-day" sublabel="adherence" />
          <div className="flex-1 space-y-2">
            <div className={`${riskGradient} rounded-2xl p-3 shadow-soft`}>
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {levelLabel(risk.level)}
                </span>
              </div>
              <p className="text-white font-display font-bold text-2xl mt-1">{risk.score}<span className="text-sm font-medium text-white/80">/100</span></p>
            </div>
            <Link
              to="/risk"
              className="block text-center text-xs text-white/80 hover:text-white transition-smooth"
            >
              View details →
            </Link>
          </div>
        </div>
      </header>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Today's doses</h2>
          <Link to="/medications" className="text-xs text-primary font-medium">Manage</Link>
        </div>

        {todays.length === 0 ? (
          <EmptyToday />
        ) : (
          <ul className="space-y-2">
            {todays.map((d) => {
              const med = meds[d.medication_id];
              const t = new Date(d.scheduled_at);
              const timeStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const isPast = t.getTime() < Date.now();
              return (
                <li
                  key={d.id}
                  className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-soft"
                >
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Pill className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{med?.name ?? "Medication"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> {timeStr} · {med?.dosage ?? ""}
                    </p>
                  </div>
                  {d.taken ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <Check className="size-4" /> Taken
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => markTaken(d)}
                      className={`rounded-xl h-9 ${isPast ? "bg-warning text-warning-foreground hover:bg-warning/90" : "bg-primary hover:bg-primary/90"}`}
                    >
                      {isPast ? "Log late" : "Take"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Button
          asChild
          variant="outline"
          className="w-full mt-4 h-11 rounded-xl border-dashed"
        >
          <Link to="/medications">
            <Plus className="size-4 mr-1" /> Add medication
          </Link>
        </Button>
      </section>

      <section className="px-5 pt-8 pb-4">
        <h2 className="font-display text-lg font-bold mb-3">This week</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Taken" value={`${Math.round(risk.adherence7d * 100)}%`} tone="primary" />
          <Stat label="Missed" value={risk.missed7d} tone={risk.missed7d > 0 ? "destructive" : "muted"} />
          <Stat label="Late" value={risk.late7d} tone={risk.late7d > 0 ? "warning" : "muted"} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link
            to="/care-team"
            className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2 hover:border-primary/40 transition-smooth"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Care team</p>
              <p className="text-[10px] text-muted-foreground">Invite doctor</p>
            </div>
          </Link>
          <Link
            to="/devices"
            className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2 hover:border-primary/40 transition-smooth"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Pillbox</p>
              <p className="text-[10px] text-muted-foreground">IoT device</p>
            </div>
          </Link>
        </div>
      </section>
    </MobileShell>
  );
}

function EmptyToday() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <Pill className="size-6 text-muted-foreground mx-auto" />
      <p className="font-semibold mt-2">No doses scheduled today</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add a medication to start tracking your treatment.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "primary" | "destructive" | "warning" | "muted";
}) {
  const bg =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-2xl p-3 ${bg}`}>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] font-medium mt-0.5">{label}</p>
    </div>
  );
}
