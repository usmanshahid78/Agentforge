import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, BellOff, CheckCircle2, Info } from 'lucide-react';
import type { Severity } from '@/types';
import { Dialog, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { cn, fmt } from '@/lib/utils';

const SEVERITY = {
  info: { icon: Info, cls: 'text-cyan bg-cyan/10' },
  success: { icon: CheckCircle2, cls: 'text-success bg-success/10' },
  warning: { icon: AlertTriangle, cls: 'text-warning bg-warning/10' },
  critical: { icon: AlertOctagon, cls: 'text-danger bg-danger/10' },
} satisfies Record<Severity, { icon: typeof Info; cls: string }>;

export function NotificationsDrawer() {
  const open = useUi((s) => s.notificationsOpen);
  const setOpen = useUi((s) => s.setNotificationsOpen);
  const notifications = useDb((s) => s.notifications);
  const markAll = useDb((s) => s.markAllNotificationsRead);
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SheetContent side="right" aria-describedby="notif-desc">
        <div className="border-b border-line/10 px-6 pb-4 pt-6">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription id="notif-desc">
            {unread > 0 ? `${unread} unread` : 'You are all caught up'}
          </DialogDescription>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="-ml-3 mt-2" onClick={markAll}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <EmptyState icon={BellOff} title="No notifications" description="Agent alerts and approvals will appear here." />
          ) : (
            notifications.map((n) => {
              const { icon: Icon, cls } = SEVERITY[n.severity];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.href) {
                      setOpen(false);
                      navigate(n.href);
                    }
                  }}
                  className={cn(
                    'flex w-full gap-3 rounded-md border border-transparent p-3 text-left transition-colors hover:border-line/10 hover:bg-line/5',
                    !n.read && 'bg-violet/[0.06]',
                  )}
                >
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', cls)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-magenta" aria-label="unread" />}
                    </span>
                    <span className="block text-sm text-fg-muted">{n.body}</span>
                    <span className="mt-1 block font-mono text-[11px] text-fg-subtle">{fmt.ago(n.at)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
