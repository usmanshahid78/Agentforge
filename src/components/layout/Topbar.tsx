import { Link, useNavigate } from 'react-router-dom';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Bell, Building, LogOut, Moon, RotateCcw, Search, Settings, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { owner, businesses } from '@/mocks';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip } from '@/components/ui/tooltip';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { modKey } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';

const menuItem =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-muted outline-none transition-colors data-[highlighted]:bg-line/5 data-[highlighted]:text-fg [&_svg]:size-4';

export function Topbar() {
  const navigate = useNavigate();
  const theme = useUi((s) => s.theme);
  const toggleTheme = useUi((s) => s.toggleTheme);
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const setNotificationsOpen = useUi((s) => s.setNotificationsOpen);
  const businessId = useUi((s) => s.businessId);
  const setBusiness = useUi((s) => s.setBusiness);
  const unread = useDb((s) => s.notifications.filter((n) => !n.read).length);
  const resetDemo = useDb((s) => s.resetDemo);
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center gap-3 px-4 md:px-6">
      <Link to="/" className="md:hidden" aria-label="Home">
        <LogoMark />
      </Link>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="glass group flex h-10 min-w-0 flex-1 items-center gap-3 rounded-md px-3.5 text-sm text-fg-subtle transition-colors hover:border-violet/30 hover:text-fg-muted md:max-w-md"
        aria-label="Search and run commands"
        data-tour="search"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Search agents, screens, actions</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip content={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </Tooltip>

        <Tooltip content="Notifications">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsOpen(true)}
            data-tour="bell"
            aria-label={`Notifications, ${unread} unread`}
          >
            <Bell />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-magenta px-1 font-mono text-[10px] font-semibold leading-4 text-white">
                {unread}
              </span>
            )}
          </Button>
        </Tooltip>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 transition-colors hover:bg-line/5 lg:pr-3"
            >
              <span className="grid size-9 place-items-center rounded-full bg-grad-primary font-display text-sm font-semibold text-white">
                {owner.initials}
              </span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-sm font-medium">{owner.name}</span>
                <span className="block text-xs text-fg-subtle">{business?.name}</span>
              </span>
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="end"
              sideOffset={8}
              className="glass-strong z-50 w-64 rounded-lg p-1.5 animate-in fade-in-0 zoom-in-95"
            >
              <Dropdown.Label className="px-2.5 py-2">
                <div className="text-sm font-medium">{owner.name}</div>
                <div className="text-xs text-fg-subtle">{owner.email}</div>
              </Dropdown.Label>
              <Dropdown.Separator className="my-1 h-px bg-line/10" />
              <Dropdown.Label className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-wider text-fg-subtle">
                Business
              </Dropdown.Label>
              {businesses.map((b) => (
                <Dropdown.Item
                  key={b.id}
                  className={cn(menuItem, b.id === businessId && 'text-fg')}
                  onSelect={() => {
                    setBusiness(b.id);
                    toast.success(`Switched to ${b.name}`);
                  }}
                >
                  <Building />
                  <span className="flex-1">{b.name}</span>
                  {b.id === businessId && <span className="size-1.5 rounded-full bg-violet" />}
                </Dropdown.Item>
              ))}
              <Dropdown.Separator className="my-1 h-px bg-line/10" />
              <Dropdown.Item className={menuItem} onSelect={() => navigate('/settings')}>
                <Settings /> Settings
              </Dropdown.Item>
              <Dropdown.Item
                className={menuItem}
                onSelect={() => {
                  resetDemo();
                  toast.success('Demo data reset');
                }}
              >
                <RotateCcw /> Reset demo data
              </Dropdown.Item>
              <Dropdown.Item className={menuItem} onSelect={() => toast('Signing out is disabled in the demo')}>
                <LogOut /> Sign out
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>
    </header>
  );
}
