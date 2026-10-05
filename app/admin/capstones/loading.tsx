import Skeleton from "react-loading-skeleton";

export default function AdminCapstonesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton width={160} height={28} />
        <Skeleton width={260} height={16} className="mt-1" />
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={16} />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="grid grid-cols-5 gap-4 py-2 border-b border-border/50 last:border-0">
              <Skeleton height={16} width="70%" />
              <Skeleton height={16} width="80%" />
              <Skeleton height={16} width="60%" />
              <Skeleton height={24} width={80} />
              <Skeleton height={28} width={70} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
