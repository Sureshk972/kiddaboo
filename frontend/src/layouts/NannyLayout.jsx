import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";
import { useAuth } from "../context/AuthContext";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function NannyLayout({ children }) {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="nanny">
      <div className="hidden md:block bg-sage-dark text-center py-2 text-xs text-white">
        Kiddaboo is designed for mobile — open this on your phone for the best experience.
      </div>
      <div className="w-full bg-cream">
        <div className="max-w-md mx-auto px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-2">
          <span className="text-lg text-charcoal tracking-tight font-display font-semibold">
            Kiddaboo
          </span>
          <span className="text-taupe text-[10px]">·</span>
          <span className="text-[10px] font-bold tracking-[1.5px] text-taupe uppercase">
            Provider
          </span>
          {profile?.first_name && (
            <span className="ml-auto text-sm text-taupe tracking-tight">
              {greeting()}, {profile.first_name}
            </span>
          )}
        </div>
      </div>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
          <LegalFooter />
        </div>
        <TabBar />
      </div>
    </div>
  );
}
