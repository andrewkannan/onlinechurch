"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import {
  fetchChurchConfig,
  saveChurchConfig,
  processLogoImageFile,
  getLocalChurchConfig,
} from "@/lib/clientConfig";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_ACCESS_MATRIX, CrewRole } from "@/lib/rbac";
import {
  AI_ROBOT_AVATAR_PRESETS,
  resolveRobotAvatarUrl,
  generateCustomRobotAvatar,
} from "@/lib/robotAvatars";
import type {
  WeeklyServiceRoster,
  OperatorBlockoutDate,
} from "@/components/WeeklyServingRosterTable";

const WeeklyServingRosterTable = dynamic(
  () => import("@/components/WeeklyServingRosterTable"),
  {
    loading: () => (
      <div className="rounded-2xl p-6 bg-[#111114] border border-white/[0.08] text-xs text-zinc-400">
        Loading Weekly Roster...
      </div>
    ),
  }
);

type UserPermission = "ADMIN" | "LEAD" | "OPERATOR";
type DutyStatus = "ON_DUTY" | "STANDBY" | "OFF_DUTY";
type GoNoGoStatus = "GO" | "STANDBY" | "HOLD";
type PreFlightPhase = "T-60M" | "T-30M" | "T-15M" | "T-5M";

interface CrewUserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  callsign: string;
  role: CrewRole;
  permission: UserPermission;
  stationAssignment: string;
  status: DutyStatus;
  goStatus: GoNoGoStatus;
  device: string;
  lastActiveAt: string;
  avatarUrl?: string;
  completedLessons?: string[];
  certifiedRoles?: CrewRole[];
}

interface CrewChecklistItem {
  id: string;
  role: CrewRole;
  phase: PreFlightPhase;
  category: string;
  task: string;
  detail: string;
  isCritical: boolean;
  assignedToUserId: string;
  assignedToName: string;
  checked: boolean;
  checkedBy?: string | null;
  checkedAt?: string | null;
}

const ROLES_LIST: CrewRole[] = [
  "DIRECTOR",
  "CAMERA",
  "AUDIO",
  "MODERATOR",
  "QC",
];

const DEPT_STYLES: Record<
  CrewRole,
  {
    label: string;
    code: string;
    dot: string;
    text: string;
    topBorder: string;
    pill: string;
    filterActive: string;
    checkSquare: string;
  }
> = {
  DIRECTOR: {
    label: "Director",
    code: "TD",
    dot: "bg-rose-400",
    text: "text-rose-400",
    topBorder: "border-t-2 border-t-rose-400",
    pill: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
    filterActive: "bg-rose-400 text-black font-semibold",
    checkSquare: "bg-rose-400 text-black",
  },
  CAMERA: {
    label: "Camera",
    code: "CAM",
    dot: "bg-amber-400",
    text: "text-amber-400",
    topBorder: "border-t-2 border-t-amber-400",
    pill: "bg-amber-500/12 text-amber-300 border border-amber-500/25",
    filterActive: "bg-amber-400 text-black font-semibold",
    checkSquare: "bg-amber-400 text-black",
  },
  AUDIO: {
    label: "Audio",
    code: "AUD",
    dot: "bg-sky-400",
    text: "text-sky-400",
    topBorder: "border-t-2 border-t-sky-400",
    pill: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
    filterActive: "bg-sky-400 text-black font-semibold",
    checkSquare: "bg-sky-400 text-black",
  },
  MODERATOR: {
    label: "Moderator",
    code: "MOD",
    dot: "bg-violet-400",
    text: "text-violet-400",
    topBorder: "border-t-2 border-t-violet-400",
    pill: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
    filterActive: "bg-violet-400 text-black font-semibold",
    checkSquare: "bg-violet-400 text-black",
  },
  QC: {
    label: "Quality Control",
    code: "QC",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    topBorder: "border-t-2 border-t-emerald-400",
    pill: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
    filterActive: "bg-emerald-400 text-black font-semibold",
    checkSquare: "bg-emerald-400 text-black",
  },
};

const PHASE_TIME_LABELS: Record<PreFlightPhase, string> = {
  "T-60M": "06:00 AM MYT · Check Start",
  "T-30M": "07:00 AM MYT · Optics & Mix",
  "T-15M": "08:00 AM MYT · Stream Preview",
  "T-5M": "08:25 AM MYT · Early Go-Live (-5m)",
};

