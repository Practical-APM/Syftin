import type { Metadata } from "next";
import { AnalyticsClient } from "./client";

export const metadata: Metadata = {
  title: "Platform Analytics | Syftin Admin",
};

export default function AdminAnalyticsPage() {
  return <AnalyticsClient />;
}
