import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { friendlyAuthError } from "../lib/authErrors";

export default function PhoneVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn } = useAuth();

  const [mode, setMode] = useState(searchParams.get("mode") === "signin" ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Field-scoped errors — previously a single `error` was attached
  // only to Password, so a forgot-password "enter your email above"
  // message rendered under the wrong input.
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Stash the role chosen on /choose-role so it survives the email-
  // confirmation round-trip and is available to CreateProfile after
  // signup. Only accept the two valid values — never trust whatever
  // else someone puts in the query string. Don't overwrite an
  // existing stash if the param is absent (preserves the value if
  // the user navigates back and forth).
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "parent" || role === "organizer") {
      sessionStorage.setItem("kiddaboo.pendingAccountType", role);
      // Mark the onboarding flow as active so OnboardingOnly lets the
      // user finish the multi-step signup even after setProfile() has
      // populated first_name. Cleared at the terminal success page.
      sessionStorage.setItem("kiddaboo.onboardingActive", "1");
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    setEmailError("");
    setPasswordError("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error: err } = await signUp(email, password);
      setLoading(false);

      if (err) {
        // #55: parent-voice error instead of raw Supabase string
        const friendly = friendlyAuthError(err.message);
        setPasswordError(friendly.message);
        if (friendly.action === "switch_to_signin") {
          setMode("signin");
        }
        return;
      }

      // If email confirmation is required
      if (data?.user && !data?.session) {
        setCheckEmail(true);
        return;
      }

      // If auto-confirmed (e.g. in dev)
      navigate("/profile");
    } else {
      const { data, error: err } = await signIn(email, password);
      setLoading(false);

      if (err) {
        // #55: parent-voice error instead of raw Supabase string
        setPasswordError(friendlyAuthError(err.message).message);
        return;
      }

      // Check if profile is complete and host status, redirect
      // accordingly. Route by account_type — not just by membership
      // count — so an organizer who hasn't created their first group
      // yet still lands on /host/dashboard (which has the empty-state
      // "Create your first playgroup" CTA), not on /browse.
      if (data?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, account_type")
          .eq("id", data.user.id)
          .single();

        // Returning-user sign-in is a terminal state for the onboarding
        // flag: if it was set by a stray /verify?role=X visit before the
        // user toggled to Sign In, don't let it leak into OnboardingOnly
        // and let them destroy their saved profile later.
        if (prof?.first_name) {
          sessionStorage.removeItem("kiddaboo.onboardingActive");
        }

        if (!prof?.first_name) {
          navigate("/profile");
        } else if (prof?.account_type === "organizer") {
          navigate("/host/dashboard");
        } else {
          navigate("/browse");
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) {
      setEmailError("Enter your email above, then tap Forgot password.");
      return;
    }
    setEmailError("");
    setPasswordError("");
    setResetLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResetLoading(false);

    if (err) {
      // #55: parent-voice error — surface under the email field since
      // the reset flow is keyed off the email address.
      setEmailError(friendlyAuthError(err.message).message);
      return;
    }

    setResetSent(true);
  };

  const isValid = email.includes("@") && password.length >= 6;

  // Password reset sent confirmation
  if (resetSent) {
    return (
      <OnboardingLayout currentStep={1} showBack onBack={() => setResetSent(false)}>
        <div className="flex flex-col gap-6 pt-8 items-center text-center">
          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22 6L12 13L2 6" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
              Check your email
            </h1>
            <p className="text-taupe leading-relaxed">
              We sent a password reset link to{" "}
              <span className="text-charcoal font-medium">{email}</span>.
              Click the link to set a new password.
            </p>
          </div>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              setResetSent(false);
              setMode("signin");
            }}
          >
            Back to Sign in
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  if (checkEmail) {
    return (
      <OnboardingLayout currentStep={1} showBack onBack={() => setCheckEmail(false)}>
        <div className="flex flex-col gap-6 pt-8 items-center text-center">
          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22 6L12 13L2 6" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
              Check your email
            </h1>
            <p className="text-taupe leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-charcoal font-medium">{email}</span>.
              Click the link to verify your account.
            </p>
          </div>
          <p className="text-sm text-taupe">
            After confirming, come back and sign in.
          </p>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
            }}
          >
            I've confirmed — Sign in
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
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-taupe leading-relaxed">
            {mode === "signup"
              ? "Sign up to find or host curated playgroups."
              : "Sign in to continue."}
          </p>
        </div>

        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@email.com"
          type="email"
          error={emailError}
          autoComplete="email"
          inputMode="email"
        />

        <div>
          <Input
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            type="password"
            error={passwordError}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signin" && (
            <button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-xs text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none mt-2"
            >
              {resetLoading ? "Sending..." : "Forgot password?"}
            </button>
          )}
        </div>

        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </Button>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setEmailError("");
            setPasswordError("");
          }}
          className="text-sm text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </OnboardingLayout>
  );
}
