import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Drives the OTP UI. Status machine:
 *   idle → sending → code_sent → verifying → verified
 *                                        ↘ error
 */
export function usePhoneVerification() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function sendCode(phone) {
    setStatus("sending");
    setError(null);
    const { error } = await supabase.functions.invoke("send-otp", { body: { phone } });
    if (error) {
      setStatus("error");
      setError(error.message || "send_failed");
      return { error };
    }
    setStatus("code_sent");
    return { error: null };
  }

  async function verifyCode(phone, code) {
    setStatus("verifying");
    setError(null);
    const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, code } });
    if (error || !data?.ok) {
      setStatus("error");
      setError(error?.message || "verify_failed");
      return { error: error ?? new Error("verify_failed") };
    }
    setStatus("verified");
    return { data, error: null };
  }

  function reset() {
    setStatus("idle");
    setError(null);
  }

  return { status, error, sendCode, verifyCode, reset };
}
