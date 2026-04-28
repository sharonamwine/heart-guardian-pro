import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, Plus, Trash2, UserRound, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/providers")({
  head: () => ({ meta: [{ title: "Care team — AdhereAI" }] }),
  component: ProvidersPage,
});

type Provider = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  organization: string | null;
  notes: string | null;
};

function ProvidersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Provider[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("providers")
      .select("id,name,role,phone,email,organization,notes")
      .eq("user_id", user.id)
      .order("created_at");
    setList((data ?? []) as Provider[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("providers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Contact removed");
      await load();
    }
  };

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-white px-5 pt-10 pb-6 rounded-b-[1.75rem]">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-white/85 text-sm">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="font-display text-2xl font-bold mt-2">Your care team</h1>
        <p className="text-white/80 text-sm mt-1">Doctors, counselors, and support contacts</p>
      </header>

      <section className="px-5 pt-5">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <UserRound className="size-6 mx-auto text-muted-foreground" />
            <p className="font-semibold mt-2">No contacts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your HIV clinician or support contact.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UserRound className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.role}
                      {p.organization ? ` · ${p.organization}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.phone && (
                        <a
                          href={`tel:${p.phone}`}
                          className="inline-flex items-center gap-1 text-xs bg-success/15 text-success px-2 py-1 rounded-lg font-medium"
                        >
                          <Phone className="size-3" /> {p.phone}
                        </a>
                      )}
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium"
                        >
                          <Mail className="size-3" /> {p.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
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
          <Plus className="size-4 mr-1" /> Add contact
        </Button>
      </section>

      {adding && user && (
        <AddProviderModal
          userId={user.id}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await load();
          }}
        />
      )}
    </MobileShell>
  );
}

function AddProviderModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Doctor");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !role.trim()) {
      toast.error("Name and role required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("providers").insert({
      user_id: userId,
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      organization: organization.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact added");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[480px] bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Add contact</h2>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3">
          <LabeledInput label="Name" value={name} onChange={setName} placeholder="Dr. Aisha Patel" />
          <LabeledInput label="Role" value={role} onChange={setRole} placeholder="HIV specialist" />
          <LabeledInput label="Phone" value={phone} onChange={setPhone} placeholder="+1 555-0100" />
          <LabeledInput label="Email" value={email} onChange={setEmail} placeholder="care@clinic.org" />
          <LabeledInput label="Organization" value={organization} onChange={setOrganization} placeholder="City Clinic" />
          <Button
            onClick={save}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gradient-care shadow-glow font-semibold mt-2"
          >
            {busy ? "Saving…" : "Save contact"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl mt-1"
      />
    </div>
  );
}
