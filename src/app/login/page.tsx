"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { resolveRobotAvatarUrl } from "@/lib/robotAvatars";

export default function LoginPage() {
  const { user, logout, openSwitchModal, openCredentialsModal } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-[#121215] border border-white/[0.09] rounded-3xl p-7 shadow-2xl space-y-6">
        <div className="flex items-center gap-4">
          <img
            src={resolveRobotAvatarUrl(
              user.avatarUrl,
              user.role,
              user.callsign
            )}
            alt={`${user.name} AI Robot Avatar`}
            className="w-16 h-16 rounded-2xl object-cover border border-white/[0.15] shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
              Authenticated AI Station Session
            </span>
            <h1 className="text-xl font-semibold text-white tracking-tight truncate">
              {user.name}
            </h1>
            <p className="text-xs text-zinc-400 truncate">
              @{user.username} · {user.callsign} · {user.role}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <Link
            href="/"
            className="block w-full text-center py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
          >
            Open Master Broadcast Console
          </Link>
          <Link
            href="/crew"
            className="block w-full text-center py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] text-xs font-medium transition"
          >
            Open Pre-Flight &amp; Stream QC
          </Link>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openSwitchModal()}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.08] transition"
            >
              Switch Account
            </button>
            <button
              type="button"
              onClick={openCredentialsModal}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium border border-white/[0.08] transition"
            >
              AI Avatar &amp; Login
            </button>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
