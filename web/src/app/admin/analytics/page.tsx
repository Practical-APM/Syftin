import type { Metadata } from "next";
import { AnalyticsClient } from "./client";

export const metadata: Metadata = {
  title: "Platform Analytics | Syftin Admin",
};

export default function AdminAnalyticsPage() {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-50 overflow-hidden selection:bg-indigo-500/30">
      <main className="flex-1 overflow-y-auto">
        <AnalyticsClient />
      </main>
    </div>
  );
}
