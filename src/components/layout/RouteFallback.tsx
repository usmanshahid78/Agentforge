import { LoadingState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown while a lazily loaded route chunk downloads. */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 md:px-6">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-8 h-9 w-72" />
      <LoadingState rows={6} label="Loading screen" />
    </div>
  );
}
