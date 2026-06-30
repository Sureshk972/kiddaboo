import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { initTracking, pushEvent, getSessionId } from "../lib/tracking";

const TrackingCtx = createContext(null);

export function useTracking() {
  return useContext(TrackingCtx);
}

export function TrackingProvider({ children }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const prevPath = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const teardown = initTracking();
    return teardown;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (profile?.analytics_opt_out) return;
    pushEvent({
      event_type: "pageview",
      event_name: location.pathname,
      path: location.pathname,
      referrer: prevPath.current,
      user_id: user.id,
      user_role: profile?.account_type ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      properties: {},
    });
    prevPath.current = location.pathname;
  }, [location.pathname, user?.id, profile?.analytics_opt_out, profile?.account_type]);

  useEffect(() => {
    if (!user?.id) return;
    if (profile?.analytics_opt_out) return;
    const onClick = (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;
      pushEvent({
        event_type: "click",
        event_name: el.dataset.track,
        path: location.pathname,
        user_id: user.id,
        user_role: profile?.account_type ?? null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        properties: {},
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [user?.id, profile?.analytics_opt_out, profile?.account_type, location.pathname]);

  const value = {
    track(name, properties = {}) {
      if (!user?.id) return;
      if (profile?.analytics_opt_out) return;
      pushEvent({
        event_type: "custom",
        event_name: name,
        path: location.pathname,
        user_id: user.id,
        user_role: profile?.account_type ?? null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        properties,
      });
    },
  };

  return <TrackingCtx.Provider value={value}>{children}</TrackingCtx.Provider>;
}
