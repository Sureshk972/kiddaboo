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
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "'Inter', sans-serif", color: "#8B3FE0" }}
      >
        Kiddaboo
      </h1>
      <p className="text-taupe text-center mb-10">Which best describes you?</p>

      <div className="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={() => navigate("/verify?role=parent")}
          className="bg-sage hover:bg-sage-dark active:scale-[0.98] text-white p-6 text-left cursor-pointer transition-all duration-150 ease-out"
        >
          <div className="text-xs text-white/80 uppercase tracking-widest font-bold mb-2">Parent</div>
          <div className="text-2xl font-bold mb-1">I'm a Parent</div>
          <div className="text-sm text-white/90">Looking for a playgroup for my child</div>
        </button>

        <button
          onClick={() => navigate("/verify?role=organizer")}
          className="bg-sage hover:bg-sage-dark active:scale-[0.98] text-white p-6 text-left cursor-pointer transition-all duration-150 ease-out"
        >
          <div className="text-xs text-white/80 uppercase tracking-widest font-bold mb-2">Organizer</div>
          <div className="text-2xl font-bold mb-1">I'm an Organizer</div>
          <div className="text-sm text-white/90">Starting or running a playgroup</div>
        </button>
      </div>

      <p className="text-sm text-taupe mt-8">
        Already have an account?{" "}
        <Link to="/verify?mode=signin" className="underline underline-offset-4" style={{ color: '#8B3FE0' }}>Sign in</Link>
      </p>
    </div>
  );
}
