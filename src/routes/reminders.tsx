import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — VitalSense" },
      { name: "description", content: "Schedule reminders for readings and medication." },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const { user, reminders, addReminder, toggleReminder, deleteReminder } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:00");

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  return (
    <MobileShell>
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Reminders</h1>
            <p className="text-sm text-muted-foreground">Stay on track with daily check-ins.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title) return;
            addReminder({ title, time, enabled: true });
            setTitle("");
          }}
          className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Take blood pressure medication"
            className="h-11 rounded-xl"
          />
          <div className="flex gap-3">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11 rounded-xl flex-1"
            />
            <Button
              type="submit"
              className="h-11 rounded-xl bg-gradient-primary hover:opacity-90 px-5"
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-2">
          {reminders.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No reminders yet. Add one above.
            </p>
          )}
          {reminders.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-soft"
            >
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium truncate", !r.enabled && "text-muted-foreground line-through")}>
                  {r.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.time}</p>
              </div>
              <button
                onClick={() => toggleReminder(r.id)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-smooth",
                  r.enabled ? "bg-primary" : "bg-muted",
                )}
                aria-label="Toggle"
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 bg-white rounded-full shadow transition-smooth",
                    r.enabled ? "left-5" : "left-0.5",
                  )}
                />
              </button>
              <button
                onClick={() => deleteReminder(r.id)}
                className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
