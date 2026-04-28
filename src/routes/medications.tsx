import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pill, Plus, Trash2, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureScheduledDoses } from "@/lib/schedule";
import { toast } from "sonner";

export const Route = createFileRoute("/medications")({
  head: () => ({ meta: [{ title: "Medications — AdhereAI" }] }),
  component: MedsPage,
});

type Med = {
  id: string;
  name: string;
  dosage: string;
  schedule_times: string[];
  instructions: string | null;
  active: boolean;
};

function MedsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [meds, setMeds] = useState<Med[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("medications")
      .select("id,name,dosage,schedule_times,instructions,active")
      .eq("user_id", user.id)
      .order("created_at");
    setMeds((data ?? []) as Med[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Medication removed");
      await load();
    }
  };

  return (
    <MobileShell>
      <header className="bg-gradient-care text-primary-foreground px-5 pt-10 pb-6 rounded-b-[1.75rem]">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-white/80 text-sm">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="font-display text-2xl font-bold mt-2">Your medications</h1>
        <p className="text-white/80 text-sm mt-1">ART regimen and schedule</p>
      </header>

      <section className="px-5 pt-5">
        {meds.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <Pill className="size-6 mx-auto text-muted-foreground" />
            <p className="font-semibold mt-2">No medications yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first to start tracking doses.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {meds.map((m) => (
              <li key={m.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Pill className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.dosage}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.schedule_times.map((t) => (
                        <span key={t} className="text-[11px] bg-muted px-2 py-0.5 rounded-full font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                    {m.instructions && (
                      <p className="text-xs text-muted-foreground mt-2">{m.instructions}</p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(m.id)}
                    className="size-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center transition-smooth"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={() => setAdding(true)}
          className="w-full mt-4 h-12 rounded-xl bg-gradient-care shadow-glow font-semibold"
        >
          <Plus className="size-4 mr-1" /> Add medication
        </Button>
      </section>

      {adding && user && (
        <AddMedModal
          userId={user.id}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            if (user) await ensureScheduledDoses(user.id);
            await load();
          }}
        />
      )}
    </MobileShell>
  );
}

function AddMedModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  const addTime = () => setTimes([...times, "20:00"]);
  const setTime = (i: number, v: string) => setTimes(times.map((t, idx) => (idx === i ? v : t)));
  const removeTime = (i: number) => setTimes(times.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim() || !dosage.trim() || times.length === 0) {
      toast.error("Name, dosage, and at least one time are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("medications").insert({
      user_id: userId,
      name: name.trim(),
      dosage: dosage.trim(),
      schedule_times: times,
      instructions: instructions.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Medication added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[480px] bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Add medication</h2>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biktarvy" className="h-11 rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Dosage</label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 tablet" className="h-11 rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Schedule times</label>
            <div className="space-y-2 mt-1">
              {times.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="time"
                    value={t}
                    onChange={(e) => setTime(i, e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  {times.length > 1 && (
                    <button
                      onClick={() => removeTime(i)}
                      className="size-11 rounded-xl hover:bg-muted flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTime} className="rounded-xl">
                <Plus className="size-4 mr-1" /> Add time
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Instructions (optional)</label>
            <Input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="With food"
              className="h-11 rounded-xl mt-1"
            />
          </div>
          <Button
            onClick={save}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gradient-care shadow-glow font-semibold mt-2"
          >
            {busy ? "Saving…" : "Save medication"}
          </Button>
        </div>
      </div>
    </div>
  );
}
