import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/useRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join care team — AdhereAI" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { user, loading } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setBusy(true);
    try {
      const trimmed = code.trim().toUpperCase();
      const { data: invite, error: invErr } = await supabase
        .from("care_invites")
        .select("id,patient_id,relationship,expires_at,redeemed_at")
        .eq("code", trimmed)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invite) throw new Error("Invite code not found");
      if (invite.redeemed_at) throw new Error("This code has already been used");
      if (new Date(invite.expires_at).getTime() < Date.now())
        throw new Error("This code has expired");
      if (invite.patient_id === user.id)
        throw new Error("You can't link yourself");

      const { error: linkErr } = await supabase.from("patient_links").upsert(
        {
          patient_id: invite.patient_id,
          clinician_id: user.id,
          relationship: invite.relationship,
        },
        { onConflict: "patient_id,clinician_id" },
      );
      if (linkErr) throw linkErr;

      // Mark redeemed (best-effort; RLS may prevent if invite owner is patient — acceptable)
      await supabase
        .from("care_invites")
        .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
        .eq("id", invite.id);

      toast.success("Linked to patient — you'll see them on your dashboard");
      navigate({ to: role === "patient" ? "/dashboard" : "/clinician" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to join";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen px-6 pt-16 pb-10">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
          <KeyRound className="size-5" />
        </div>
        <h1 className="font-display text-2xl font-bold">Join a care team</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter the 8-character code your patient shared with you.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            className="h-14 rounded-xl text-center tracking-[0.5em] font-display text-xl font-bold"
          />
          <Button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="w-full h-12 rounded-xl"
          >
            {busy ? "Linking…" : "Join care team"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate({ to: role === "patient" ? "/dashboard" : "/clinician" })}
          className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      </div>
    </div>
  );
}
