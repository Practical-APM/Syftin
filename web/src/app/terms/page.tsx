import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Terms of Service | Syftin",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        These terms govern your use of the Syftin web platform and structured
        data collection services during early access. By signing in or creating
        collection jobs, you agree to these terms on behalf of your organization.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Service scope
      </h2>
      <p>
        Syftin collects publicly accessible web data according to job
        instructions you provide, limited to approved domains and legitimate
        business research purposes. Login-only pages, private areas, and
        prohibited content are out of scope.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Your responsibilities
      </h2>
      <p>
        You are the data controller. You must have a lawful basis to request
        and use the data, comply with applicable regulations, and not use
        Syftin to collect data for illegal, harmful, or deceptive purposes.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Availability
      </h2>
      <p>
        Early access is provided as-is during the pilot phase. Collection quality,
        supported domains, and uptime may change as we iterate. Structured JSON
        outputs are provided without warranty of completeness for every page on
        a target site.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Contact
      </h2>
      <p>
        Questions about these terms:{" "}
        <a
          href="mailto:hello@syftin.io"
          className="text-honey-600 hover:text-honey-500"
        >
          hello@syftin.io
        </a>
        . See also our{" "}
        <a href="/privacy" className="text-honey-600 hover:text-honey-500">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/dpa" className="text-honey-600 hover:text-honey-500">
          Data Processing Agreement
        </a>
        .
      </p>
      <p className="pt-4 text-xs text-graphite-400">
        Summary for pilot customers — a countersigned agreement applies for
        production use. Last updated July 2026.
      </p>
    </LegalPageShell>
  );
}
