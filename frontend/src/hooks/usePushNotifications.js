import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "../lib/pushConfig";

const PROMPT_DISMISSED_KEY = "kiddaboo_push_dismissed";

export default function usePushNotifications(userId) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check support and current state on mount
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);
    setPromptDismissed(
      localStorage.getItem(PROMPT_DISMISSED_KEY) === "true"
    );

    if (supported) {
      setPermission(Notification.permission);

      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") return false;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Extract keys from subscription
      const subJson = subscription.toJSON();
      const { endpoint } = subJson;
      const p256dh = subJson.keys?.p256dh || "";
      const auth = subJson.keys?.auth || "";

      // Store subscription in Supabase
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (!error) {
        setIsSubscribed(true);
        return true;
      }

      console.error("Failed to store push subscription:", error);
      return false;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [isSupported, userId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    // #34: subscribe() guards on `!userId`; unsubscribe() was missing the
    // same guard, so calling it during a logged-out / mid-sign-out state
    // issued `.eq("user_id", undefined)` → PostgREST receives
    // `user_id=eq.undefined`, which RLS either errors on or silently
    // matches zero rows. The browser subscription was still cancelled
    // regardless, leaving the local and remote state drifted. Guard the
    // DB write on userId; still cancel the browser subscription below so
    // the user's intent (stop receiving pushes) is honored either way.
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Only touch the DB row if we know which user owns it. When
        // userId is missing we still cancel the browser subscription
        // below — the stale DB row will be cleaned up the next time
        // this user signs in and unsubscribes with a valid userId, or
        // when send-push tries to deliver to a cancelled endpoint and
        // prunes it. Either way, no `eq("user_id", undefined)` write.
        if (userId) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", subscription.endpoint);
        }

        // Unsubscribe from browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  }, [isSupported, userId]);

  // Dismiss the prompt
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setPromptDismissed(true);
  }, []);

  // Should we show the prompt?
  const shouldShowPrompt =
    isSupported &&
    !isSubscribed &&
    !promptDismissed &&
    permission !== "denied" &&
    !loading &&
    !!userId;

  return {
    isSupported,
    permission,
    isSubscribed,
    shouldShowPrompt,
    loading,
    subscribe,
    unsubscribe,
    dismissPrompt,
  };
}
