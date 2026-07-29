import { Link, useNavigate } from "react-router-dom";

/**
 * First screen a new user sees. Picks their account_type before any
 * signup happens. Per design D2, the choice is side-by-side with
 * role-noun framing. The role is passed to /verify via query param;
 * that page (Task 9) persists it after auth succeeds and before the
 * profile row is updated with the real account_type.
 */
export default function ChooseRole() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-10">
      <h1
        className="text-3xl font-bold tracking-tight mb-2 font-display"
        style={{ color: "#C2673C" }}
      >
        Kiddaboo
      </h1>
      <p className="text-taupe text-center mb-10">Which best describes you?</p>

      <div className="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={() => navigate("/verify?role=parent")}
          className="bg-charcoal hover:bg-sage active:scale-[0.98] text-cream p-6 text-left cursor-pointer transition-all duration-150 ease-out"
        >
          <div className="text-xs text-cream/70 uppercase tracking-widest font-bold mb-2">Parent</div>
          <div className="text-2xl font-bold mb-1">I'm a Parent</div>
          <div className="text-sm text-cream/80">Find and book a trusted Nanny</div>
        </button>

        <button
          onClick={() => navigate("/verify?role=nanny")}
          className="bg-charcoal hover:bg-sage active:scale-[0.98] text-cream p-6 text-left cursor-pointer transition-all duration-150 ease-out"
        >
          <div className="text-xs text-cream/70 uppercase tracking-widest font-bold mb-2">Nanny</div>
          <div className="text-2xl font-bold mb-1">I'm a Nanny</div>
          <div className="text-sm text-cream/80">Offer your availability, accept bookings</div>
        </button>
      </div>

      <p className="text-sm text-taupe mt-8">
        Already have an account?{" "}
        <Link to="/verify?mode=signin" className="underline underline-offset-4 text-sage hover:text-sage-dark transition-colors">Sign in</Link>
      </p>
    </div>
  );
}
