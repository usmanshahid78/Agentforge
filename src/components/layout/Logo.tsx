import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('relative grid size-9 shrink-0 place-items-center', className)}>
      <span className="absolute inset-0 rounded-[11px] bg-grad-primary opacity-90 blur-[10px]" />
      <span className="relative grid size-9 place-items-center rounded-[11px] border border-white/20 bg-bg/80">
        <span className="size-4 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,rgb(var(--c-cyan))_35%,rgb(var(--c-violet))_75%,rgb(var(--c-magenta))_100%)] shadow-glow-cyan" />
      </span>
    </span>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      {!collapsed && <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>}
    </span>
  );
}
