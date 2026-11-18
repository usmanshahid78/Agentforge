import { NavLink } from 'react-router-dom';
import { ALL_NAV } from '@/app/nav';
import { cn } from '@/lib/utils';

const TABS = ALL_NAV.filter((n) => n.mobile);

export function MobileTabBar() {
  return (
    <nav
      aria-label="Main navigation"
      data-tour="nav-mobile"
      className="glass-strong fixed inset-x-2 bottom-2 z-40 flex justify-around rounded-xl px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'bg-violet/10 text-violet' : 'text-fg-muted',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            <span className="truncate">{item.label === 'Mission control' ? 'Home' : item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
