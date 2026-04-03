import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function PhoneVerification() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();

  const [mode, setMode] = useState("signup"); // "signup" | "signin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error: err } = await signUp(email, password);
      setLoading(false);

      if (err) {
        setError(err.message);
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
        setError(err.message);
        return;
      }

      // Check if profile is complete, redirect accordingly
      if (data?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", data.user.id)
          .single();

        if (!prof?.first_name) {
          navigate("/profile");
        } else {
          navigate("/browse");
        }
      }
    }
  };

  const isValid = email.includes("@") && password.length >= 6;

  if (checkEmail) {
    return (
      <OnboardingLayout currentStep={1} showBack onBack={() => setCheckEmail(false)}>
        <div className="flex flex-col gap-6 pt-8 items-center text-center">
          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M22 6L12 13L2 6" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
        />

        <Input
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          type="password"
          error={error}
        />

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
            setError("");
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
