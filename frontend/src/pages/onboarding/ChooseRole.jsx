import { useNavigate } from "react-router-dom";

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
        style={{ fontFamily: "'ChunkFive', serif", color: "#5C6B52" }}
      >
        Kiddaboo
      </h1>
      <p className="text-taupe text-center mb-10">Which best describes you?</p>

      <div className="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={() => navigate("/verify?role=parent")}
          className="bg-white border-2 border-sage rounded-2xl p-6 text-left cursor-pointer hover:bg-sage-light/30 transition-colors"
        >
          <div className="text-xs text-sage-dark uppercase tracking-widest font-bold mb-2">Parent</div>
          <div className="text-lg font-bold text-charcoal mb-1">I'm a Parent</div>
          <div className="text-sm text-taupe">Looking for a playgroup for my child</div>
        </button>

        <button
          onClick={() => navigate("/verify?role=organizer")}
          className="bg-white border-2 border-terracotta rounded-2xl p-6 text-left cursor-pointer hover:bg-terracotta-light/30 transition-colors"
        >
          <div className="text-xs text-terracotta uppercase tracking-widest font-bold mb-2">Organizer</div>
          <div className="text-lg font-bold text-charcoal mb-1">I'm an Organizer</div>
          <div className="text-sm text-taupe">Starting or running a playgroup</div>
        </button>
      </div>

      <p className="text-xs text-taupe/60 mt-6">You can add the other role later.</p>
    </div>
  );
}
