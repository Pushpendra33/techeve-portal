import Skeleton from "react-loading-skeleton";

export default function StudentCourseLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton width={130} height={28} />
        <Skeleton width={200} height={16} className="mt-1" />
      </div>

      <div className="flex border-b border-border gap-6">
        <Skeleton width={80} height={32} />
        <Skeleton width={100} height={32} />
        <Skeleton width={80} height={32} />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton width={150} height={18} />
              <Skeleton width={60} height={14} />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between items-center py-1 border-t border-border/40 first:border-0 pt-2">
                  <Skeleton width="40%" height={16} />
                  <div className="flex gap-4">
                    <Skeleton width={50} height={14} />
                    <Skeleton width={16} height={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
