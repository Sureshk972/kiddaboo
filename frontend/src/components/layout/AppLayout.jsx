import TabBar from "./TabBar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 overflow-y-auto pb-16">{children}</div>
      <TabBar />
    </div>
  );
}
