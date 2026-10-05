import Skeleton from "react-loading-skeleton";

export default function AdminCoursesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton width={120} height={28} />
          <Skeleton width={200} height={16} className="mt-1" />
        </div>
        <Skeleton width={120} height={40} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden p-5 space-y-4">
            <Skeleton height={140} className="rounded-lg" />
            <div className="space-y-2">
              <Skeleton width="40%" height={16} />
              <Skeleton width="80%" height={20} />
              <Skeleton width="100%" height={14} count={2} />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton width={60} height={24} />
              <Skeleton width={80} height={28} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
