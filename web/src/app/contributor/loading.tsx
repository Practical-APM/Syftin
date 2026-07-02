import {
  DashboardHeaderSkeleton,
  OverviewSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function ContributorLoading() {
  return (
    <>
      <DashboardHeaderSkeleton />
      <OverviewSkeleton />
    </>
  );
}
