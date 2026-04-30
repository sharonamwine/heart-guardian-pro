import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Copy, Trash2, UserPlus, Users, Check } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/care-team")({
  head: () => ({ meta: [{ title: "Care team — AdhereAI" }] }),
  component: CareTeamPage,
});

type Link = {
  id: string;
  clinician_id: string;
  relationship: string;
  full_name: string | null;
};
type Invite = {
  id: string;
  code: string;
  relationship: string;
  expires_at: string;
  redeemed_at: string | null;
};

function generateCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function CareTeamPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<Link[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [relationship, setRelationship] = useState<"doctor" | "caregiver">("doctor");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: lnk } = await supabase
      .from("patient_links")
      .select("id,clinician_id,relationship")
      .eq("patient_id", user.id);
    const ids = (lnk ?? []).map((l) => l.clinician_id);
    const profs = ids.length
      ? (await supabase.from("profiles").select("id,full_name").in("id", ids)).data ?? []
      : [];
    const profMap = new Map(profs.map((p) => [p.id, p.full_name]));
    setLinks(
      (lnk ?? []).map((l) => ({
        id: l.id,
        clinician_id: l.clinician_id,
        relationship: l.relationship,
        full_name: profMap.get(l.clinician_id) ?? null,
      })),
    );
    const { data: inv } = await supabase
      .from("care_invites")
      .select("id,code,relationship,expires_at,redeemed_at")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    setInvites((inv ?? []) as Invite[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = async () => {
    if (!user) return;
    const code = generateCode();
    const { error } = await supabase
      .from("care_invites")
      .insert({ patient_id: user.id, code, relationship });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Invite code ${code} ready to share`);
    void load();
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from("patient_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed from care team");
    void load();
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-white px-5 pt-10 pb-8 rounded-b-[1.75rem]">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs text-white/70">Patient</p>
            <h1 className="font-display text-xl font-bold">Your care team</h1>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-3">
          Generate an invite code to let a doctor or caregiver follow your adherence and
          receive missed-dose alerts.
        </p>
      </header>

      <section className="px-5 pt-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
          <p className="text-sm font-semibold mb-2">Invite a new member</p>
          <div className="flex gap-2 mb-3">
            {(["doctor", "caregiver"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRelationship(r)}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium capitalize ${
                  relationship === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button onClick={createInvite} className="w-full rounded-xl">
            <UserPlus className="size-4 mr-1" /> Generate invite code
          </Button>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="font-display text-lg font-bold mb-3">Active invite codes</h2>
        {invites.filter((i) => !i.redeemed_at).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No active codes. Generate one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {invites
              .filter((i) => !i.redeemed_at)
              .map((i) => (
                <li
                  key={i.id}
                  className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="font-display font-bold tracking-widest">{i.code}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      For {i.relationship} · expires{" "}
                      {new Date(i.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => copy(i.code)}
                  >
                    {copied === i.code ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="px-5 pt-8 pb-4">
        <h2 className="font-display text-lg font-bold mb-3">Linked clinicians</h2>
        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No one is linked yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li
                key={l.id}
                className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3"
              >
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {(l.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{l.full_name ?? "Clinician"}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {l.relationship}
                  </p>
                </div>
                <button
                  onClick={() => removeLink(l.id)}
                  className="size-9 rounded-xl text-muted-foreground hover:text-destructive flex items-center justify-center"
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}
