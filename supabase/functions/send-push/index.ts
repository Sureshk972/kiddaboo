// Kiddaboo Push Notification Edge Function
// Triggered by Supabase Database Webhooks on:
//   - memberships INSERT (new join request)
//   - memberships UPDATE (request approved/declined)
//   - messages INSERT (new chat message)
//   - sessions INSERT (new session scheduled)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:sureshk972@gmail.com";

// Create admin Supabase client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record, old_record } = payload;

    let notifications: { userId: string; title: string; body: string; url: string; tag: string }[] = [];

    // ── Handle different event types ──

    if (table === "memberships" && type === "INSERT" && record.role === "pending") {
      // New join request → notify the host
      const { data: pg } = await supabase
        .from("playgroups")
        .select("creator_id, name")
        .eq("id", record.playgroup_id)
        .single();

      const { data: requester } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", record.user_id)
        .single();

      if (pg) {
        notifications.push({
          userId: pg.creator_id as string,
          title: "New join request",
          body: `${requester?.first_name || "Someone"} wants to join ${pg.name}`,
          url: "/host/dashboard",
          tag: `join-request-${record.id}`,
        });
      }
    }

    if (table === "memberships" && type === "UPDATE") {
      const oldRole = old_record?.role;
      const newRole = record.role;

      // Request approved → notify the requester
      if (oldRole === "pending" && newRole === "member") {
        const { data: pg } = await supabase
          .from("playgroups")
          .select("name")
          .eq("id", record.playgroup_id)
          .single();

        notifications.push({
          userId: record.user_id as string,
          title: "Request approved!",
          body: `You've been accepted into ${pg?.name || "the playgroup"}`,
          url: `/playgroup/${record.playgroup_id}`,
          tag: `approved-${record.id}`,
        });
      }

      // Request declined → notify the requester
      if (oldRole === "pending" && newRole === "declined") {
        const { data: pg } = await supabase
          .from("playgroups")
          .select("name")
          .eq("id", record.playgroup_id)
          .single();

        notifications.push({
          userId: record.user_id as string,
          title: "Request update",
          body: `Your request to join ${pg?.name || "the playgroup"} was not accepted`,
          url: "/browse",
          tag: `declined-${record.id}`,
        });
      }
    }

    if (table === "messages" && type === "INSERT") {
      // New message → notify all group members except sender
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("playgroup_id", record.playgroup_id)
        .in("role", ["creator", "member"])
        .neq("user_id", record.sender_id);

      const { data: sender } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", record.sender_id)
        .single();

      const { data: pg } = await supabase
        .from("playgroups")
        .select("name")
        .eq("id", record.playgroup_id)
        .single();

      if (members) {
        const content = (record.content as string) || "";
        const preview = content.length > 50 ? content.slice(0, 50) + "..." : content;

        for (const m of members) {
          notifications.push({
            userId: m.user_id as string,
            title: pg?.name || "New message",
            body: `${sender?.first_name || "Someone"}: ${preview}`,
            url: `/messages/${record.playgroup_id}`,
            tag: `msg-${record.playgroup_id}`,
          });
        }
      }
    }

    if (table === "sessions" && type === "INSERT") {
      // New session → notify all group members except creator
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("playgroup_id", record.playgroup_id)
        .in("role", ["creator", "member"])
        .neq("user_id", record.created_by);

      const { data: pg } = await supabase
        .from("playgroups")
        .select("name")
        .eq("id", record.playgroup_id)
        .single();

      const scheduledDate = new Date(record.scheduled_at as string).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (members) {
        for (const m of members) {
          notifications.push({
            userId: m.user_id as string,
            title: "New session scheduled",
            body: `${pg?.name || "Playgroup"}: ${scheduledDate}`,
            url: `/playgroup/${record.playgroup_id}`,
            tag: `session-${record.id}`,
          });
        }
      }
    }

    if (table === "rsvps" && type === "INSERT") {
      // RSVP → notify the host
      // Look up session → playgroup → host
      const { data: session } = await supabase
        .from("sessions")
        .select("playgroup_id, scheduled_at")
        .eq("id", record.session_id)
        .single();

      if (session) {
        const { data: pg } = await supabase
          .from("playgroups")
          .select("creator_id, name")
          .eq("id", session.playgroup_id)
          .single();

        const { data: rsvpUser } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", record.user_id)
          .single();

        const scheduledDate = new Date(session.scheduled_at).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        if (pg && pg.creator_id !== record.user_id) {
          const statusText = record.status === "going" ? "is going to" : "can't make";
          notifications.push({
            userId: pg.creator_id as string,
            title: "Session RSVP",
            body: `${rsvpUser?.first_name || "Someone"} ${statusText} the ${scheduledDate} session`,
            url: "/host/dashboard",
            tag: `rsvp-${record.id}`,
          });
        }
      }
    }

    // ── Send push notifications ──

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
      // Fetch push subscriptions for this user
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", notif.userId);

      if (!subs || subs.length === 0) continue;

      for (const sub of subs) {
        try {
          const pushPayload = JSON.stringify({
            title: notif.title,
            body: notif.body,
            url: notif.url,
            tag: notif.tag,
            type: table,
          });

          // Use Web Push protocol to send notification
          const result = await sendWebPush(sub, pushPayload);
          if (result) sent++;
          else failed++;
        } catch (err) {
          console.error("Push send error:", err);
          failed++;

          // If subscription is expired/invalid, clean it up
          if (err instanceof Error && err.message.includes("410")) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ notifications: notifications.length, sent, failed }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ── Web Push Sending ──

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<boolean> {
  // Import the encryption primitives
  const { endpoint, p256dh, auth } = sub;

  // For now, use a simple fetch to the push endpoint with VAPID headers
  // Full Web Push encryption requires ECDH + HKDF which is complex in Deno
  // In production, use a library like web-push-libs/web-push

  // Simplified approach: Send via Supabase's built-in notification
  // or use a third-party service like OneSignal/Firebase

  // Direct Web Push with encryption:
  try {
    const jwt = await createVapidJwt(endpoint);
    const encrypted = await encryptPayload(payload, p256dh, auth);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) return true;
    if (response.status === 410) throw new Error("410 Gone");

    console.error(`Push failed: ${response.status} ${await response.text()}`);
    return false;
  } catch (err) {
    throw err;
  }
}

