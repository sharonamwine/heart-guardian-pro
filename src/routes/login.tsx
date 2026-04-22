import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — VitalSense" },
      { name: "description", content: "Sign in to your VitalSense health monitoring account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("alex@demo.com");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("demo1234");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login(email, mode === "signup" ? name || email.split("@")[0] : undefined);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[440px] min-h-screen flex flex-col px-6 pt-14 pb-10">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow">
            <Activity className="size-5" />
          </div>
          <span className="font-display font-semibold text-lg">VitalSense</span>
        </div>

        <div className="mt-12">
          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "signin"
              ? "Sign in to continue tracking your health."
              : "Start monitoring your vitals in seconds."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="h-12 rounded-xl"
              />
            </div>
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
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 shadow-glow font-semibold mt-6"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
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
          Demo mode — credentials aren't validated.
        </p>
      </div>
    </div>
  );
}
