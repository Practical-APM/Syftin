import {
  DashboardHeaderSkeleton,
  JobDetailSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function JobDetailLoading() {
  return (
    <>
      <DashboardHeaderSkeleton />
      <JobDetailSkeleton />
    </>
  );
}