async function createVapidJwt(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const payload = btoa(
    JSON.stringify({ aud: audience, exp: expiry, sub: VAPID_SUBJECT })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const data = `${header}.${payload}`;

  // Import VAPID private key for signing
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(data)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${data}.${sig}`;
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  // Web Push encryption (RFC 8291)
  // This is a simplified implementation

  const clientPublicKey = base64UrlDecode(p256dhKey);
  const clientAuth = base64UrlDecode(authSecret);

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import client's public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate a local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKey = await crypto.subtle.exportKey(
    "raw",
    localKeyPair.publicKey
  );

  // HKDF to derive the content encryption key and nonce
  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    clientAuth,
    concatUint8(
      new TextEncoder().encode("WebPush: info\0"),
      new Uint8Array(clientPublicKey),
      new Uint8Array(localPublicKey)
    ),
    32
  );

  const cek = await hkdf(prk, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(prk, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // Encrypt payload
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);

  const paddedPayload = concatUint8(
    new Uint8Array(new TextEncoder().encode(payload)),
    new Uint8Array([2]) // delimiter
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    key,
    paddedPayload
  );

  // Build the aes128gcm header
  const recordSize = new ArrayBuffer(4);
  new DataView(recordSize).setUint32(0, 4096);

  const localPubKeyBytes = new Uint8Array(localPublicKey);

  return concatUint8(
    salt,
    new Uint8Array(recordSize),
    new Uint8Array([localPubKeyBytes.byteLength]),
    localPubKeyBytes,
    new Uint8Array(encrypted)
  );
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt));

  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = concatUint8(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));

  return okm.slice(0, length);
}
