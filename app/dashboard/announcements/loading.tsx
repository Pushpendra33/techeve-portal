import Skeleton from "react-loading-skeleton";

export default function StudentAnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton width={180} height={28} />
        <Skeleton width={240} height={16} className="mt-1" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden space-y-4 pb-4">
            <Skeleton height={140} />
            <div className="px-4 space-y-2">
              <Skeleton width="40%" height={14} />
              <Skeleton width="80%" height={18} />
              <Skeleton width="100%" height={12} count={2} />
            </div>
            <div className="px-4 pt-2 flex justify-between items-center">
              <Skeleton width={80} height={16} />
              <Skeleton width={95} height={32} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
