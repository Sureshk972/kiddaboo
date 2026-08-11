import TopBar from "../components/layout/TopBar";
import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";

export default function NannyLayout({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="nanny">
      <div className="hidden md:block bg-sage-dark text-center py-2 text-xs text-white">
        Kiddaboo is designed for mobile — open this on your phone for the best experience.
      </div>
      <TopBar />
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
