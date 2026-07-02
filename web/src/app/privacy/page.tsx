import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Privacy Policy | Syftin",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        Syftin provides structured data collection services for business
        customers. This policy describes how we handle information when you
        use our website and customer dashboard.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        What we collect
      </h2>
      <p>
        When you request early access or use the dashboard, we may collect your
        work email, company name, job configuration details, and usage logs
        needed to operate the service.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        How we use data
      </h2>
      <p>
        We use account and job data to deliver structured files, improve
        collection quality, provide support, and meet legal obligations. We do
        not sell personal data.
      </p>
      <h2 className="pt-2 text-base font-semibold text-graphite-900">
        Your rights
      </h2>
      <p>
        Business customers may request access, correction, or deletion of account
        data by contacting{" "}
        <a href="mailto:hello@syftin.io" className="text-honey-600 hover:text-honey-500">
          hello@syftin.io
        </a>
        .
      </p>
      <p className="pt-4 text-xs text-graphite-400">
        Last updated July 2026. This is a summary for early access customers; a
        full policy will be provided before general availability.
      </p>
    </LegalPageShell>
  );
}
