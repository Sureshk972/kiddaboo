import TabBar from "../components/layout/TabBar";

/**
 * Parent-mode wrapper. Adds the small uppercase "PARENT" label at the
 * top of the page and reserves space for the bottom TabBar. We rely on
 * TabBar to pick the correct tabs via accountType (Task 7 wires that).
 *
 * Accent color (sage #5C6B52) is already the global default in
 * Kiddaboo, so there's nothing to override here. OrganizerLayout
 * does the accent overriding.
 */
export default function ParentLayout({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="parent">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="px-5 pt-3">
          <span className="text-[10px] font-bold tracking-[1.5px] text-sage-dark uppercase">
            Parent
          </span>
        </div>
        <div className="flex-1">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
