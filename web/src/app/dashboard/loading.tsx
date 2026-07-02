import {
  DashboardHeaderSkeleton,
  OverviewSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function DashboardLoading() {
  return (
    <>
      <DashboardHeaderSkeleton />
      <OverviewSkeleton />
    </>
  );
}
