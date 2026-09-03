import { Skeleton } from "../../components/ui/skeleton";

export default function CreateLoading() {
  return (
    <div className="flex flex-col gap-5 py-4" aria-busy="true">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
