export interface ChurchConfig {
  churchName: string;
  subtitle: string;
  logoUrl: string | null;
  defaultTranslation: string;
  youtubeApiKey?: string;
  youtubeChannelId?: string;
  youtubeLiveChatId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  youtubeOAuthAccessToken?: string;
  youtubeOAuthRefreshToken?: string;
  instagramAccessToken?: string;
  instagramLiveVideoId?: string;
  geminiApiKey?: string;
}

const LOCAL_STORAGE_KEY = "church_live_hub_config_v1";

export const DEFAULT_CHURCH_CONFIG: ChurchConfig = {
  churchName: "Grace Online Church",
  subtitle: "Live Stream Broadcast & Ministry Hub",
  logoUrl: null,
  defaultTranslation: "NIV",
  youtubeApiKey: "",
  youtubeChannelId: "",
  youtubeLiveChatId: "",
  googleClientId: "",
  googleClientSecret: "",
  youtubeOAuthAccessToken: "",
  youtubeOAuthRefreshToken: "",
  instagramAccessToken: "",
  instagramLiveVideoId: "",
  geminiApiKey: "",
};

export function getLocalChurchConfig(): ChurchConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLocalChurchConfig(partial: Partial<ChurchConfig>): ChurchConfig {
  const existing = getLocalChurchConfig() || DEFAULT_CHURCH_CONFIG;
  const merged: ChurchConfig = {
    ...DEFAULT_CHURCH_CONFIG,
    ...existing,
    ...partial,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }
  return merged;
}

/**
 * Loads ChurchConfig from /api/settings (SQLite DB) and merges with local cache.
 */
export async function fetchChurchConfig(): Promise<{
  config: ChurchConfig;
  dbConnected: boolean;
}> {
  const local = getLocalChurchConfig();
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        // Prefer local override if the user saved locally while offline, otherwise sync DB -> local
        const dbCfg = data.config as ChurchConfig;
        const isDbDefault =
          dbCfg.churchName === "Grace Online Church" && !dbCfg.logoUrl;
        const finalConfig: ChurchConfig =
          isDbDefault && local
            ? { ...dbCfg, ...local }
            : { ...DEFAULT_CHURCH_CONFIG, ...(local || {}), ...dbCfg };

        setLocalChurchConfig(finalConfig);
        return {
          config: finalConfig,
          dbConnected: data.dbConnected !== false,
        };
      }
    }
  } catch {
    // Fallback to localStorage if API unreachable
  }

  return {
    config: local || DEFAULT_CHURCH_CONFIG,
    dbConnected: true,
  };
}

/**
 * Saves ChurchConfig to both localStorage (instant) and /api/settings (SQLite DB).
 */
export async function saveChurchConfig(
  updates: Partial<ChurchConfig>
): Promise<{ config: ChurchConfig; dbConnected: boolean }> {
  const updatedLocal = setLocalChurchConfig(updates);

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedLocal),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        const synced = setLocalChurchConfig({
          ...updatedLocal,
          ...data.config,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("church-config-updated"));
        }
        return { config: synced, dbConnected: true };
      }
    }
  } catch {
    // Still keep local persistence
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("church-config-updated"));
  }
  return { config: updatedLocal, dbConnected: true };
}

/**
 * Resizes and compresses any uploaded logo image to max 256x256 PNG data URL
 * so even 10MB image uploads save instantaneously without hitting payload limits.
 */
export function processLogoImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        return reject(new Error("Invalid image data"));
      }
      // If SVG, return directly
      if (file.type === "image/svg+xml") {
        return resolve(result);
      }

      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const maxDim = 256;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(result);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
