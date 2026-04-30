import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, LogOut, Shield, Users, Pill, AlertTriangle, HeartPulse, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — AdhereAI" }] }),
  component: AdminDashboard,
});

type RoleRow = { user_id: string; role: string };
type Profile = { id: string; full_name: string | null; phone: string | null; created_at: string };
type Stats = {
  users: number;
  patients: number;
  doctors: number;
  caregivers: number;
  admins: number;
  medications: number;
  doses7d: number;
  missed7d: number;
  alerts7d: number;
};

function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<Array<Profile & { roles: string[] }>>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") {
      navigate({ to: role === "patient" ? "/dashboard" : "/clinician" });
    }
  }, [roleLoading, role, navigate]);

  const load = useCallback(async () => {
    if (!user || role !== "admin") return;
    setBusy(true);
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [profilesRes, rolesRes, medsRes, dosesRes, alertsRes] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("medications").select("id", { count: "exact", head: true }),
      supabase
        .from("scheduled_doses")
        .select("id,status,scheduled_at")
        .gte("scheduled_at", since),
      supabase.from("alert_log").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const profiles = (profilesRes.data ?? []) as Profile[];
    const roles = (rolesRes.data ?? []) as RoleRow[];
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    const counts = { patient: 0, doctor: 0, caregiver: 0, admin: 0 } as Record<string, number>;
    for (const r of roles) counts[r.role] = (counts[r.role] ?? 0) + 1;

    const doses = dosesRes.data ?? [];
    const doses7d = doses.length;
    const missed7d = doses.filter((d) => d.status === "missed").length;

    setStats({
      users: profiles.length,
      patients: counts.patient ?? 0,
      doctors: counts.doctor ?? 0,
      caregivers: counts.caregiver ?? 0,
      admins: counts.admin ?? 0,
      medications: medsRes.count ?? 0,
      doses7d,
      missed7d,
      alerts7d: alertsRes.count ?? 0,
    });
    setUsers(
      profiles.map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? ["patient"] })),
    );
    setBusy(false);
  }, [user, role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || roleLoading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <Shield className="size-10 mx-auto text-muted-foreground" />
          <h1 className="font-display text-xl font-semibold mt-4">Admins only</h1>
          <p className="text-muted-foreground mt-1">This area is restricted to administrators.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-care flex items-center justify-center text-primary-foreground shadow-glow">
              <Activity className="size-4" />
            </div>
            <div>
              <div className="font-display font-semibold leading-tight">AdhereAI</div>
              <div className="text-xs text-muted-foreground">Admin console</div>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="size-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h1 className="font-display text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground mt-1">System-wide adherence and user management.</p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="size-4" />} label="Users" value={stats?.users ?? "—"} />
          <StatCard icon={<HeartPulse className="size-4" />} label="Patients" value={stats?.patients ?? "—"} />
          <StatCard icon={<Stethoscope className="size-4" />} label="Clinicians" value={(stats ? stats.doctors + stats.caregivers : "—") as number | string} />
          <StatCard icon={<Shield className="size-4" />} label="Admins" value={stats?.admins ?? "—"} />
          <StatCard icon={<Pill className="size-4" />} label="Medications" value={stats?.medications ?? "—"} />
          <StatCard icon={<Activity className="size-4" />} label="Doses (7d)" value={stats?.doses7d ?? "—"} />
          <StatCard icon={<AlertTriangle className="size-4" />} label="Missed (7d)" value={stats?.missed7d ?? "—"} tone={stats && stats.missed7d > 0 ? "warn" : "default"} />
          <StatCard icon={<AlertTriangle className="size-4" />} label="Alerts (7d)" value={stats?.alerts7d ?? "—"} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Users</h2>
            <span className="text-xs text-muted-foreground">{users.length} total</span>
          </div>
          <div className="rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
              <div className="col-span-5">Name</div>
              <div className="col-span-3">Phone</div>
              <div className="col-span-2">Roles</div>
              <div className="col-span-2 text-right">Joined</div>
            </div>
            {busy ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">No users yet.</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="grid grid-cols-12 px-4 py-3 border-t items-center text-sm">
                  <div className="col-span-5 font-medium truncate">{u.full_name ?? "—"}</div>
                  <div className="col-span-3 text-muted-foreground truncate">{u.phone ?? "—"}</div>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="col-span-2 text-right text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "warn";
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "warn" ? "bg-destructive/5 border-destructive/30" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
