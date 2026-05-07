import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Camera,
  LogOut,
  Moon,
  Shield,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Account Settings — CareSync HIV" }] }),
  component: SettingsPage,
});

type Prefs = {
  dose_reminders: boolean;
  missed_dose_alerts: boolean;
  care_team_updates: boolean;
  weekly_summary: boolean;
};

const DEFAULT_PREFS: Prefs = {
  dose_reminders: true,
  missed_dose_alerts: true,
  care_team_updates: true,
  weekly_summary: true,
};

function SettingsPage() {
  const { user, loading, signOut, stayLoggedIn, setStayLoggedIn } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url, notification_prefs")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        if (data.notification_prefs) {
          setPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs as Partial<Prefs>) });
        }
      }
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const savePrefs = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: next })
      .eq("id", user.id);
    if (error) toast.error(error.message);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);
    setUploading(false);
    if (updErr) toast.error(updErr.message);
    else {
      setAvatarUrl(url);
      toast.success("Profile picture updated");
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password changed");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const initials =
    (fullName || user?.email || "?")
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-white px-5 pt-10 pb-8 rounded-b-[1.75rem]">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-smooth"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-white/70 text-xs">Account</p>
            <h1 className="font-display text-xl font-bold">Settings</h1>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="relative">
            <div className="size-20 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-2xl">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 size-8 rounded-full bg-white text-primary shadow-elegant flex items-center justify-center hover:scale-105 transition-smooth disabled:opacity-60"
              aria-label="Change picture"
            >
              <Camera className="size-4" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatar}
            />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold truncate">{fullName || user?.email?.split("@")[0]}</p>
            <p className="text-xs text-white/70 truncate">{user?.email}</p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-5">
        {/* Profile */}
        <Section icon={<UserIcon className="size-4" />} title="Profile information">
          <div className="space-y-3">
            <Field label="Full name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Phone number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="+1 555 123 4567" />
            </Field>
            <Button onClick={saveProfile} disabled={savingProfile} className="w-full h-11 rounded-xl">
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="size-4" />} title="Notifications">
          <div className="space-y-1">
            <Toggle
              label="Dose reminders"
              hint="Get reminded when it's time to take a medication"
              checked={prefs.dose_reminders}
              onChange={(v) => savePrefs({ ...prefs, dose_reminders: v })}
            />
            <Toggle
              label="Missed dose alerts"
              hint="Notify me if a dose is missed"
              checked={prefs.missed_dose_alerts}
              onChange={(v) => savePrefs({ ...prefs, missed_dose_alerts: v })}
            />
            <Toggle
              label="Care team updates"
              hint="Messages and updates from clinicians or caregivers"
              checked={prefs.care_team_updates}
              onChange={(v) => savePrefs({ ...prefs, care_team_updates: v })}
            />
            <Toggle
              label="Weekly summary"
              hint="Adherence summary email each week"
              checked={prefs.weekly_summary}
              onChange={(v) => savePrefs({ ...prefs, weekly_summary: v })}
            />
          </div>
        </Section>

        {/* Appearance */}
        <Section
          icon={theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          title="Appearance"
        >
          <Toggle
            label="Dark mode"
            hint="Switch between light and dark themes"
            checked={theme === "dark"}
            onChange={(v) => setTheme(v ? "dark" : "light")}
          />
        </Section>

        {/* Security */}
        <Section icon={<Shield className="size-4" />} title="Security">
          <Toggle
            label="Stay logged in"
            hint="Keep me signed in on this device"
            checked={stayLoggedIn}
            onChange={setStayLoggedIn}
          />
          <Separator className="my-3" />
          <div className="space-y-3">
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Button
              onClick={changePassword}
              disabled={changingPassword || !newPassword}
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              {changingPassword ? "Updating…" : "Change password"}
            </Button>
          </div>
        </Section>

        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full h-12 rounded-xl"
        >
          <LogOut className="size-4 mr-2" /> Sign out
        </Button>

        <p className="text-center text-[11px] text-muted-foreground pb-2">
          CareSync HIV · Smart Adherence & Treatment Support
        </p>
      </div>
    </MobileShell>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-display font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
