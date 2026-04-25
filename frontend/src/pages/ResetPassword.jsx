import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Track which field the error belongs to so we don't render the
  // "password too short" message under the Confirm input.
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setPasswordError("");
    setConfirmError("");

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setConfirmError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (err) {
      setPasswordError(err.message);
      return;
    }

    setSuccess(true);
  };

  // Send the user back to the right home for their role. /browse is
  // the parent home; organizers belong on /host/dashboard.
  const homePath =
    profile?.account_type === "organizer" ? "/host/dashboard" : "/browse";

  if (success) {
    return (
      <OnboardingLayout currentStep={1}>
        <div className="flex flex-col gap-6 pt-8 items-center text-center">
          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="#5C6B52"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
              Password updated!
            </h1>
            <p className="text-taupe leading-relaxed">
              Your password has been changed successfully.
            </p>
          </div>
          <Button fullWidth onClick={() => navigate(homePath)}>
            Continue to Kiddaboo
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={1}>
      <div className="flex flex-col gap-6 pt-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Set new password
          </h1>
          <p className="text-taupe leading-relaxed">
            Choose a new password for your account.
          </p>
        </div>

        <Input
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          type="password"
          error={passwordError}
        />

        <Input
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter your password"
          type="password"
          error={confirmError}
        />

        <Button
          fullWidth
          onClick={handleReset}
          disabled={!password || !confirm || loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </OnboardingLayout>
  );
}
