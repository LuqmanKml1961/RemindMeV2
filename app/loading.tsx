import { Skeleton } from "../components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col gap-4 py-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
