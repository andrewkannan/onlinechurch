"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getLocalChurchConfig, fetchChurchConfig } from "@/lib/clientConfig";

export type CrewRole = "DIRECTOR" | "CAMERA" | "AUDIO" | "MODERATOR" | "QC";
export type UserPermission = "ADMIN" | "LEAD" | "OPERATOR";

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  callsign: string;
  role: CrewRole;
  permission: UserPermission;
  stationAssignment: string;
  status: "ON_DUTY" | "STANDBY" | "OFF_DUTY";
  goStatus: "GO" | "STANDBY" | "HOLD";
  device: string;
  lastActiveAt: string;
}

interface RosterPreviewItem {
  id: string;
  username: string;
  name: string;
  callsign: string;
  role: CrewRole;
  permission: UserPermission;
  stationAssignment: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; user?: AuthenticatedUser }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  openSwitchModal: (prefillUsername?: string) => void;
  openCredentialsModal: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: async () => {},
  refreshSession: async () => {},
  openSwitchModal: () => {},
  openCredentialsModal: () => {},
});

export const useAuth = () => useContext(AuthContext);

const LOCAL_AUTH_KEY = "church_auth_user_v1";
const LOCAL_CREW_ID_KEY = "church_crew_identity_v3";

const ROLE_BADGE_STYLES: Record<
  CrewRole,
  { dot: string; pill: string; label: string }
> = {
  DIRECTOR: {
    dot: "bg-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border-rose-500/25",
    label: "Director",
  },
  CAMERA: {
    dot: "bg-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border-amber-500/25",
    label: "Camera",
  },
  AUDIO: {
    dot: "bg-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border-sky-500/25",
    label: "Audio",
  },
  MODERATOR: {
    dot: "bg-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border-violet-500/25",
    label: "Moderator",
  },
  QC: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
    label: "Quality Control",
  },
};

const DEFAULT_DEMO_PASSWORDS: Record<string, string> = {
  andrew: "director123",
  kevin: "camera123",
  jason: "audio123",
  hannah: "mod123",
  daniel: "qc123",
};

