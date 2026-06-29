import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";

/**
 * Nanny-mode wrapper. Adds a small "NANNY" label at the top of the
 * page and reserves space for the bottom TabBar. TabBar picks the
 * correct nanny tabs automatically via useAccountType().
 *
 * Uses the same sage palette as ParentLayout — design polish (accent
 * colour per role) can be layered on in a later phase.
 */
export default function NannyLayout({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="nanny">
      <div className="hidden md:block bg-sage-dark text-center py-2 text-xs text-white">
        Kiddaboo is designed for mobile — open this on your phone for the best experience.
      </div>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div
          className="px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
          style={{ backgroundColor: '#8B3FE0' }}
        >
          <span className="text-[10px] font-bold tracking-[1.5px] text-white uppercase">
            Nanny
          </span>
        </div>
        <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
          <LegalFooter />
        </div>
        <TabBar />
      </div>
    </div>
  );
}
