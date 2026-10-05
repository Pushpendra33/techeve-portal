import Skeleton from "react-loading-skeleton";

export default function StudentCapstoneLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton width={140} height={28} />
          <Skeleton width={220} height={16} className="mt-1" />
        </div>
        <Skeleton width={130} height={40} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton width="60%" height={20} />
              <Skeleton width={80} height={24} />
            </div>
            <Skeleton width="90%" height={14} count={3} />
            <div className="flex gap-2">
              <Skeleton width={60} height={16} />
              <Skeleton width={60} height={16} />
              <Skeleton width={60} height={16} />
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <Skeleton width={100} height={14} />
              <div className="flex items-center gap-3">
                <Skeleton circle width={32} height={32} />
                <div className="flex-1 space-y-1">
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="80%" height={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
