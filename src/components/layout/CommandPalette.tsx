import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Moon, Plus, RotateCcw, Search, Sparkles, UserPlus, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_NAV } from '@/app/nav';
import { Avatar } from '@/components/avatar/Avatar';
import { Kbd } from '@/components/ui/kbd';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { roleTemplates } from '@/mocks';
import { useHotkey } from '@/lib/useHotkey';

const group =
  'px-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle';
const item =
  'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2.5 text-sm text-fg-muted outline-none data-[selected=true]:bg-violet/10 data-[selected=true]:text-fg [&_svg]:size-4 [&_svg]:shrink-0';

export function CommandPalette() {
  const open = useUi((s) => s.commandOpen);
  const setOpen = useUi((s) => s.setCommandOpen);
  const toggleTheme = useUi((s) => s.toggleTheme);
  const agents = useDb((s) => s.agents);
  const resetDemo = useDb((s) => s.resetDemo);
  const navigate = useNavigate();

  useHotkey('mod+k', useCallback(() => setOpen(!useUi.getState().commandOpen), [setOpen]));

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="glass-strong fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl shadow-glow-violet data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command loop className="flex max-h-[min(70vh,520px)] flex-col">
            <div className="flex items-center gap-3 border-b border-line/10 px-4">
              <Search className="size-4 text-fg-subtle" aria-hidden />
              <Command.Input
                autoFocus
                placeholder="Jump to an agent, screen or action..."
                className="h-14 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="scrollbar-thin flex-1 overflow-y-auto p-1.5">
              <Command.Empty className="py-10 text-center text-sm text-fg-muted">
                No matches. Try "hire" or an agent name.
              </Command.Empty>

              <Command.Group heading="Actions" className={group}>
                <Command.Item className={item} onSelect={() => run(() => navigate('/build'))} keywords={['create', 'new']}>
                  <Plus /> Create a new agent
                </Command.Item>
                <Command.Item
                  className={item}
                  onSelect={() => run(() => navigate('/build?template=tpl-price'))}
                  keywords={['hire', 'pricing']}
                >
                  <UserPlus /> Hire a pricing analyst
                </Command.Item>
                <Command.Item className={item} onSelect={() => run(() => navigate('/observe#approvals'))} keywords={['approve']}>
                  <Zap /> Review pending approvals
                </Command.Item>
                <Command.Item className={item} onSelect={() => run(() => navigate('/avatars'))}>
                  <Sparkles /> Open avatar studio
                </Command.Item>
                <Command.Item className={item} onSelect={() => run(toggleTheme)} keywords={['dark', 'light']}>
                  <Moon /> Toggle theme
                </Command.Item>
                <Command.Item
                  className={item}
                  onSelect={() =>
                    run(() => {
                      resetDemo();
                      toast.success('Demo data reset');
                    })
                  }
                >
                  <RotateCcw /> Reset demo data
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Agents" className={group}>
                {agents.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`agent ${a.name} ${a.role}`}
                    className={item}
                    onSelect={() => run(() => navigate(`/agents/${a.id}`))}
                  >
                    <Avatar agent={a} size="xs" />
                    <span className="text-fg">{a.name}</span>
                    <span className="text-fg-subtle">{a.role}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Screens" className={group}>
                {ALL_NAV.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Command.Item
                      key={n.to}
                      value={`screen ${n.label}`}
                      keywords={n.keywords}
                      className={item}
                      onSelect={() => run(() => navigate(n.to))}
                    >
                      <Icon />
                      <span className="text-fg">{n.label}</span>
                      <span className="truncate text-fg-subtle">{n.description}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>

              <Command.Group heading="Hire from marketplace" className={group}>
                {roleTemplates.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`hire ${t.title}`}
                    className={item}
                    onSelect={() => run(() => navigate(`/build?template=${t.id}`))}
                  >
                    <UserPlus />
                    Hire a {t.title.toLowerCase()}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="flex items-center gap-4 border-t border-line/10 px-4 py-2.5 text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Enter</Kbd> open
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
