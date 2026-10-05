import Skeleton from "react-loading-skeleton";

export default function AdminStudentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton width={140} height={28} />
          <Skeleton width={220} height={16} className="mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton width={100} height={40} />
          <Skeleton width={120} height={40} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <Skeleton width={200} height={36} />
        <div className="flex gap-2">
          <Skeleton width={120} height={36} />
          <Skeleton width={120} height={36} />
        </div>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={16} />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, r) => (
            <div key={r} className="grid grid-cols-6 gap-4 py-2 border-b border-border/50 last:border-0">
              <Skeleton height={16} width="80%" />
              <Skeleton height={16} width="90%" />
              <Skeleton height={16} width="70%" />
              <Skeleton height={16} width="60%" />
              <Skeleton height={16} width="50%" />
              <div className="flex gap-2">
                <Skeleton height={24} width={24} circle />
                <Skeleton height={24} width={24} circle />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
