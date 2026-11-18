import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Skeleton } from './skeleton';

/** Skeleton grid used while a screen's data loads. */
export function LoadingState({ rows = 3, className, label = 'Loading' }: { rows?: number; className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="glass space-y-3 rounded-lg p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('glass flex flex-col items-center gap-3 rounded-lg px-6 py-12 text-center', className)}>
      <div className="grid size-12 place-items-center rounded-full border border-line/10 bg-violet/10 text-violet">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error?: Error; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn('glass flex flex-col items-center gap-3 rounded-lg border-danger/30 px-6 py-12 text-center', className)}
    >
      <div className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-fg-muted">{error?.message ?? 'We could not load this right now.'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Renders loading / error / empty / content for an async resource in one line.
 * Keeps every screen honest about all four states.
 */
export function AsyncView<T>({
  state,
  loading,
  empty,
  isEmpty,
  children,
}: {
  state: { data: T | undefined; error: Error | undefined; loading: boolean; refetch: () => void };
  loading?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data === undefined) return <>{loading ?? <LoadingState />}</>;
  if (state.error && state.data === undefined) return <ErrorState error={state.error} onRetry={state.refetch} />;
  if (state.data === undefined) return null;
  if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(state.data)}</>;
}
