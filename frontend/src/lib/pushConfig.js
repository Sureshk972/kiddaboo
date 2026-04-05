// VAPID public key for Web Push notifications
// The private key is stored as a Supabase Edge Function secret
export const VAPID_PUBLIC_KEY =
  "BPiWAgQiBZcTv7oP4Assprfxmco0QBt6-TnXtos8cBgoZNTBZmqnPP15TbKiMSLjXBeplTVHhniqE82y2WPCq7U";

// Convert VAPID key from base64 to Uint8Array (required by Push API)
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
