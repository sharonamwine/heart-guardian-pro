import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, Plus, Trash2, ShieldAlert } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Emergency contacts — VitalSense" },
      { name: "description", content: "Manage emergency contacts and call them with one tap." },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { user, contacts, addContact, deleteContact } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  return (
    <MobileShell>
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Emergency</h1>
            <p className="text-sm text-muted-foreground">Reach help with one tap.</p>
          </div>
        </div>

        <a
          href="tel:911"
          className="mt-6 block rounded-3xl bg-gradient-heart text-white p-5 shadow-elegant relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-pulse-ring">
              <Phone className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider opacity-80">Tap to call</p>
              <p className="font-display text-2xl font-bold">Emergency Services</p>
            </div>
          </div>
        </a>

        <h2 className="mt-8 font-display font-semibold text-lg">Your contacts</h2>
        <div className="mt-3 space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-soft"
            >
              <div className="size-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center font-display font-bold">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.relationship} · {c.phone}
                </p>
              </div>
              <a
                href={`tel:${c.phone}`}
                className="size-10 rounded-xl bg-success/15 text-success-foreground flex items-center justify-center hover:bg-success/25 transition-smooth"
                aria-label={`Call ${c.name}`}
              >
                <Phone className="size-4" />
              </a>
              <button
                onClick={() => deleteContact(c.id)}
                className="size-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name || !phone) return;
            addContact({ name, phone, relationship: relationship || "Contact" });
            setName("");
            setPhone("");
            setRelationship("");
          }}
          className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft"
        >
          <p className="font-display font-semibold">Add contact</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-11 rounded-xl"
          />
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (e.g. +15550100)"
            className="h-11 rounded-xl"
          />
          <Input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relationship (e.g. Doctor)"
            className="h-11 rounded-xl"
          />
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90"
          >
            <Plus className="size-4" /> Add contact
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
