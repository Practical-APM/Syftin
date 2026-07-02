import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PilotSetupGate } from "@/components/dashboard/pilot-setup-gate";
import {
  CustomerStatusStrip,
  DevSetupBanner,
} from "@/components/dashboard/setup-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <DevSetupBanner />
      <CustomerStatusStrip />
      <PilotSetupGate>{children}</PilotSetupGate>
    </DashboardShell>
  );
}
