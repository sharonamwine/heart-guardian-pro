import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Contact, type Reading, type Reminder, seedReadings } from "./health-data";

type User = { id: string; name: string; email: string };

type AppState = {
  user: User | null;
  readings: Reading[];
  reminders: Reminder[];
  contacts: Contact[];
  login: (email: string, name?: string) => void;
  logout: () => void;
  addReading: (r: Omit<Reading, "id" | "timestamp">) => void;
  addReminder: (r: Omit<Reminder, "id">) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  addContact: (c: Omit<Contact, "id">) => void;
  deleteContact: (id: string) => void;
};

const Ctx = createContext<AppState | null>(null);

const KEY = "vitalsense.v1";

type Persisted = {
  user: User | null;
  readings: Reading[];
  reminders: Reminder[];
  contacts: Contact[];
};

function load(): Persisted {
  if (typeof window === "undefined") {
    return { user: null, readings: [], reminders: [], contacts: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {}
  return {
    user: null,
    readings: seedReadings(),
    reminders: [
      { id: "r1", title: "Morning glucose check", time: "08:00", enabled: true },
      { id: "r2", title: "Evening medication", time: "21:00", enabled: true },
    ],
    contacts: [
      { id: "c1", name: "Dr. Sarah Chen", phone: "+15550101", relationship: "Primary physician" },
      { id: "c2", name: "Emergency Services", phone: "911", relationship: "Emergency" },
    ],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      login: (email, name) =>
        setState((s) => ({
          ...s,
          user: { id: "u1", email, name: name ?? email.split("@")[0] },
        })),
      logout: () => setState((s) => ({ ...s, user: null })),
      addReading: (r) =>
        setState((s) => ({
          ...s,
          readings: [{ ...r, id: crypto.randomUUID(), timestamp: Date.now() }, ...s.readings],
        })),
      addReminder: (r) =>
        setState((s) => ({ ...s, reminders: [...s.reminders, { ...r, id: crypto.randomUUID() }] })),
      toggleReminder: (id) =>
        setState((s) => ({
          ...s,
          reminders: s.reminders.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
        })),
      deleteReminder: (id) =>
        setState((s) => ({ ...s, reminders: s.reminders.filter((x) => x.id !== id) })),
      addContact: (c) =>
        setState((s) => ({ ...s, contacts: [...s.contacts, { ...c, id: crypto.randomUUID() }] })),
      deleteContact: (id) =>
        setState((s) => ({ ...s, contacts: s.contacts.filter((x) => x.id !== id) })),
    }),
    [state],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
