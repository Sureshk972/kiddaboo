import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import usePushNotifications from "../hooks/usePushNotifications";

const NOTIFICATION_TYPES = [
  {
    key: "messages",
    label: "New Messages",
    description: "When someone sends a message in your playgroup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "join_requests",
    label: "Join Requests",
    description: "When a family requests to join your playgroup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "membership_updates",
    label: "Membership Updates",
    description: "When your join request is approved or declined",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "sessions",
    label: "New Sessions",
    description: "When a new session is scheduled in your playgroup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "rsvps",
    label: "Session RSVPs",
    description: "When families RSVP to your sessions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v6h6M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const DEFAULT_PREFS = {
  messages: true,
  join_requests: true,
  membership_updates: true,
  sessions: true,
  rsvps: true,
};

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    loading: pushLoading,
  } = usePushNotifications(user?.id);

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Load notification preferences from profile
  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_prefs")
        .eq("id", user.id)
        .single();
      if (data?.notification_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs });
      }
    };
    loadPrefs();
  }, [user]);

  // Save preference toggle
  const togglePref = async (key) => {
    if (!user) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ notification_prefs: updated })
      .eq("id", user.id);
    setSaving(false);
  };

  // Handle enable/disable push
  const handleTogglePush = async () => {
    setSubscribing(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setSubscribing(false);
  };

  const pushBlocked = permission === "denied";

  return (
    <div className="bg-cream min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 bg-transparent border-none cursor-pointer text-taupe hover:text-charcoal transition-colors"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Notifications
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Push notification master toggle */}
        <div className="bg-white rounded-2xl border border-cream-dark p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-heading font-bold text-charcoal">
                  Push Notifications
                </h3>
                {/* Toggle switch */}
                {isSupported && !pushBlocked && (
                  <button
                    onClick={handleTogglePush}
                    disabled={pushLoading || subscribing}
                    className={`relative w-11 h-6 rounded-full transition-colors border-none cursor-pointer flex-shrink-0 ${
                      isSubscribed ? "bg-sage" : "bg-cream-dark"
                    } ${(pushLoading || subscribing) ? "opacity-50" : ""}`}
                    aria-label={isSubscribed ? "Disable push notifications" : "Enable push notifications"}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        isSubscribed ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                )}
              </div>

              <p className="text-xs text-taupe mt-1 leading-relaxed">
                {!isSupported
                  ? "Push notifications are not supported on this browser."
                  : pushBlocked
                  ? "Notifications are blocked. Please enable them in your browser settings."
                  : isSubscribed
                  ? "You'll receive push notifications on this device."
                  : "Enable to get notified about messages, join requests, and sessions."}
              </p>

              {pushBlocked && (
                <div className="mt-2 bg-terracotta-light/30 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-taupe-dark leading-relaxed">
                    To unblock: tap the lock icon in your browser's address bar, find "Notifications", and change it to "Allow".
                  </p>
                </div>
              )}

              {subscribing && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 border border-sage border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-taupe">
                    {isSubscribed ? "Disabling..." : "Enabling..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per-type preferences */}
        <div>
          <h3 className="text-sm font-heading font-bold text-charcoal mb-3 px-1">
            Notification Types
          </h3>
          <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
            {NOTIFICATION_TYPES.map((type, i) => (
              <div
                key={type.key}
                className={`flex items-center gap-3 px-4 py-4 ${
                  i < NOTIFICATION_TYPES.length - 1 ? "border-b border-cream-dark" : ""
                }`}
              >
                <div className="w-9 h-9 bg-cream rounded-lg flex items-center justify-center flex-shrink-0 text-taupe">
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal font-medium">{type.label}</p>
                  <p className="text-[11px] text-taupe mt-0.5 leading-relaxed">
                    {type.description}
                  </p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => togglePref(type.key)}
                  disabled={!isSubscribed}
                  className={`relative w-10 h-[22px] rounded-full transition-colors border-none cursor-pointer flex-shrink-0 ${
                    prefs[type.key] && isSubscribed ? "bg-sage" : "bg-cream-dark"
                  } ${!isSubscribed ? "opacity-30 cursor-default" : ""}`}
                  aria-label={`Toggle ${type.label}`}
                >
                  <div
                    className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform ${
                      prefs[type.key] && isSubscribed ? "translate-x-[20px]" : "translate-x-[2px]"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {!isSubscribed && (
            <p className="text-[11px] text-taupe/60 mt-2 px-1">
              Enable push notifications above to customize which alerts you receive.
            </p>
          )}
        </div>

        {/* Saving indicator */}
        {saving && (
          <p className="text-xs text-taupe text-center">Saving preferences...</p>
        )}
      </div>
    </div>
  );
}
