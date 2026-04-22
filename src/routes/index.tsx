import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, Heart, Droplet, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VitalSense — Smart Health Monitoring" },
      {
        name: "description",
        content:
          "Track blood sugar, heart rate, and blood pressure with real-time alerts, reminders, and emergency contacts.",
      },
      { property: "og:title", content: "VitalSense — Smart Health Monitoring" },
      {
        property: "og:description",
        content: "Real-time vitals, abnormal-value alerts, and one-tap emergency calling.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[440px] min-h-screen bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative px-6 pt-14 pb-10 flex flex-col min-h-screen">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Activity className="size-5" />
            </div>
            <span className="font-display font-semibold text-lg">VitalSense</span>
          </div>

          <div className="mt-16 flex-1">
            <h1 className="font-display text-4xl font-bold leading-tight">
              Your vitals,
              <br />
              <span className="text-accent">always in sight.</span>
            </h1>
            <p className="mt-4 text-white/70 text-base leading-relaxed">
              Track blood sugar, heart rate, and blood pressure. Get instant alerts when something
              looks off — and reach help in one tap.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              <FeatureChip icon={<Droplet className="size-5" />} label="Glucose" />
              <FeatureChip icon={<Heart className="size-5" />} label="Heart" />
              <FeatureChip icon={<Activity className="size-5" />} label="Pressure" />
            </div>

            <div className="mt-8 flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <ShieldCheck className="size-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-white/80">
                Critical-value detection alerts you the moment a reading enters a dangerous range.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-2xl bg-white text-foreground hover:bg-white/90 shadow-elegant font-semibold"
            >
              <Link to="/login">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-center text-xs text-white/60">
              Demo mode — no real medical data is stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center text-accent">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
