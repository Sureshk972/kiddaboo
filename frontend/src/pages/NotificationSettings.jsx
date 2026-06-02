import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import usePushNotifications from "../hooks/usePushNotifications";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAccountType } from "../hooks/useAccountType";

// Notification types for parents
const PARENT_NOTIFICATION_TYPES = [
  {
    key: "booking_accepted",
    label: "Booking Accepted",
    description: "When a Nanny accepts your booking request",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "booking_cancelled_by_nanny",
    label: "Nanny Cancelled",
    description: "When a Nanny cancels your confirmed booking",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "rate_nanny",
    label: "Rate Your Nanny",
    description: "A reminder to rate your Nanny after the session",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Notification types for nannies
const NANNY_NOTIFICATION_TYPES = [
  {
    key: "new_booking_request",
    label: "New Booking Request",
    description: "When a parent requests to book one of your available slots",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "booking_cancelled_by_parent",
    label: "Parent Cancelled",
    description: "When a parent cancels a confirmed booking",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "rate_parent",
    label: "Rate the Parent",
    description: "A reminder to rate the parent after the session",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "payout_sent",
    label: "Payout Sent",
    description: "When a payout has been sent to your Stripe account",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 10h22" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

const DEFAULT_PARENT_PREFS = {
  booking_accepted: true,
  booking_cancelled_by_nanny: true,
  rate_nanny: true,
};

const DEFAULT_NANNY_PREFS = {
  new_booking_request: true,
  booking_cancelled_by_parent: true,
  rate_parent: true,
  payout_sent: true,
};

export default function NotificationSettings() {
  useDocumentTitle("Notifications"); // #50
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isNanny } = useAccountType();
  const notificationTypes = isNanny ? NANNY_NOTIFICATION_TYPES : PARENT_NOTIFICATION_TYPES;
  const defaultPrefs = isNanny ? DEFAULT_NANNY_PREFS : DEFAULT_PARENT_PREFS;
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    loading: pushLoading,
  } = usePushNotifications(user?.id);

  const [prefs, setPrefs] = useState(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [saveError, setSaveError] = useState("");

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
        setPrefs({ ...defaultPrefs, ...data.notification_prefs });
      }
    };
    loadPrefs();
  }, [user]);

  // Save preference toggle. Optimistic update with rollback on write
  // failure (#33): previously we fired the update and never checked
  // the error, so a dropped network request would leave the UI in a
  // state that silently disagreed with the DB until the next reload.
  const togglePref = async (key) => {
    if (!user || saving) return;
    const previous = prefs;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: updated })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setPrefs(previous);
      setSaveError("Couldn't save that change — please try again.");
    }
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
      <div data-safe-top className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
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
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
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

              {/* #60: parent-voice notification status copy — the old text
                  used "browser" jargon and gave Chrome-only unblock instructions
                  that were wrong on iOS Safari. */}
              <p className="text-xs text-taupe mt-1 leading-relaxed">
                {!isSupported
                  ? "Notifications aren't available here yet. Try opening Kiddaboo in Chrome or Safari for the best experience."
                  : pushBlocked
                  ? "Notifications are turned off for Kiddaboo on this device."
                  : isSubscribed
                  ? "You'll receive push notifications on this device."
                  : "Enable to get notified about booking requests, acceptances, and more."}
              </p>

              {pushBlocked && (
                <div className="mt-2 bg-terracotta-light/30 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-taupe-dark leading-relaxed">
                    {/iPad|iPhone|iPod/.test(navigator.userAgent)
                      ? "To turn them on: open your iPhone Settings → scroll to Safari → Notifications → find Kiddaboo and switch it on."
                      : /Android/.test(navigator.userAgent)
                      ? "To turn them on: tap the lock icon next to the web address, then switch Notifications to Allow."
                      : "To turn them on: click the icon to the left of the web address at the top of this window, then switch Notifications to Allow."}
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
            {notificationTypes.map((type, i) => {
              const interactable = isSubscribed;
              return (
                <div
                  key={type.key}
                  className={`flex items-center gap-3 px-4 py-4 ${
                    i < notificationTypes.length - 1 ? "border-b border-cream-dark" : ""
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
                    onClick={() => interactable && togglePref(type.key)}
                    disabled={!interactable}
                    className={`relative w-10 h-[22px] rounded-full transition-colors border-none cursor-pointer flex-shrink-0 ${
                      prefs[type.key] && interactable ? "bg-sage" : "bg-cream-dark"
                    } ${!interactable ? "opacity-30 cursor-default" : ""}`}
                    aria-label={`Toggle ${type.label}`}
                  >
                    <div
                      className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform ${
                        prefs[type.key] && interactable ? "translate-x-[20px]" : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
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
        {saveError && (
          <p className="text-xs text-red-500 text-center">{saveError}</p>
        )}
      </div>
    </div>
  );
}
