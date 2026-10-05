import Skeleton from "react-loading-skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton width={150} height={28} />
        <Skeleton width={220} height={16} className="mt-1" />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <Skeleton width={80} height={14} />
            <Skeleton width={120} height={28} />
            <Skeleton width={60} height={14} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center space-y-4 md:col-span-1">
          <Skeleton width={100} height={18} />
          <Skeleton circle width={120} height={120} />
          <Skeleton width={80} height={16} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 md:col-span-2">
          <Skeleton width={150} height={18} />
          <Skeleton height={200} />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton width={140} height={20} />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-4">
              <Skeleton width={80} height={60} className="rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton width="40%" height={14} />
                <Skeleton width="90%" height={18} />
                <Skeleton width="60%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
