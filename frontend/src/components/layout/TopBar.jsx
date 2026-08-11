import { useAuth } from "../../context/AuthContext";
import { useAccountType } from "../../hooks/useAccountType";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TopBar() {
  const { profile } = useAuth();
  const { isNanny } = useAccountType();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-cream-dark">
      <div className="max-w-md mx-auto flex items-center justify-between px-5 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        {/* Greeting — left */}
        <div className="text-sm text-charcoal">
          {profile?.first_name
            ? <>{greeting()}, <span className="font-bold">{profile.first_name}</span></>
            : <>{greeting()}</>
          }
        </div>

        {/* Brand — right */}
        <div className="flex items-center gap-1.5">
          <img src="/Kiddaboo_logo.svg" alt="Kiddaboo" className="h-5" />
          <span className="text-[9px] font-bold tracking-[1.5px] text-sage uppercase">
            {isNanny ? "Provider" : "Parent"}
          </span>
        </div>
      </div>
    </header>
  );
}
