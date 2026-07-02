import {
  DashboardHeaderSkeleton,
  JobsTableSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function JobsLoading() {
  return (
    <>
      <DashboardHeaderSkeleton withAction />
      <JobsTableSkeleton />
    </>
  );
}
