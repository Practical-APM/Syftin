import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Data Processing Agreement | Syftin",
};

export default function DpaPage() {
  return (
    <LegalPageShell title="Data Processing Agreement">
      <p>
        Syftin acts as a <strong className="font-medium text-graphite-800">Data Processor</strong>{" "}
        when collecting and structuring web data on behalf of business
        customers. Your organization remains the{" "}
        <strong className="font-medium text-graphite-800">Data Controller</strong>{" "}
        and decides what to collect and how outputs are used.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Scope of processing
      </h2>
      <p>
        Syftin processes job instructions, target URLs on approved public
        websites, and example field schemas to produce structured JSON files.
        Processing is limited to legitimate business research purposes agreed
        with each customer.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Sub-processors
      </h2>
      <p>
        Syftin uses the following categories of sub-processors to deliver structured data:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="font-medium">Contributor edge nodes</strong> — vetted operators who run the Syftin node app on their own devices to fetch approved public pages over their internet connection. Raw HTML is uploaded to Syftin-controlled storage for hub-side extraction; contributors must accept separate{" "}
          <a href="/contributor/terms" className="text-honey-600 hover:text-honey-500">
            Contributor Terms
          </a>
          .
        </li>
        <li>
          <strong className="font-medium">Cloud infrastructure</strong> — database, object storage, and application hosting (e.g. Supabase, Vercel, S3-compatible storage).
        </li>
        <li>
          <strong className="font-medium">Payment providers</strong> — Razorpay / RazorpayX for buyer credits and contributor payouts.
        </li>
      </ul>
      <p className="text-sm text-graphite-600">
        Data flow: Buyer job → task queue → contributor fetch (public IP) → encrypted upload → hub validation &amp; PII screening → buyer workspace delivery.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Security measures
      </h2>
      <p>
        We apply access controls, input screening, and privacy screening on
        outputs. Customer files are stored in isolated workspaces and retained
        according to the agreed contract term.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Request a signed DPA
      </h2>
      <p>
        Enterprise customers receive a countersigned agreement during onboarding.
        Email{" "}
        <a href="mailto:support@syftin.com" className="text-honey-600 hover:text-honey-500">
          support@syftin.com
        </a>{" "}
        to request the current DPA template.
      </p>
      <p className="pt-4 text-xs text-graphite-400">
        Summary only — not a legally binding contract. A signed agreement is
        required for production use.
      </p>
    </LegalPageShell>
  );
}
