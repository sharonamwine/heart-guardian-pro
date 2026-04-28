import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Cpu, Copy, Plus, Radio, Trash2, Zap } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/devices")({
  head: () => ({ meta: [{ title: "IoT devices — AdhereAI" }] }),
  component: DevicesPage,
});

type Device = {
  id: string;
  name: string;
  device_token: string;
  active: boolean;
  last_seen_at: string | null;
};

type Medication = { id: string; name: string };

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function DevicesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [newName, setNewName] = useState("");
  const [simMedId, setSimMedId] = useState<string>("");
  const [simDeviceId, setSimDeviceId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const [d, m] = await Promise.all([
      supabase
        .from("iot_devices")
        .select("id,name,device_token,active,last_seen_at")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase.from("medications").select("id,name").eq("user_id", user.id).eq("active", true),
    ]);
    setDevices((d.data ?? []) as Device[]);
    setMeds((m.data ?? []) as Medication[]);
    if (!simMedId && m.data && m.data.length > 0) setSimMedId(m.data[0].id);
    if (!simDeviceId && d.data && d.data.length > 0) setSimDeviceId(d.data[0].id);
  }, [user, simMedId, simDeviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addDevice = async () => {
    if (!user || !newName.trim()) {
      toast.error("Device name required");
      return;
    }
    setBusy(true);
    const token = generateToken();
    const { error } = await supabase.from("iot_devices").insert({
      user_id: user.id,
      name: newName.trim(),
      device_token: token,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Device registered");
    setNewName("");
    await load();
  };

  const removeDevice = async (id: string) => {
    const { error } = await supabase.from("iot_devices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Device removed");
      await load();
    }
  };

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Token copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/iot/dose` : "";

  const simulate = async () => {
    const device = devices.find((d) => d.id === simDeviceId);
    if (!device) {
      toast.error("Register a device first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_token: device.device_token,
          medication_id: simMedId || undefined,
          taken_at: new Date().toISOString(),
          note: "Simulated pillbox event",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      toast.success(
        data.minutes_late != null
          ? `Logged via IoT (${data.minutes_late} min late)`
          : "Logged via IoT",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to simulate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-white px-5 pt-10 pb-6 rounded-b-[1.75rem]">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-white/85 text-sm">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="font-display text-2xl font-bold mt-2">Smart pillbox</h1>
        <p className="text-white/80 text-sm mt-1">Register IoT devices or simulate dose events</p>
      </header>

      <section className="px-5 pt-5 space-y-3">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webhook URL</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-muted rounded-lg px-2 py-1.5 break-all font-mono">
              {webhookUrl}
            </code>
            <button
              onClick={() => copy(webhookUrl)}
              className="size-9 rounded-lg hover:bg-muted flex items-center justify-center"
              aria-label="Copy URL"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            POST JSON with <code className="font-mono">device_token</code> and optional{" "}
            <code className="font-mono">medication_id</code>, <code className="font-mono">taken_at</code>.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold mt-2 mb-2">Your devices</h2>
          {devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <Cpu className="size-6 mx-auto text-muted-foreground" />
              <p className="font-semibold mt-2">No devices yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Register a smart pillbox or virtual device to start logging doses automatically.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.id} className="bg-card border border-border rounded-2xl p-3 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Radio className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.last_seen_at
                          ? `Last event ${new Date(d.last_seen_at).toLocaleString()}`
                          : "Never used"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-[11px] bg-muted rounded px-2 py-0.5 font-mono truncate max-w-[200px]">
                          {d.device_token}
                        </code>
                        <button
                          onClick={() => copy(d.device_token)}
                          className="text-xs text-primary font-medium"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDevice(d.id)}
                      className="size-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mt-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Kitchen pillbox"
              className="h-11 rounded-xl"
            />
            <Button
              onClick={addDevice}
              disabled={busy}
              className="h-11 rounded-xl bg-gradient-care shadow-glow font-semibold px-4"
            >
              <Plus className="size-4 mr-1" /> Register
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-care text-primary-foreground p-4 shadow-soft mt-4">
          <div className="flex items-center gap-2">
            <Zap className="size-4" />
            <p className="font-display font-semibold">Pillbox simulator</p>
          </div>
          <p className="text-xs text-white/85 mt-1">
            Simulate a "lid opened" event — posts to the public webhook exactly like real hardware.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-white/75">Device</label>
              <select
                value={simDeviceId}
                onChange={(e) => setSimDeviceId(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/95 text-foreground text-sm px-2 mt-1"
              >
                {devices.length === 0 && <option value="">No devices</option>}
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-white/75">Medication</label>
              <select
                value={simMedId}
                onChange={(e) => setSimMedId(e.target.value)}
                className="w-full h-10 rounded-xl bg-white/95 text-foreground text-sm px-2 mt-1"
              >
                <option value="">Auto-match</option>
                {meds.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={simulate}
            disabled={busy || devices.length === 0}
            variant="secondary"
            className="mt-3 w-full h-11 rounded-xl bg-white/95 hover:bg-white text-primary font-semibold"
          >
            Simulate dose taken
          </Button>
        </div>
      </section>

      <div className="h-10" />
    </MobileShell>
  );
}
