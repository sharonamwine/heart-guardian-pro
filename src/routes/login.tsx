import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Mail, Lock, HeartPulse, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type SignupRole = "patient" | "doctor" | "caregiver";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CareSync HIV" },
      { name: "description", content: "Sign in to your CareSync HIV HIV support account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("patient");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name || email.split("@")[0], role },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col px-6 pt-14 pb-10">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-white p-1.5 shadow-glow flex items-center justify-center">
            <Logo size={32} showText={false} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-lg">CareSync HIV</div>
            <div className="text-[11px] text-muted-foreground">Smart Adherence &amp; Treatment Support</div>
          </div>
        </div>

        <div className="mt-12">
          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "signin"
              ? "Sign in to continue your treatment support."
              : "Start tracking your treatment with privacy-first care."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">I am a…</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "patient", label: "Patient", Icon: HeartPulse },
                    { v: "doctor", label: "Doctor", Icon: Stethoscope },
                    { v: "caregiver", label: "Caregiver", Icon: Users },
                  ] as const).map(({ v, label, Icon }) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setRole(v)}
                      className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-smooth ${
                        role === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 rounded-xl"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gradient-care hover:opacity-90 shadow-glow font-semibold mt-6"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-smooth text-center"
        >
          {mode === "signin" ? (
            <>
              New here? <span className="text-primary font-medium">Create an account</span>
            </>
          ) : (
            <>
              Already have one? <span className="text-primary font-medium">Sign in</span>
            </>
          )}
        </button>

        <p className="mt-auto text-center text-xs text-muted-foreground">
          By continuing you agree to keep your credentials private.
        </p>
      </div>
    </div>
  );
}
