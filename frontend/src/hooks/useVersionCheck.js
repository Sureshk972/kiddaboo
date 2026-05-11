/* global __BUILD_ID__ */
import { useEffect, useState } from "react";

const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

async function fetchLatestBuildId() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.buildId || null;
  } catch {
    return null;
  }
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (updateAvailable) return;

    let cancelled = false;
    const check = async () => {
      const latest = await fetchLatestBuildId();
      if (cancelled || !latest) return;
      if (latest !== CURRENT_BUILD_ID) setUpdateAvailable(true);
    };

    check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [updateAvailable]);

  return updateAvailable;
}
