import { useCallback, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_GROUPS, NAV_PRIMARY, NAV_SECONDARY, type NavItem } from '@/app/nav';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip } from '@/components/ui/tooltip';
import { useUi } from '@/store/ui';
import { modKey } from '@/lib/platform';
import { useHotkey } from '@/lib/useHotkey';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

/** Label text that fades out as the rail narrows, instead of popping. */
function RailLabel({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'relative truncate whitespace-nowrap transition-[opacity,transform] duration-200',
        open ? 'translate-x-0 opacity-100 delay-100' : 'pointer-events-none -translate-x-1 opacity-0',
        className,
      )}
    >
      {children}
    </span>
  );
}

function SidebarLink({ item, open }: { item: NavItem; open: boolean }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={open ? undefined : item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring/60',
          isActive ? 'text-fg' : 'text-fg-muted hover:bg-line/[0.06] hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-[10px] bg-violet/[0.12] ring-1 ring-inset ring-violet/20"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            >
              <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-violet" />
            </motion.span>
          )}
          <Icon
            className={cn(
              'relative size-[18px] shrink-0 transition-colors',
              isActive ? 'text-violet-text' : 'text-fg-subtle group-hover:text-fg',
            )}
            aria-hidden
          />
          <RailLabel open={open}>{item.label}</RailLabel>
        </>
      )}
    </NavLink>
  );

  if (open) return link;
  return (
    <Tooltip
      side="right"
      content={
        <span className="block max-w-[220px]">
          <span className="block font-medium">{item.label}</span>
          <span className="block text-fg-subtle">{item.description}</span>
        </span>
      }
    >
      {link}
    </Tooltip>
  );
}

function SectionHeading({ label, open }: { label: string; open: boolean }) {
  return (
    <div className="relative flex h-7 items-center px-3" aria-hidden>
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle transition-opacity duration-200',
          open ? 'opacity-100 delay-100' : 'opacity-0',
        )}
      >
        {label}
      </span>
      {/* In the slim rail the heading becomes a short divider. */}
      <span
        className={cn(
          'absolute left-1/2 h-px w-6 -translate-x-1/2 bg-line/15 transition-opacity duration-200',
          open ? 'opacity-0' : 'opacity-100',
        )}
      />
    </div>
  );
}

export function Sidebar() {
  const open = useUi((s) => s.sidebarOpen);
  const toggle = useUi((s) => s.toggleSidebar);

  useHotkey(
    'mod+b',
    useCallback(
      (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
        toggle();
      },
      [toggle],
    ),
  );

  return (
    <aside
      className={cn(
        'glass fixed inset-y-3 left-3 z-40 hidden flex-col rounded-xl transition-[width] duration-300 ease-out md:flex',
        open ? 'w-[var(--sidebar-w-open)]' : 'w-[var(--sidebar-w)]',
      )}
      aria-label="Main navigation"
      data-tour="nav"
    >
      {/* Edge handle: always visible, works in both sizes. */}
      <button
        type="button"
        onClick={toggle}
        tabIndex={-1}
        aria-hidden
        title={`${open ? 'Collapse' : 'Expand'} sidebar (${modKey}+B)`}
        className="glass-strong absolute -right-3 top-[26px] z-10 grid size-6 place-items-center rounded-full text-fg-muted shadow-card transition-colors hover:border-violet/40 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChevronLeft className={cn('size-3.5 transition-transform duration-300', !open && 'rotate-180')} />
      </button>

      <div className={cn('flex h-[72px] shrink-0 items-center overflow-hidden', open ? 'px-4' : 'justify-center')}>
        <NavLink to="/" aria-label="Home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <Logo collapsed={!open} />
        </NavLink>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
        {NAV_GROUPS.map((group, i) => {
          const items = NAV_PRIMARY.filter((n) => n.group === group.id);
          if (!items.length) return null;
          return (
            <div key={group.id} className={cn(i > 0 && 'mt-3')}>
              <SectionHeading label={group.label} open={open} />
              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarLink key={item.to} item={item} open={open} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-line/[0.08] px-3 py-3">
        {NAV_SECONDARY.map((item) => (
          <SidebarLink key={item.to} item={item} open={open} />
        ))}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={open}
          className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm text-fg-muted outline-none transition-colors hover:bg-line/[0.06] hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {open ? (
            <PanelLeftClose className="size-[18px] shrink-0" aria-hidden />
          ) : (
            <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden />
          )}
          <RailLabel open={open} className="flex flex-1 items-center justify-between">
            Collapse
            <span className="flex gap-1">
              <Kbd>{modKey}</Kbd>
              <Kbd>B</Kbd>
            </span>
          </RailLabel>
        </button>
      </div>
    </aside>
  );
}
