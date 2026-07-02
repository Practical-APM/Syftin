import { RevenueClient } from "./RevenueClient";

export const metadata = {
  title: "Platform Revenue | Syftin Admin",
};

export default function AdminRevenuePage() {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-50 overflow-hidden selection:bg-indigo-500/30">
      <main className="flex-1 overflow-y-auto">
        <RevenueClient />
      </main>
    </div>
  );
}
