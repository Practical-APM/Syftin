import { LegalPageShell } from "@/components/legal/legal-page-shell";
import Link from "next/link";

export const metadata = {
  title: "Contributor Terms | Syftin",
};

export default function ContributorTermsPage() {
  return (
    <LegalPageShell title="Contributor Node Terms">
      <p>
        These terms apply when you install and run the Syftin edge node app
        (Persona B — contributor). They are separate from buyer dashboard terms.
      </p>

      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Network use
      </h2>
      <p>
        Syftin may route HTTPS requests for <strong className="font-medium">approved public web pages</strong> through your internet connection. Target websites may log your public IP address. You must comply with your ISP, mobile carrier, and campus or housing network policies. If your institution prohibits automated access, do not run the node on that network.
      </p>

      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Campus &amp; dorm guidance
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Prefer home broadband over university Wi‑Fi when IT policy is unclear.</li>
        <li>Pause the node from Network settings if normal browsing to major sites breaks.</li>
        <li>Do not run the node if you share a public IP (hostel CGNAT) with many other contributors without checking fleet guidance from Syftin ops.</li>
      </ul>

      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Data processing role
      </h2>
      <p>
        Your device temporarily handles raw HTML from public pages before upload to Syftin infrastructure. You act as a technical sub-processor for Syftin&apos;s buyer-facing data processing. Do not copy, store, or share fetched page content outside the node app.
      </p>

      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Your controls
      </h2>
      <p>
        You can pause tasks, limit resource use (Eco / Balanced / Titan), block metered connections, and uninstall at any time. Earnings and UPI payout rules are described on the{" "}
        <Link href="/contributor/earnings" className="text-honey-600 hover:text-honey-500">
          Earnings
        </Link>{" "}
        page.
      </p>

      <p className="pt-4 text-xs text-graphite-400">
        Version 2026-07-pilot · Summary for onboarding — not a substitute for a countersigned agreement where required.
      </p>
    </LegalPageShell>
  );
}
