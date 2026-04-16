import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { usePhoneVerification } from "../../hooks/usePhoneVerification";

/**
 * OTP step. Two stages:
 *   1. Ask for E.164 phone → "Send code"
 *   2. Show 6-digit input → "Verify"
 * On verify success, navigate to the next onboarding step (/children
 * for Parents, /host/create for Organizers). The caller route decides
 * where `next` points; we read it from history state.
 */
export default function PhoneVerify() {
  const navigate = useNavigate();
  const { status, error, sendCode, verifyCode } = usePhoneVerification();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  // The send-otp edge function regex rejects anything except `+` and
  // digits. Users will naturally type spaces/dashes/parens (and our
  // placeholder even shows a formatted example) — strip them client-
  // side so the user doesn't have to think about E.164 formatting.
  //
  // Also handle country code: Kiddaboo is US-focused, so bare 10-digit
  // numbers get +1 prepended; 11-digit numbers starting with 1 get +
  // added. Users who want a non-US number can explicitly type the +
  // prefix and we leave it alone.
  function normalizePhone(raw) {
    const trimmed = (raw || "").trim();
    if (trimmed.startsWith("+")) {
      return `+${trimmed.replace(/\D/g, "")}`;
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  async function onSend(e) {
    e.preventDefault();
    await sendCode(normalizePhone(phone));
  }

  async function onVerify(e) {
    e.preventDefault();
    const { error: err } = await verifyCode(normalizePhone(phone), code);
    if (!err) {
      const role = sessionStorage.getItem("kiddaboo.pendingAccountType");
      navigate(role === "organizer" ? "/host/create" : "/children");
    }
  }

  const showCodeStep = status === "code_sent" || status === "verifying" || status === "error";

  return (
    <div className="min-h-screen bg-cream px-6 py-10 flex flex-col">
      <div className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Verify your phone</h1>
        <p className="text-sm text-taupe mb-8">
          We send a 6-digit code to make sure you're a real person. We won't share your number.
        </p>

        {!showCodeStep && (
          <form onSubmit={onSend} className="flex flex-col gap-4">
            <label className="text-sm text-charcoal" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="border border-cream-dark rounded-xl px-4 py-3"
              required
            />
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}

        {showCodeStep && (
          <form onSubmit={onVerify} className="flex flex-col gap-4">
            <label className="text-sm text-charcoal" htmlFor="code">Enter the 6-digit code</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="border border-cream-dark rounded-xl px-4 py-3 text-center text-2xl tracking-widest"
              required
            />
            {error && <p className="text-xs text-terracotta">{error === "code_mismatch" ? "Code doesn't match. Try again." : "Something went wrong. Try again."}</p>}
            <Button type="submit" disabled={status === "verifying"}>
              {status === "verifying" ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => sendCode(normalizePhone(phone))}
              className="text-xs text-sage underline"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
