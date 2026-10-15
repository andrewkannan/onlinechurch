import { NextRequest, NextResponse } from "next/server";
import { writeFallbackStore } from "@/lib/db";
import { getCrewQcState, CrewUserAccount } from "@/app/api/crew-qc/route";

const SESSION_COOKIE_NAME = "church_auth_session";

function sanitizeUser(u: CrewUserAccount) {
  const { password: _password, ...safe } = u;
  return safe;
}

export async function GET(req: NextRequest) {
  try {
    const state = getCrewQcState();
    const cookieVal = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const headerUserId = req.headers.get("x-auth-user-id");

    let matchedUser: CrewUserAccount | undefined;

    if (cookieVal) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cookieVal, "base64").toString("utf-8")
        );
        if (decoded && decoded.id) {
          matchedUser = state.users.find(
            (u) => u.id === decoded.id || u.username === decoded.username
          );
        }
      } catch {
        // invalid cookie payload
      }
    }

    if (!matchedUser && headerUserId) {
      matchedUser = state.users.find((u) => u.id === headerUserId);
    }

    const rosterPreview = state.users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      callsign: u.callsign,
      role: u.role,
      permission: u.permission,
      stationAssignment: u.stationAssignment,
    }));

    if (!matchedUser) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        rosterPreview,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: sanitizeUser(matchedUser),
      rosterPreview,
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, user: null, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const state = getCrewQcState();

    // 1. Authenticate with Username & Password
    if (body.action === "LOGIN") {
      const rawIdentifier = String(body.username || "").trim().toLowerCase();
      const rawPassword = String(body.password || "");

      if (!rawIdentifier || !rawPassword) {
        return NextResponse.json(
          { error: "Username and password are required." },
          { status: 400 }
        );
      }

      const targetUser = state.users.find(
        (u) =>
          u.username.toLowerCase() === rawIdentifier ||
          u.email.toLowerCase() === rawIdentifier ||
          u.callsign.toLowerCase() === rawIdentifier ||
          u.name.toLowerCase() === rawIdentifier
      );

      if (!targetUser || targetUser.password !== rawPassword) {
        return NextResponse.json(
          {
            error:
              "Invalid username or password. Please check your credentials and try again.",
          },
          { status: 401 }
        );
      }

      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const deviceLabel = String(body.device || targetUser.device || "Console");

      // Mark user ON_DUTY and update activeCrew
      state.users = state.users.map((u) =>
        u.id === targetUser.id
          ? {
              ...u,
              status: "ON_DUTY",
              device: deviceLabel,
              lastActiveAt: "Active now",
            }
          : u
      );

      const existingIdx = state.activeCrew.findIndex(
        (c) =>
          c.name.toLowerCase() === targetUser.name.toLowerCase() &&
          c.role === targetUser.role
      );
      if (existingIdx >= 0) {
        state.activeCrew[existingIdx].lastActiveAt = "Active now";
        state.activeCrew[existingIdx].device = deviceLabel;
      } else {
        state.activeCrew.unshift({
          id: `crew-${Date.now()}`,
          name: targetUser.name,
          role: targetUser.role,
          device: deviceLabel,
          loggedInAt: nowTime,
          lastActiveAt: "Active now",
        });
      }

      writeFallbackStore("crewQc", state);

      const updatedUser =
        state.users.find((u) => u.id === targetUser.id) || targetUser;
      const safeUser = sanitizeUser(updatedUser);

      const sessionToken = Buffer.from(
        JSON.stringify({
          id: safeUser.id,
          username: safeUser.username,
          role: safeUser.role,
          iat: Date.now(),
        }),
        "utf-8"
      ).toString("base64");

      const res = NextResponse.json({
        authenticated: true,
        user: safeUser,
      });

      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return res;
    }

    // 2. Logout
    if (body.action === "LOGOUT") {
      const res = NextResponse.json({
        authenticated: false,
        user: null,
      });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // 3. Change / Update Username & Password
    if (body.action === "UPDATE_CREDENTIALS" && body.userId) {
      const targetUser = state.users.find((u) => u.id === body.userId);
      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      // If not admin override, verify current password
      if (!body.adminOverride && body.currentPassword !== undefined) {
        if (targetUser.password !== String(body.currentPassword)) {
          return NextResponse.json(
            { error: "Current password does not match." },
            { status: 401 }
          );
        }
      }

      const nextUsername = body.newUsername
        ? String(body.newUsername)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
        : targetUser.username;

      if (!nextUsername) {
        return NextResponse.json(
          { error: "Username cannot be empty." },
          { status: 400 }
        );
      }

      const duplicate = state.users.find(
        (u) =>
          u.id !== targetUser.id &&
          u.username.toLowerCase() === nextUsername.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json(
          { error: `Username "@${nextUsername}" is already taken.` },
          { status: 400 }
        );
      }

      const nextPassword =
        body.newPassword && String(body.newPassword).trim()
          ? String(body.newPassword).trim()
          : targetUser.password;

      state.users = state.users.map((u) =>
        u.id === targetUser.id
          ? {
              ...u,
              username: nextUsername,
              password: nextPassword,
            }
          : u
      );

      writeFallbackStore("crewQc", state);

      const updated = state.users.find((u) => u.id === targetUser.id)!;
      return NextResponse.json({
        success: true,
        user: sanitizeUser(updated),
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