function detectClientDevice(): string {
  if (typeof navigator === "undefined") return "Console";
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone Mobile";
  if (/iPad/i.test(ua)) return "iPad Tablet";
  if (/Android/i.test(ua)) return "Android Mobile";
  if (/Macintosh/i.test(ua)) return "Mac Console";
  if (/Windows/i.test(ua)) return "Windows Console";
  return "Browser Console";
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterPreview, setRosterPreview] = useState<RosterPreviewItem[]>([]);

  // Church branding for Login gate
  const [churchName, setChurchName] = useState("Grace Online Church");
  const [subtitle, setSubtitle] = useState(
    "Live Stream Broadcast & Ministry Hub"
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Full-screen Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Switch Account Modal state (when already logged in)
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchUsername, setSwitchUsername] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switchSubmitting, setSwitchSubmitting] = useState(false);

  // Update Own Credentials Modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credUsername, setCredUsername] = useState("");
  const [credCurrentPassword, setCredCurrentPassword] = useState("");
  const [credNewPassword, setCredNewPassword] = useState("");
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);
  const [credSaving, setCredSaving] = useState(false);

  const syncLocalIdentity = (authUser: AuthenticatedUser | null) => {
    try {
      if (authUser) {
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(authUser));
        localStorage.setItem(
          LOCAL_CREW_ID_KEY,
          JSON.stringify({
            id: authUser.id,
            username: authUser.username,
            name: authUser.name,
            role: authUser.role,
            permission: authUser.permission,
            callsign: authUser.callsign,
          })
        );
      } else {
        localStorage.removeItem(LOCAL_AUTH_KEY);
      }
      window.dispatchEvent(new Event("church-auth-changed"));
    } catch {
      // ignore storage errors
    }
  };

  const refreshSession = useCallback(async () => {
    try {
      let cachedId: string | undefined;
      try {
        const raw = localStorage.getItem(LOCAL_AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) cachedId = parsed.id;
        }
      } catch {
        // ignore
      }

      const res = await fetch("/api/auth", {
        cache: "no-store",
        headers: cachedId ? { "x-auth-user-id": cachedId } : undefined,
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.rosterPreview)) {
        setRosterPreview(data.rosterPreview);
      }
      if (data.authenticated && data.user) {
        setUser(data.user);
        syncLocalIdentity(data.user);
      } else {
        setUser(null);
      }
    } catch {
      // keep cached user if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load cached branding immediately
    const cachedConfig = getLocalChurchConfig();
    if (cachedConfig) {
      setChurchName(cachedConfig.churchName || "Grace Online Church");
      setSubtitle(
        cachedConfig.subtitle || "Live Stream Broadcast & Ministry Hub"
      );
      setLogoUrl(cachedConfig.logoUrl || null);
    }
    fetchChurchConfig().then(({ config }) => {
      setChurchName(config.churchName || "Grace Online Church");
      setSubtitle(config.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(config.logoUrl || null);
    });

    // Hydrate cached user for 0ms initial check before verifying with server
    try {
      const raw = localStorage.getItem(LOCAL_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.username) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore
    }

    refreshSession();
  }, [refreshSession]);

  const login = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ ok: boolean; error?: string; user?: AuthenticatedUser }> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOGIN",
          username: usernameInput.trim(),
          password: passwordInput,
          device: detectClientDevice(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated || !data.user) {
        return {
          ok: false,
          error:
            data.error ||
            "Invalid username or password. Please verify your credentials.",
        };
      }
      setUser(data.user);
      syncLocalIdentity(data.user);
      return { ok: true, user: data.user };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || "Network error during sign in.",
      };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOGOUT" }),
      });
    } catch {
      // ignore
    }
    setUser(null);
    syncLocalIdentity(null);
    setLoginPassword("");
    setLoginError(null);
  };

  const openSwitchModal = (prefillUsername?: string) => {
    setSwitchUsername(prefillUsername || "");
    setSwitchPassword("");
    setSwitchError(null);
    setShowSwitchModal(true);
  };

  const openCredentialsModal = () => {
    if (!user) return;
    setCredUsername(user.username);
    setCredCurrentPassword("");
    setCredNewPassword("");
    setCredError(null);
    setCredSuccess(null);
    setShowCredentialsModal(true);
  };

  const handleFullLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError("Please enter both your username and password.");
      return;
    }
    setSubmitting(true);
    setLoginError(null);
    const result = await login(loginUsername, loginPassword);
    setSubmitting(false);
    if (!result.ok) {
      setLoginError(result.error || "Sign in failed.");
    } else {
      setLoginPassword("");
    }
  };

  const handleSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchUsername.trim() || !switchPassword) {
      setSwitchError("Enter both username and password.");
      return;
    }
    setSwitchSubmitting(true);
    setSwitchError(null);
    const result = await login(switchUsername, switchPassword);
    setSwitchSubmitting(false);
    if (!result.ok) {
      setSwitchError(result.error || "Invalid username or password.");
    } else {
      setShowSwitchModal(false);
      setSwitchPassword("");
    }
  };

  const handleSaveOwnCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!credCurrentPassword) {
      setCredError("Enter your current password to confirm changes.");
      return;
    }
    setCredSaving(true);
    setCredError(null);
    setCredSuccess(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CREDENTIALS",
          userId: user.id,
          currentPassword: credCurrentPassword,
          newUsername: credUsername.trim(),
          newPassword: credNewPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCredError(data.error || "Failed to update credentials.");
      } else if (data.user) {
        setUser(data.user);
        syncLocalIdentity(data.user);
        setCredCurrentPassword("");
        setCredNewPassword("");
        setCredSuccess("Account credentials updated.");
      }
    } catch (err: any) {
      setCredError(err.message || "Failed to update credentials.");
    } finally {
      setCredSaving(false);
    }
  };

  // While initial session is being verified and no cached user exists
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 antialiased">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#121215] border border-white/[0.08] text-xs font-medium text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Verifying broadcast session...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, display the Apple-inspired Broadcast Sign-In Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between p-4 sm:p-8 antialiased selection:bg-white selection:text-black">
        {/* Top Minimal Brand Bar */}
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={churchName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold tracking-tight text-white">
                  {churchName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">
                {churchName}
              </div>
              <div className="text-[11px] text-zinc-500">{subtitle}</div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Production Identity &amp; Access</span>
          </div>
        </header>

        {/* Center Sign-In Bento Card */}
        <main className="w-full max-w-md mx-auto my-auto py-8 space-y-5">
          <div className="bg-[#121215] border border-white/[0.09] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Operator Authentication
              </span>
              <h1 className="text-2xl font-semibold text-white tracking-[-0.025em]">
                Sign in to your account
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter your assigned username and password to access your
                station checklist, live broadcast controls, and stream QC.
              </p>
            </div>

            {loginError && (
              <div className="rounded-2xl px-4 py-3 bg-rose-950/30 border border-rose-500/35 text-xs text-rose-200 font-medium">
                {loginError}
              </div>
            )}

            <form onSubmit={handleFullLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                >
                  Username or Callsign
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. andrew, kevin, jason, hannah, daniel"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/35 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-medium text-zinc-400 hover:text-white transition"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/35 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-semibold text-xs tracking-tight transition shadow-sm"
              >
                {submitting ? "Signing In..." : "Sign In to Console"}
              </button>
            </form>
          </div>

          {/* Station Roster Quick-Fill Helper Card */}
          {rosterPreview.length > 0 && (
            <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Registered Team Accounts (Tap to Fill)
                </span>
                <span className="text-[11px] text-zinc-500">
                  {rosterPreview.length} Stations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rosterPreview.map((member) => {
                  const badge =
                    ROLE_BADGE_STYLES[member.role] || ROLE_BADGE_STYLES.CAMERA;
                  const defaultPwd =
                    DEFAULT_DEMO_PASSWORDS[member.username.toLowerCase()];
                  const isSelected =
                    loginUsername.toLowerCase() ===
                    member.username.toLowerCase();

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setLoginUsername(member.username);
                        if (defaultPwd) {
                          setLoginPassword(defaultPwd);
                        }
                        setLoginError(null);
                      }}
                      className={`text-left rounded-2xl p-3 border transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-white/[0.08] border-white/30"
                          : "bg-[#09090b] border-white/[0.06] hover:border-white/[0.16]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`}
                          />
                          <span className="text-xs font-semibold text-white truncate">
                            {member.name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {member.callsign}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                          @{member.username}
                          {defaultPwd ? ` · ${defaultPwd}` : ""}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border shrink-0 ${badge.pill}`}
                      >
                        {member.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <footer className="w-full max-w-5xl mx-auto text-center py-2 text-[11px] text-zinc-600">
          {churchName} · Role-Based Broadcast Access Control
        </footer>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshSession,
        openSwitchModal,
        openCredentialsModal,
      }}
    >
      {children}

      {/* Switch Operator / Sign In With Another Account Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Operator Authentication
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  Sign In to Station Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="px-3 py-1 rounded-full bg-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {switchError && (
              <div className="rounded-2xl px-3.5 py-2.5 bg-rose-950/30 border border-rose-500/35 text-xs text-rose-200 font-medium">
                {switchError}
              </div>
            )}

            <form onSubmit={handleSwitchSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username or Callsign
                </label>
                <input
                  type="text"
                  required
                  autoFocus={!switchUsername}
                  value={switchUsername}
                  onChange={(e) => setSwitchUsername(e.target.value)}
                  placeholder="Enter username (e.g. kevin)"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    {showSwitchPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showSwitchPassword ? "text" : "password"}
                  required
                  autoFocus={Boolean(switchUsername)}
                  value={switchPassword}
                  onChange={(e) => setSwitchPassword(e.target.value)}
                  placeholder="Enter operator password"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSwitchModal(false);
                    logout();
                  }}
                  className="px-4 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
                >
                  Sign Out Completely
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSwitchModal(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={switchSubmitting}
                    className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                  >
                    {switchSubmitting ? "Verifying..." : "Sign In"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self Account & Password Settings Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Account Security
                </span>
                <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                  {user.name} · Login Credentials
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="px-3 py-1 rounded-full bg-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {credError && (
              <div className="rounded-2xl px-3.5 py-2.5 bg-rose-950/30 border border-rose-500/35 text-xs text-rose-200 font-medium">
                {credError}
              </div>
            )}

            {credSuccess && (
              <div className="rounded-2xl px-3.5 py-2.5 bg-emerald-950/30 border border-emerald-500/35 text-xs text-emerald-200 font-medium">
                {credSuccess}
              </div>
            )}

            <form onSubmit={handleSaveOwnCredentials} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Current Password (Required)
                </label>
                <input
                  type="password"
                  required
                  value={credCurrentPassword}
                  onChange={(e) => setCredCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  value={credNewPassword}
                  onChange={(e) => setCredNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-[#09090b] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/35"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={credSaving}
                  className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  {credSaving ? "Saving..." : "Update Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
