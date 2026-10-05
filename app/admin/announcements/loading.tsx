import Skeleton from "react-loading-skeleton";

export default function AdminAnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton width={180} height={28} />
          <Skeleton width={240} height={16} className="mt-1" />
        </div>
        <Skeleton width={140} height={40} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex justify-between">
              <Skeleton width={80} height={20} />
              <div className="flex gap-2">
                <Skeleton width={50} height={16} />
                <Skeleton width={50} height={16} />
              </div>
            </div>
            <Skeleton width="90%" height={24} />
            <Skeleton width="100%" height={14} count={3} />
            <div className="pt-2 flex justify-between items-center">
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={28} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
