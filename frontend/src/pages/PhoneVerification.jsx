import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import OtpInput from "../components/ui/OtpInput";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";

export default function PhoneVerification() {
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [otp, setOtp] = useState("");
  const [resent, setResent] = useState(false);

  const handleSendCode = () => {
    if (data.phone.length >= 10) {
      setStep("otp");
    }
  };

  const handleVerify = () => {
    if (otp.length === 6) {
      navigate("/profile");
    }
  };

  const handleResend = () => {
    setResent(true);
    setTimeout(() => setResent(false), 2000);
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  return (
    <OnboardingLayout currentStep={1} showBack={step === "otp"} onBack={step === "otp" ? () => setStep("phone") : undefined}>
      {step === "phone" ? (
        <div className="flex flex-col gap-6 pt-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
              What's your number?
            </h1>
            <p className="text-taupe leading-relaxed">
              We'll text you a code to verify your identity. Your number stays private.
            </p>
          </div>

          <Input
            label="Phone number"
            value={data.phone}
            onChange={(val) => updateField("phone", formatPhone(val))}
            placeholder="(555) 123-4567"
            type="tel"
          />

          <Button
            fullWidth
            onClick={handleSendCode}
            disabled={data.phone.replace(/\D/g, "").length < 10}
          >
            Send Code
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
              Enter the code
            </h1>
            <p className="text-taupe leading-relaxed">
              Sent to <span className="text-charcoal font-medium">{data.phone}</span>
            </p>
          </div>

          <OtpInput value={otp} onChange={setOtp} />

          <Button
            fullWidth
            onClick={handleVerify}
            disabled={otp.length < 6}
          >
            Verify
          </Button>

          <button
            onClick={handleResend}
            className="text-sm text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none"
          >
            {resent ? "Code resent!" : "Didn't get a code? Resend"}
          </button>
        </div>
      )}
    </OnboardingLayout>
  );
}
