import { Skeleton } from "@/components/ui";

// שלד טעינה בצורת המסך, כדי שהעמוד לא יקפוץ
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="טוען">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-7 h-4 w-72" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