export default function SettingsPage() {
  const { user: authUser, openSwitchModal } = useAuth();

  // Active Settings Section Tab (Defaults to USER_ACCOUNTS so User Account Management for All Roles is immediately visible)
  const [activeSection, setActiveSection] = useState<
    "USER_ACCOUNTS" | "WEEKLY_ROSTER" | "ROLE_MATRIX" | "BRANDING_APIS"
  >("USER_ACCOUNTS");

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // =========================================================================
  // 1. USER ACCOUNT MANAGEMENT & TASK ASSIGNMENT STATE (ALL ROLES)
  // =========================================================================
  const [users, setUsers] = useState<CrewUserAccount[]>([]);
  const [checklists, setChecklists] = useState<CrewChecklistItem[]>([]);
  const [weeklyRoster, setWeeklyRoster] = useState<WeeklyServiceRoster[]>([]);
  const [rosterBlockouts, setRosterBlockouts] = useState<
    OperatorBlockoutDate[]
  >([]);
  const [roleFilter, setRoleFilter] = useState<"ALL" | CrewRole>("ALL");
  const [selectedMatrixRole, setSelectedMatrixRole] =
    useState<CrewRole>("DIRECTOR");

  // Create New User Account Drawer
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserCallsign, setNewUserCallsign] = useState("");
  const [newUserRole, setNewUserRole] = useState<CrewRole>("CAMERA");
  const [newUserPermission, setNewUserPermission] =
    useState<UserPermission>("OPERATOR");
  const [newUserStation, setNewUserStation] = useState("");
  const [newUserAvatarUrl, setNewUserAvatarUrl] = useState<string>("");
  const [newUserRobotSeed, setNewUserRobotSeed] = useState(1);

  // Per-user AI Robot Synthesizer seed counter
  const [userRobotSeeds, setUserRobotSeeds] = useState<Record<string, number>>(
    {}
  );

  // Inline Login Credential Drafts per User Card
  const [userCredDrafts, setUserCredDrafts] = useState<
    Record<string, { username: string; password: string }>
  >({});

  // Inline Quick-Assign Checklist Task per User Card
  const [userQuickTaskDrafts, setUserQuickTaskDrafts] = useState<
    Record<string, { task: string; phase: PreFlightPhase }>
  >({});

  const applyCrewQcState = (data: any) => {
    if (!data) return;
    if (data.users) setUsers(data.users);
    if (data.checklists) setChecklists(data.checklists);
    if (data.weeklyRoster) setWeeklyRoster(data.weeklyRoster);
    if (data.rosterBlockouts) setRosterBlockouts(data.rosterBlockouts);
  };

  const fetchUsersAndChecks = async () => {
    try {
      const res = await fetch("/api/crew-qc", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      applyCrewQcState(data);
    } catch (e) {
      console.error("Failed to load user accounts:", e);
    }
  };

  // =========================================================================
  // 2. ORGANIZATION BRANDING & STREAM API CONFIGURATION STATE
  // =========================================================================
  const [churchName, setChurchName] = useState("Grace Online Church");
  const [subtitle, setSubtitle] = useState(
    "Live Stream Broadcast & Ministry Hub"
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultTranslation, setDefaultTranslation] = useState("NIV");
  const [geminiKey, setGeminiKey] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [youtubeLiveChatId, setYoutubeLiveChatId] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [youtubeOAuthAccessToken, setYoutubeOAuthAccessToken] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramLiveVideoId, setInstagramLiveVideoId] = useState("");

  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    const cached = getLocalChurchConfig();
    if (cached) {
      setChurchName(cached.churchName || "Grace Online Church");
      setSubtitle(cached.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(cached.logoUrl || null);
      setDefaultTranslation(cached.defaultTranslation || "NIV");
      setGeminiKey(cached.geminiApiKey || "");
      setYoutubeApiKey(cached.youtubeApiKey || "");
      setYoutubeChannelId(cached.youtubeChannelId || "");
      setYoutubeLiveChatId(cached.youtubeLiveChatId || "");
      setGoogleClientId(cached.googleClientId || "");
      setGoogleClientSecret(cached.googleClientSecret || "");
      setYoutubeOAuthAccessToken(cached.youtubeOAuthAccessToken || "");
      setInstagramToken(cached.instagramAccessToken || "");
      setInstagramLiveVideoId(cached.instagramLiveVideoId || "");
    }

    try {
      const { config, dbConnected: isOnline } = await fetchChurchConfig();
      setChurchName(config.churchName || "Grace Online Church");
      setSubtitle(config.subtitle || "Live Stream Broadcast & Ministry Hub");
      setLogoUrl(config.logoUrl || null);
      setDefaultTranslation(config.defaultTranslation || "NIV");
      setGeminiKey(config.geminiApiKey || "");
      setYoutubeApiKey(config.youtubeApiKey || "");
      setYoutubeChannelId(config.youtubeChannelId || "");
      setYoutubeLiveChatId(config.youtubeLiveChatId || "");
      setGoogleClientId(config.googleClientId || "");
      setGoogleClientSecret(config.googleClientSecret || "");
      setYoutubeOAuthAccessToken(config.youtubeOAuthAccessToken || "");
      setInstagramToken(config.instagramAccessToken || "");
      setInstagramLiveVideoId(config.instagramLiveVideoId || "");
      setDbConnected(isOnline);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSettings();
    fetchUsersAndChecks();
    const handleExternalUpdate = () => loadSettings();
    const handleAuthChange = () => fetchUsersAndChecks();
    window.addEventListener("church-config-updated", handleExternalUpdate);
    window.addEventListener("church-auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("church-config-updated", handleExternalUpdate);
      window.removeEventListener("church-auth-changed", handleAuthChange);
    };
  }, []);

  // =========================================================================
  // USER ACCOUNT MANAGEMENT HANDLERS
  // =========================================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const computedCallsign =
      newUserCallsign.trim() ||
      `${DEPT_STYLES[newUserRole].code}-0${users.length + 1}`;
    const avatarToSave = resolveRobotAvatarUrl(
      newUserAvatarUrl,
      newUserRole,
      computedCallsign
    );
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_USER",
        user: {
          name: newUserName.trim(),
          username:
            newUserUsername.trim().toLowerCase() ||
            newUserName.trim().split(/\s+/)[0].toLowerCase(),
          password: newUserPassword.trim() || "church123",
          email: newUserEmail,
          phone: newUserPhone,
          callsign: computedCallsign,
          role: newUserRole,
          permission: newUserPermission,
          stationAssignment:
            newUserStation.trim() || `${DEPT_STYLES[newUserRole].label} Station`,
          status: "ON_DUTY",
          avatarUrl: avatarToSave,
        },
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);
      setNewUserName("");
      setNewUserUsername("");
      setNewUserPassword("");
      setNewUserEmail("");
      setNewUserPhone("");
      setNewUserCallsign("");
      setNewUserStation("");
      setNewUserAvatarUrl("");
      setShowNewUserForm(false);
      triggerToast(`Created user account for ${newUserName}`);
    }
  };

  const handleSaveUserCredentials = async (user: CrewUserAccount) => {
    const draft = userCredDrafts[user.id];
    const nextUsername = draft?.username?.trim().toLowerCase() || user.username;
    const nextPassword = draft?.password?.trim();

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_CREDENTIALS",
        userId: user.id,
        adminOverride: true,
        newUsername: nextUsername,
        newPassword: nextPassword || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      triggerToast(data.error || "Failed to update credentials");
      return;
    }
    setUserCredDrafts((prev) => ({
      ...prev,
      [user.id]: { username: nextUsername, password: "" },
    }));
    fetchUsersAndChecks();
    triggerToast(`Saved login credentials for ${user.name} (@${nextUsername})`);
  };

  const handleUpdateUser = async (
    id: string,
    patch: Partial<CrewUserAccount>,
    customToast?: string
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_USER",
        id,
        ...patch,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.users) setUsers(updated.users);

      // Sync active session in localStorage if updating the currently signed-in user
      if (authUser && authUser.id === id) {
        try {
          const rawSession = localStorage.getItem("church_active_auth_user_v2");
          if (rawSession) {
            const parsed = JSON.parse(rawSession);
            localStorage.setItem(
              "church_active_auth_user_v2",
              JSON.stringify({ ...parsed, ...patch })
            );
            window.dispatchEvent(new Event("church-auth-changed"));
          }
        } catch {
          // ignore
        }
      }

      triggerToast(customToast || "Updated user account settings");
    }
  };

  const handleSynthesizeUserRobot = (user: CrewUserAccount) => {
    const nextSeed = (userRobotSeeds[user.id] || 0) + 1;
    setUserRobotSeeds((prev) => ({ ...prev, [user.id]: nextSeed }));
    const customRobotUri = generateCustomRobotAvatar(
      `${user.callsign || user.name}-${nextSeed}`,
      user.role,
      nextSeed
    );
    handleUpdateUser(
      user.id,
      { avatarUrl: customRobotUri },
      `Synthesized new AI Robotic Profile Pic for ${user.name}`
    );
  };

  const handleCustomUserAvatarUpload = async (
    user: CrewUserAccount,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processLogoImageFile(file);
      await handleUpdateUser(
        user.id,
        { avatarUrl: dataUrl },
        `Uploaded custom profile picture for ${user.name}`
      );
    } catch (err) {
      console.error("Failed to process custom avatar:", err);
      triggerToast("Failed to process image file");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE_USER", id }),
    });
    triggerToast(`Removed ${name}`);
  };

  const handleAssignQuickTaskToUser = async (user: CrewUserAccount) => {
    const draft = userQuickTaskDrafts[user.id];
    if (!draft || !draft.task.trim()) return;

    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_CHECK_ITEM",
        item: {
          role: user.role,
          phase: draft.phase || "T-30M",
          category: "Assigned",
          task: draft.task.trim(),
          detail: `Assigned to ${user.name} (${user.callsign})`,
          isCritical: true,
          assignedToUserId: user.id,
          assignedToName: user.name,
        },
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
      setUserQuickTaskDrafts((prev) => ({
        ...prev,
        [user.id]: { task: "", phase: "T-30M" },
      }));
      triggerToast(`Assigned task to ${user.name}`);
    }
  };

  const handleToggleCheck = async (id: string) => {
    const res = await fetch("/api/crew-qc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_CHECK",
        id,
        memberName: authUser?.name || "Andrew",
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      if (updated.checklists) setChecklists(updated.checklists);
    }
  };

  // =========================================================================
  // BRANDING & API HANDLERS
  // =========================================================================
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processLogoImageFile(file);
      setLogoUrl(dataUrl);
    } catch (err) {
      console.error("Failed to process logo:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const { config, dbConnected: isOnline } = await saveChurchConfig({
        churchName,
        subtitle,
        logoUrl,
        defaultTranslation,
        geminiApiKey: geminiKey,
        youtubeApiKey,
        youtubeChannelId,
        youtubeLiveChatId,
        googleClientId,
        googleClientSecret,
        youtubeOAuthAccessToken,
        instagramAccessToken: instagramToken,
        instagramLiveVideoId,
      });

      setChurchName(config.churchName);
      setSubtitle(config.subtitle);
      setLogoUrl(config.logoUrl);
      setDbConnected(isOnline);
      setFeedback({
        type: "success",
        text: "Organization identity and stream credentials saved",
      });
      triggerToast("System configuration saved");
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Could not save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (roleFilter === "ALL") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col w-full antialiased selection:bg-white selection:text-black">
      <Navbar churchName={churchName} />

      {/* Floating Notification Pill */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white text-black px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* ===================================================================
            TOP SETTINGS HEADER & SEGMENTED MODULE SWITCHER
           =================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-[-0.025em]">
              Users, Roles &amp; System Settings
            </h1>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dbConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {dbConnected ? "SQLite Sync" : "Local Sync"}
            </span>
          </div>

          {/* Apple-Style Segmented Control */}
          <div className="inline-flex flex-wrap items-center gap-1 bg-[#131316] p-1 rounded-full border border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection("USER_ACCOUNTS")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                activeSection === "USER_ACCOUNTS"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>User Accounts &amp; Roles</span>
              <span
                className={`tabular-nums text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSection === "USER_ACCOUNTS"
                    ? "bg-black/10 text-black font-bold"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("WEEKLY_ROSTER")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                activeSection === "WEEKLY_ROSTER"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Weekly Serving Roster</span>
              <span
                className={`tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSection === "WEEKLY_ROSTER"
                    ? "bg-black/10 text-black font-bold"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {weeklyRoster.length || 4} Wks
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("ROLE_MATRIX")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                activeSection === "ROLE_MATRIX"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Role Access Matrix</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSection === "ROLE_MATRIX"
                    ? "bg-black/10 text-black font-bold"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                5 Roles
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("BRANDING_APIS")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                activeSection === "BRANDING_APIS"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Branding &amp; Stream APIs
            </button>
          </div>
        </div>

        {/* ===================================================================
            TAB 0: WEEKLY SERVING ROSTER TABLE & SMART ROTATION
           =================================================================== */}
        {activeSection === "WEEKLY_ROSTER" && (
          <WeeklyServingRosterTable
            weeklyRoster={weeklyRoster}
            rosterBlockouts={rosterBlockouts}
            users={users}
            currentUser={{
              id: authUser?.id || "usr-director-1",
              name: authUser?.name || "Andrew",
              role: authUser?.role || "DIRECTOR",
              callsign: authUser?.callsign,
              avatarUrl: authUser?.avatarUrl,
            }}
            onRefreshState={applyCrewQcState}
            onTriggerToast={triggerToast}
          />
        )}

        {/* ===================================================================
            TAB 1: USER ACCOUNT MANAGEMENT FOR ALL ROLES (DEFAULT)
           =================================================================== */}
        {activeSection === "USER_ACCOUNTS" && (
          <div className="space-y-6">
            {/* Filter Bar by Role (ALL, DIRECTOR, CAMERA, AUDIO, MODERATOR, QC) + Create Account Button */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121215] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoleFilter("ALL")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                    roleFilter === "ALL"
                      ? "bg-white text-black font-semibold"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  All Roles ({users.length})
                </button>
                {ROLES_LIST.map((role) => {
                  const st = DEPT_STYLES[role];
                  const count = users.filter((u) => u.role === role).length;
                  const active = roleFilter === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`px-3.5 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 ${
                        active ? st.filterActive : st.pill
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className="font-mono text-[10px] opacity-80">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSection("ROLE_MATRIX")}
                  className="px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Inspect Role Permissions
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                >
                  {showNewUserForm ? "Cancel" : "+ New User Account"}
                </button>
              </div>
            </div>

            {/* Collapsible Create User Account Drawer */}
            {showNewUserForm && (
              <form
                onSubmit={handleCreateUser}
                className="rounded-3xl p-6 bg-[#141418] border border-white/[0.12] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                      New Operator Provisioning
                    </span>
                    <div className="text-base font-semibold text-white mt-0.5">
                      Create User Account &amp; Assign Role
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    Operators log in using their assigned @username and password
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Tan"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Login Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. marcus"
                      value={newUserUsername}
                      onChange={(e) =>
                        setNewUserUsername(
                          e.target.value.toLowerCase().replace(/\s+/g, "")
                        )
                      }
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Login Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="e.g. cam2pass"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Callsign
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CAM-02"
                      value={newUserCallsign}
                      onChange={(e) => setNewUserCallsign(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Department Role
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as CrewRole)
                      }
                      aria-label="Department Role"
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="DIRECTOR">Director (TD · Master All)</option>
                      <option value="CAMERA">Camera (CAM)</option>
                      <option value="AUDIO">Audio (AUD)</option>
                      <option value="MODERATOR">Moderator (MOD)</option>
                      <option value="QC">Quality Control (QC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Permission Tier
                    </label>
                    <select
                      value={newUserPermission}
                      onChange={(e) =>
                        setNewUserPermission(e.target.value as UserPermission)
                      }
                      aria-label="Permission Tier"
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="OPERATOR">Operator</option>
                      <option value="LEAD">Department Lead</option>
                      <option value="ADMIN">Admin / Director</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                      Hardware / Station Assignment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cam 2 PTZ & IG Blur Scene"
                      value={newUserStation}
                      onChange={(e) => setNewUserStation(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold py-2.5 px-4 transition"
                    >
                      Create User Account
                    </button>
                  </div>
                </div>

                {/* New Account AI Robotic Profile Pic Selector */}
                <div className="p-3.5 rounded-2xl bg-[#09090b] border border-white/[0.08] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden border border-white/[0.15] bg-black shrink-0">
                        <img
                          src={resolveRobotAvatarUrl(
                            newUserAvatarUrl,
                            newUserRole,
                            newUserCallsign || DEPT_STYLES[newUserRole].code
                          )}
                          alt="New Operator AI Robot Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                          Custom AI Robotic Profile Pic
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Choose a preset cybernetic droid or synthesize a custom AI robot for this account
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextSeed = newUserRobotSeed + 1;
                        setNewUserRobotSeed(nextSeed);
                        setNewUserAvatarUrl(
                          generateCustomRobotAvatar(
                            `${newUserCallsign || newUserName || "OP"}-${nextSeed}`,
                            newUserRole,
                            nextSeed
                          )
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white hover:text-black text-zinc-200 text-[11px] font-semibold border border-white/[0.12] transition"
                    >
                      Synthesize AI Robot ✦
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {AI_ROBOT_AVATAR_PRESETS.map((preset) => {
                      const activeUri = resolveRobotAvatarUrl(
                        newUserAvatarUrl,
                        newUserRole,
                        newUserCallsign || DEPT_STYLES[newUserRole].code
                      );
                      const isSelected = activeUri === preset.dataUri;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setNewUserAvatarUrl(preset.dataUri)}
                          className={`group rounded-xl p-1.5 border transition flex flex-col items-center gap-1 ${
                            isSelected
                              ? "bg-white/[0.12] border-white ring-1 ring-white/40"
                              : "bg-[#141418] border-white/[0.06] hover:border-white/25"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-black">
                            <img
                              src={preset.dataUri}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[9px] font-medium text-zinc-300 truncate w-full text-center">
                            {preset.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}

            {/* User Account Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredUsers.map((user) => {
                const style = DEPT_STYLES[user.role] || DEPT_STYLES.CAMERA;
                const roleSpec = ROLE_ACCESS_MATRIX[user.role];
                const userChecks = checklists.filter(
                  (c) => c.assignedToUserId === user.id
                );
                const userDone = userChecks.filter((c) => c.checked).length;
                const userPending = userChecks.length - userDone;
                const isCurrentOperator = authUser?.id === user.id;
                const quickDraft = userQuickTaskDrafts[user.id] || {
                  task: "",
                  phase: "T-30M" as PreFlightPhase,
                };
                const credDraft = userCredDrafts[user.id] || {
                  username: user.username || "",
                  password: "",
                };
                const resolvedUserAvatar = resolveRobotAvatarUrl(
                  user.avatarUrl,
                  user.role,
                  user.callsign
                );

                return (
                  <div
                    key={user.id}
                    className={`rounded-3xl p-6 bg-[#121215] border border-white/[0.08] ${style.topBorder} flex flex-col justify-between gap-5`}
                  >
                    <div className="space-y-4">
                      {/* Header Row: AI Robotic Profile Pic, Name, @username, Callsign & Actions */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.14] shadow-lg bg-black shrink-0">
                            <img
                              src={resolvedUserAvatar}
                              alt={`${user.name} AI Robot Profile`}
                              className="w-full h-full object-cover"
                            />
                            <span
                              className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black ${style.dot}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold text-white tracking-tight">
                                {user.name}
                              </h3>
                              <span className="text-[11px] font-mono text-zinc-200 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1]">
                                @{user.username}
                              </span>
                              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07]">
                                {user.callsign}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${style.pill}`}
                              >
                                {style.label}
                              </span>
                              {isCurrentOperator && (
                                <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-semibold">
                                  Active Session
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 mt-1">
                              {user.stationAssignment} · Allowed Pages:{" "}
                              <span className="font-mono text-zinc-300">
                                {roleSpec.allowedRoutes.join(", ")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isCurrentOperator && (
                            <button
                              type="button"
                              onClick={() => openSwitchModal(user.username)}
                              className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white text-zinc-200 hover:text-black text-[11px] font-medium border border-white/[0.08] transition"
                            >
                              Switch to {user.name.split(" ")[0]}
                            </button>
                          )}
                          {users.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteUser(user.id, user.name)
                              }
                              className="px-2.5 py-1.5 rounded-full text-[11px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 0. Custom AI Robotic Profile Picture Selector */}
                      <div className="p-3.5 rounded-2xl bg-[#09090b] border border-white/[0.06] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                              Custom AI Robotic Profile Pic
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              8 Cybernetic Droids + AI Synth
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSynthesizeUserRobot(user)}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white hover:text-black text-zinc-200 text-[10px] font-semibold border border-white/[0.1] transition"
                            >
                              Synthesize AI Robot ✦
                            </button>
                            <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-medium border border-white/[0.08] transition">
                              <span>Upload Custom</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleCustomUserAvatarUpload(user, e)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {AI_ROBOT_AVATAR_PRESETS.map((preset) => {
                            const isSelected =
                              resolvedUserAvatar === preset.dataUri;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateUser(
                                    user.id,
                                    { avatarUrl: preset.dataUri },
                                    `Assigned ${preset.name} to ${user.name}`
                                  )
                                }
                                title={`${preset.name} — ${preset.description}`}
                                className={`group rounded-xl p-1 border transition flex flex-col items-center gap-1 ${
                                  isSelected
                                    ? "bg-white/[0.14] border-white ring-1 ring-white/40"
                                    : "bg-[#141418] border-white/[0.06] hover:border-white/25"
                                }`}
                              >
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black">
                                  <img
                                    src={preset.dataUri}
                                    alt={preset.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[8px] font-mono text-zinc-300 truncate w-full text-center">
                                  {preset.name.split(" ")[0]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 1. Login Credentials (Username & Password) */}
                      <div className="p-3.5 rounded-2xl bg-[#09090b] border border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Login Username &amp; Password
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Current: @{user.username}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={credDraft.username}
                            onChange={(e) =>
                              setUserCredDrafts((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...credDraft,
                                  username: e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, ""),
                                },
                              }))
                            }
                            placeholder="Username"
                            aria-label="Username"
                            className="sm:col-span-4 bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                          />
                          <input
                            type="password"
                            value={credDraft.password}
                            onChange={(e) =>
                              setUserCredDrafts((prev) => ({
                                ...prev,
                                [user.id]: {
                                  ...credDraft,
                                  password: e.target.value,
                                },
                              }))
                            }
                            placeholder="New password..."
                            aria-label="New Password"
                            className="sm:col-span-5 bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveUserCredentials(user)}
                            className="sm:col-span-3 py-1.5 px-3 rounded-lg bg-white/[0.08] hover:bg-white hover:text-black text-zinc-200 text-xs font-semibold transition"
                          >
                            Save Login
                          </button>
                        </div>
                      </div>

                      {/* 2. Role, Permission, Callsign & Duty Status Assignment */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#09090b] border border-white/[0.06]">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Department Role
                          </label>
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                role: e.target.value as CrewRole,
                              })
                            }
                            aria-label="Department Role"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r} value={r}>
                                {DEPT_STYLES[r].label} ({r})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Access Tier
                          </label>
                          <select
                            value={user.permission}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                permission: e.target.value as UserPermission,
                              })
                            }
                            aria-label="Permission Level"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            <option value="ADMIN">Admin / Director</option>
                            <option value="LEAD">Department Lead</option>
                            <option value="OPERATOR">Operator</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Callsign
                          </label>
                          <input
                            type="text"
                            value={user.callsign}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                callsign: e.target.value.toUpperCase(),
                              })
                            }
                            aria-label="Callsign"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">
                            Duty Status
                          </label>
                          <select
                            value={user.status}
                            onChange={(e) =>
                              handleUpdateUser(user.id, {
                                status: e.target.value as DutyStatus,
                              })
                            }
                            aria-label="Duty Status"
                            className="w-full bg-[#141418] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
                          >
                            <option value="ON_DUTY">On Duty</option>
                            <option value="STANDBY">Standby</option>
                            <option value="OFF_DUTY">Off Duty</option>
                          </select>
                        </div>
                      </div>

                      {/* 3. Assigned Sunday Pre-Flight Tasks */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-300">
                            Assigned Sunday Pre-Flight Checks ({userDone}/
                            {userChecks.length} Verified)
                          </span>
                          {userPending > 0 ? (
                            <span className="text-[11px] font-semibold text-rose-400">
                              {userPending} Missing
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-400">
                              100% Complete
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {userChecks.map((chk) => (
                            <div
                              key={chk.id}
                              onClick={() => handleToggleCheck(chk.id)}
                              className={`cursor-pointer rounded-xl px-3 py-2 border flex items-center justify-between gap-2 text-xs transition ${
                                chk.checked
                                  ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                                  : "bg-rose-950/20 border-rose-500/35 text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    chk.checked
                                      ? style.checkSquare
                                      : "border border-rose-400 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span className="truncate font-medium">
                                  {chk.task}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                {PHASE_TIME_LABELS[chk.phase]?.split("·")[0] ||
                                  chk.phase}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4. Quick-Assign New Pre-Flight Task to User */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
                      <select
                        value={quickDraft.phase}
                        onChange={(e) =>
                          setUserQuickTaskDrafts((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...quickDraft,
                              phase: e.target.value as PreFlightPhase,
                            },
                          }))
                        }
                        aria-label="Task Phase"
                        className="bg-[#09090b] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-zinc-300 focus:outline-none"
                      >
                        <option value="T-60M">06:00 AM (T-60M)</option>
                        <option value="T-30M">07:00 AM (T-30M)</option>
                        <option value="T-15M">08:00 AM (T-15M)</option>
                        <option value="T-5M">08:25 AM (T-5M)</option>
                      </select>
                      <input
                        type="text"
                        placeholder={`Assign new task to ${user.name}...`}
                        value={quickDraft.task}
                        onChange={(e) =>
                          setUserQuickTaskDrafts((prev) => ({
                            ...prev,
                            [user.id]: {
                              ...quickDraft,
                              task: e.target.value,
                            },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAssignQuickTaskToUser(user);
                          }
                        }}
                        className="flex-1 bg-[#09090b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => handleAssignQuickTaskToUser(user)}
                        className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shrink-0 transition"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: ROLE-BASED MODULE & FEATURE ACCESS MATRIX (ALL 5 ROLES)
           =================================================================== */}
        {activeSection === "ROLE_MATRIX" && (
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Role-Based Access Control (RBAC) Architecture
                </span>
                <h2 className="text-lg font-semibold text-white tracking-tight mt-0.5">
                  Module &amp; Feature Access Matrix by Department Role
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Only the Technical Director (TD-01) has master access to all modules and can confirm Go-Live. Other roles are scoped to their station modules.
                </p>
              </div>

              {/* Role Selector Pills */}
              <div className="inline-flex flex-wrap items-center gap-1.5 bg-[#09090b] p-1 rounded-full border border-white/[0.08]">
                {(
                  ["DIRECTOR", "QC", "MODERATOR", "CAMERA", "AUDIO"] as const
                ).map((r) => {
                  const spec = ROLE_ACCESS_MATRIX[r];
                  const active = selectedMatrixRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedMatrixRole(r)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                        active
                          ? "bg-white text-black font-semibold shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{r}</span>
                      <span
                        className={`text-[10px] font-mono ${
                          active ? "text-zinc-700" : "text-zinc-500"
                        }`}
                      >
                        {spec.callsignPrefix}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const spec = ROLE_ACCESS_MATRIX[selectedMatrixRole];
              return (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#09090b] border border-white/[0.06] rounded-2xl p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${spec.badgeColor}`}
                        >
                          {spec.role} · {spec.callsignPrefix}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {spec.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {spec.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px]">
                        <span className="text-zinc-500 block text-[9px] uppercase font-semibold">
                          Allowed Top-Level Pages
                        </span>
                        <span className="text-white font-mono">
                          {spec.allowedRoutes.join(" , ")}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px]">
                        <span className="text-zinc-500 block text-[9px] uppercase font-semibold">
                          Default Landing
                        </span>
                        <span className="text-emerald-300 font-mono">
                          {spec.defaultLandingRoute} ({spec.defaultCrewTab})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {spec.moduleBreakdown.map((item) => {
                      const badgeClass =
                        item.accessLevel === "FULL_CONTROL"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : item.accessLevel === "CUSTODIAN"
                          ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                          : item.accessLevel === "STATION_ONLY"
                          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                          : item.accessLevel === "VIEW_ONLY"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-zinc-800/80 text-zinc-500 border-white/[0.06]";
                      return (
                        <div
                          key={item.module}
                          className="rounded-2xl p-4 bg-[#09090b] border border-white/[0.06] flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${badgeClass}`}
                              >
                                {item.accessLevel.replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-white">
                              {item.module}
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ===================================================================
            TAB 3: ORGANIZATION BRANDING, OBS DOCK & STREAM API KEYS
           =================================================================== */}
        {activeSection === "BRANDING_APIS" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column: Organization Identity & OBS Dock Guide (6 cols) */}
              <div className="xl:col-span-6 space-y-6">
                {/* 1. Organization Identity */}
                <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        Section 01
                      </span>
                      <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                        Organization Identity &amp; Logo Mark
                      </h2>
                    </div>
                    <span className="text-[11px] text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      Global Header
                    </span>
                  </div>

                  {/* Logo Upload Bento */}
                  <div className="bg-[#09090b] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={churchName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-white tracking-tight">
                          {churchName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="text-sm font-semibold text-white">
                        Official Organization Mark
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Upload a square PNG, JPG, SVG, or WebP mark.
                        Automatically compressed and synced across the console
                        and printed logs.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
                        >
                          Upload Image
                        </button>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl(null)}
                            className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-white/[0.08] text-xs font-medium transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        required
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        placeholder="e.g. Grace Online Church"
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Default Bible Translation
                      </label>
                      <select
                        value={defaultTranslation}
                        onChange={(e) => setDefaultTranslation(e.target.value)}
                        aria-label="Default Bible Translation"
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="NIV">
                          NIV · New International Version
                        </option>
                        <option value="ESV">
                          ESV · English Standard Version
                        </option>
                        <option value="NLT">
                          NLT · New Living Translation
                        </option>
                        <option value="KJV">KJV · King James Version</option>
                        <option value="NKJV">
                          NKJV · New King James Version
                        </option>
                        <option value="CSB">
                          CSB · Christian Standard Bible
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Console Subtitle
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Live Stream Broadcast & Ministry Hub"
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* OBS Studio Custom Browser Dock Integration */}
                <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                        Broadcast Switcher Integration
                      </span>
                      <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
                        Embed Console Directly Inside OBS Studio
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      CUSTOM DOCK
                    </span>
                  </div>

                  <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2 leading-relaxed">
                    <li>
                      In OBS Studio, open{" "}
                      <strong className="text-white">
                        Docks → Custom Browser Docks
                      </strong>
                      .
                    </li>
                    <li>
                      Enter Dock Name:{" "}
                      <strong className="text-white">Broadcast Control</strong>.
                    </li>
                    <li>
                      Enter URL:{" "}
                      <code className="bg-[#09090b] border border-white/[0.08] text-zinc-200 px-2 py-0.5 rounded font-mono">
                        http://localhost:3000
                      </code>{" "}
                      (or your production URL).
                    </li>
                    <li>
                      Click <strong className="text-white">Apply</strong> and
                      dock the panel next to your multiview monitor.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Right Column: AI & Stream Credentials (6 cols) */}
              <div className="xl:col-span-6 space-y-6">
                {/* 2. Gemini API */}
                <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
                        Section 02
                      </span>
                      <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                        Google Gemini Intelligence Engine
                      </h2>
                    </div>
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-300 hover:text-white underline underline-offset-4 transition"
                    >
                      Get API Key →
                    </a>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                      Powers sermon outline extraction, scripture formatting,
                      pastoral replies, and executive briefings.
                    </p>
                  </div>
                </div>

                {/* 3. YouTube Live & Studio Analytics API */}
                <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-400">
                        Section 03 · 16:9 Stream &amp; Studio Analytics
                      </span>
                      <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                        YouTube Data API v3 &amp; Google OAuth2 Studio Analytics
                      </h2>
                    </div>
                    <Link
                      href="/reports"
                      className="text-xs text-rose-300 hover:text-white underline underline-offset-4 transition"
                    >
                      Open Analytics →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        YouTube Channel ID or @Handle
                      </label>
                      <input
                        type="text"
                        placeholder="@graceonlinechurch or UC..."
                        value={youtubeChannelId}
                        onChange={(e) => setYoutubeChannelId(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        YouTube Data API v3 Key
                      </label>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Google OAuth 2.0 Client ID (Studio Analytics)
                      </label>
                      <input
                        type="text"
                        placeholder="123456-abc.apps.googleusercontent.com"
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Google OAuth 2.0 Client Secret
                      </label>
                      <input
                        type="password"
                        placeholder="GOCSPX-..."
                        value={googleClientSecret}
                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        YouTube OAuth2 Access Token (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="ya29.a0..."
                        value={youtubeOAuthAccessToken}
                        onChange={(e) =>
                          setYoutubeOAuthAccessToken(e.target.value)
                        }
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Active Live Chat ID
                      </label>
                      <input
                        type="text"
                        placeholder="Cg0KC..."
                        value={youtubeLiveChatId}
                        onChange={(e) => setYoutubeLiveChatId(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Instagram Live */}
                <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pink-400">
                        Section 04 · IG Top/Bottom Blur + 16:9 Landscape Stream
                      </span>
                      <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                        Instagram Live Graph API &amp; MAINSTREAM RTMPS
                      </h2>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Meta Graph API Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAA..."
                        value={instagramToken}
                        onChange={(e) => setInstagramToken(e.target.value)}
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                        Live Video Media ID
                      </label>
                      <input
                        type="text"
                        placeholder="1829..."
                        value={instagramLiveVideoId}
                        onChange={(e) =>
                          setInstagramLiveVideoId(e.target.value)
                        }
                        className="w-full bg-[#09090b] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Save Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 sticky bottom-4 shadow-2xl">
              <div>
                {feedback ? (
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold ${
                      feedback.type === "success"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        feedback.type === "success"
                          ? "bg-emerald-400"
                          : "bg-rose-400"
                      }`}
                    />
                    <span>{feedback.text}</span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">
                    Changes sync immediately across the navigation bar,
                    broadcast console, and post-show reports.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition disabled:opacity-40"
              >
                {saving
                  ? "Saving Configuration..."
                  : "Save Branding & API Configuration"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
