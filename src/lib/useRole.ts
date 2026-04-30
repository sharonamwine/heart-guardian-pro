import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "patient" | "doctor" | "caregiver" | "admin";

export function useRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role as AppRole);
        // Prefer non-patient if multiple
        const primary =
          roles.find((r) => r === "admin") ??
          roles.find((r) => r === "doctor") ??
          roles.find((r) => r === "caregiver") ??
          roles[0] ??
          "patient";
        setRole(primary);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    role,
    loading: loading || authLoading,
    isClinician: role === "doctor" || role === "caregiver",
    isAdmin: role === "admin",
  };
}
