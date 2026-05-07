import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  stayLoggedIn: boolean;
  setStayLoggedIn: (v: boolean) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stayLoggedIn, setStayLoggedInState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem("stayLoggedIn");
      if (v !== null) setStayLoggedInState(v === "true");
    } catch { /* ignore */ }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setStayLoggedIn = (v: boolean) => {
    setStayLoggedInState(v);
    try { localStorage.setItem("stayLoggedIn", String(v)); } catch { /* ignore */ }
  };

  // If user disables "Stay logged in", clear session when the tab closes
  useEffect(() => {
    if (stayLoggedIn) return;
    const handler = () => { void supabase.auth.signOut(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stayLoggedIn]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      stayLoggedIn,
      setStayLoggedIn,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, stayLoggedIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
