import {
  DashboardHeaderSkeleton,
  OverviewSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function AdminLoading() {
  return (
    <>
      <DashboardHeaderSkeleton />
      <OverviewSkeleton />
    </>
  );
}
