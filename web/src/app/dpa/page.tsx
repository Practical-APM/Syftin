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
        <a href="mailto:hello@syftin.io" className="text-honey-600 hover:text-honey-500">
          hello@syftin.io
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
