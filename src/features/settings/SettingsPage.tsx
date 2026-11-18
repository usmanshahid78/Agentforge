import { useState, type FormEvent, type ReactNode } from 'react';
import { Bell, Bot, Copy, CreditCard, Download, KeyRound, Monitor, Moon, Palette, RotateCcw, Shield, Sun, Trash2, User, Users, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { Owner } from '@/types';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Meter, Segmented, Switch } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AiModel } from './AiModel';
import { useBuilder } from '@/store/builder';
import { useDb, uid } from '@/store/db';
import { useSettings, type ApiKey } from '@/store/settings';
import { useUi, type MotionPref } from '@/store/ui';
import { sfx } from '@/lib/sound';
import { cn, fmt } from '@/lib/utils';

type Section = 'profile' | 'team' | 'billing' | 'keys' | 'ai' | 'notifications' | 'appearance' | 'privacy' | 'demo';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof User }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'team', label: 'Team and roles', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'keys', label: 'API keys', icon: KeyRound },
  { id: 'ai', label: 'AI model', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Data privacy', icon: Shield },
  { id: 'demo', label: 'Demo controls', icon: Wrench },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line/5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-sm text-fg-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-2 flex items-start gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Profile() {
  const { profile, setProfile } = useSettings();
  const [p, setP] = useState(profile);
  const [error, setError] = useState<string>();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(p.email)) return setError('Enter a valid email address.');
    setError(undefined);
    setProfile(p);
    toast.success('Profile saved');
  };
  return (
    <SectionCard title="Profile" description="How you appear to your team and in briefings.">
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="pf-name" className="mb-1.5 block text-sm font-medium">Name</label>
          <Input id="pf-name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="pf-email" className="mb-1.5 block text-sm font-medium">Email</label>
          <Input id="pf-email" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} aria-invalid={!!error} aria-describedby={error ? 'pf-err' : undefined} />
          {error && <p id="pf-err" className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        <div>
          <label htmlFor="pf-phone" className="mb-1.5 block text-sm font-medium">WhatsApp number</label>
          <Input id="pf-phone" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} />
        </div>
        <div className="flex items-end justify-end">
          <Button type="submit" variant="primary">Save profile</Button>
        </div>
      </form>
    </SectionCard>
  );
}

const ROLES: Owner['role'][] = ['Owner', 'Admin', 'Manager', 'Viewer'];

function Team() {
  const { team, invite, setRole, removeMember } = useSettings();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setR] = useState<Owner['role']>('Manager');
  return (
    <SectionCard title="Team and roles" description="People who can see and manage your AI company." action={<Button variant="primary" size="sm" onClick={() => setOpen(true)}><Users /> Invite</Button>}>
      <ul className="mt-2 divide-y divide-line/5">
        {team.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-line/10 text-xs font-semibold">{m.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{m.name} {m.status === 'invited' && <Badge tone="cyan" className="ml-1">Invited</Badge>}</div>
              <div className="text-xs text-fg-subtle">{m.email}</div>
            </div>
            {m.role === 'Owner' ? (
              <Badge tone="violet">Owner</Badge>
            ) : (
              <>
                <label className="sr-only" htmlFor={`role-${m.id}`}>Role for {m.name}</label>
                <select id={`role-${m.id}`} value={m.role} onChange={(e) => setRole(m.id, e.target.value as Owner['role'])} className="h-9 rounded-md border border-line/10 bg-surface/60 px-2 text-sm text-fg">
                  {ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}
                </select>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => { removeMember(m.id); toast(`${m.name} removed`); }}>
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-subtle">Managers can approve actions. Viewers can only read. Only the owner can change trust levels.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Enter a valid email address');
              invite({ id: uid('tm'), name: email.split('@')[0] ?? email, email, role, status: 'invited' });
              toast.success(`Invite sent to ${email}`);
              setEmail('');
              setOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
              <DialogDescription>They will get an email with a link to join.</DialogDescription>
            </DialogHeader>
            <label htmlFor="inv-email" className="mb-1.5 block text-sm font-medium">Email</label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <label htmlFor="inv-role" className="mb-1.5 mt-4 block text-sm font-medium">Role</label>
            <select id="inv-role" value={role} onChange={(e) => setR(e.target.value as Owner['role'])} className="h-10 w-full rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg">
              {ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}
            </select>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Send invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function Billing() {
  const agents = useDb((s) => s.agents);
  const monthly = agents.reduce((s, a) => s + a.costPerDay * 30, 0);
  return (
    <SectionCard title="Billing" description="Mock billing for the demo. No real charges.">
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-violet/30 bg-violet/5 p-4">
          <Badge tone="violet">Growth plan</Badge>
          <p className="mt-2 font-display text-3xl font-semibold">£149<span className="text-sm font-normal text-fg-subtle">/month</span></p>
          <p className="text-sm text-fg-muted">Up to 12 agents, 3 team members, edge devices included.</p>
        </div>
        <div className="space-y-3 rounded-lg border border-line/10 p-4">
          <Meter label={`Agents (${agents.length} of 12)`} value={(agents.length / 12) * 100} tone="violet" />
          <Meter label="Agent running costs vs £900 budget" value={(monthly / 900) * 100} tone="cyan" />
          <p className="text-xs text-fg-subtle">Estimated agent running cost: {fmt.money(monthly)} this month.</p>
        </div>
      </div>
      <h3 className="mb-2 mt-6 text-sm font-medium">Invoices</h3>
      <ul className="divide-y divide-line/5 text-sm">
        {['September 2026', 'August 2026', 'July 2026'].map((m, i) => (
          <li key={m} className="flex items-center gap-3 py-2.5">
            <span className="flex-1">{m}</span>
            <span className="font-mono text-xs">{fmt.moneyPrecise(149 + 612 - i * 41)}</span>
            <Badge tone="success">Paid</Badge>
            <Button variant="ghost" size="icon-sm" aria-label={`Download ${m} invoice`} onClick={() => toast('Invoice download is disabled in the demo')}><Download /></Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Keys() {
  const { apiKeys, addKey, revokeKey } = useSettings();
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string>();
  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const secret = `af_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const k: ApiKey = { id: uid('key'), name: name.trim(), prefix: secret.slice(0, 12), createdAt: new Date().toISOString() };
    addKey(k);
    setFresh(secret);
    setName('');
  };
  return (
    <SectionCard title="API keys" description="Mock keys for connecting your own systems. Treat real keys like passwords.">
      <form onSubmit={create} className="mt-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Stock spreadsheet sync" aria-label="New key name" />
        <Button type="submit" variant="primary" disabled={!name.trim()}>Create key</Button>
      </form>
      {fresh && (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm" role="status">
          <p className="mb-2 font-medium">Copy this key now. You won't see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-bg/60 px-2 py-1.5 font-mono text-xs">{fresh}</code>
            <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(fresh); toast.success('Copied'); }}><Copy /> Copy</Button>
          </div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line/5">
        {apiKeys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
            <KeyRound className="size-4 text-fg-subtle" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-medium">{k.name}</div>
              <div className="font-mono text-xs text-fg-subtle">{k.prefix}•••••••• · created {fmt.ago(k.createdAt)}{k.lastUsed ? ` · used ${fmt.ago(k.lastUsed)}` : ' · never used'}</div>
            </div>
            <Button variant="danger" size="sm" onClick={() => { revokeKey(k.id); toast(`${k.name} revoked`); }}>Revoke</Button>
          </li>
        ))}
        {apiKeys.length === 0 && <li className="py-3 text-sm text-fg-muted">No keys yet.</li>}
      </ul>
    </SectionCard>
  );
}

function Notifications() {
  const { notify, setNotify } = useSettings();
  return (
    <SectionCard title="Notification channels" description="Where approvals and alerts reach you.">
      <Row label="Email" hint="Approvals, alerts and the daily briefing."><Switch label="Email notifications" checked={notify.email} onChange={(v) => setNotify({ email: v })} /></Row>
      <Row label="WhatsApp" hint="Urgent approvals with one-tap replies."><Switch label="WhatsApp notifications" checked={notify.whatsapp} onChange={(v) => setNotify({ whatsapp: v })} /></Row>
      <Row label="Browser push" hint="While AgentForge is open."><Switch label="Push notifications" checked={notify.push} onChange={(v) => setNotify({ push: v })} /></Row>
      <Row label="Quiet hours" hint="Hold non-critical alerts from 21:00 to 07:00."><Switch label="Quiet hours" checked={notify.quietHours} onChange={(v) => setNotify({ quietHours: v })} /></Row>
      <Row label="Grouping">
        <Segmented label="Notification grouping" value={notify.digest} onChange={(v) => setNotify({ digest: v })} options={[{ value: 'instant', label: 'Instant' }, { value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily digest' }]} />
      </Row>
    </SectionCard>
  );
}

function Appearance() {
  const ui = useUi();
  return (
    <SectionCard title="Appearance" description="How AgentForge looks, moves and sounds.">
      <Row label="Theme">
        <Segmented label="Theme" value={ui.theme} onChange={ui.setTheme} options={[{ value: 'dark', label: 'Dark', icon: Moon }, { value: 'light', label: 'Light', icon: Sun }]} />
      </Row>
      <Row label="Motion" hint="System follows your device's reduced-motion setting.">
        <Segmented<MotionPref> label="Motion" value={ui.motion} onChange={ui.setMotion} options={[{ value: 'system', label: 'System', icon: Monitor }, { value: 'full', label: 'Full' }, { value: 'reduce', label: 'Reduced' }]} />
      </Row>
      <Row label="Interface sounds" hint="Subtle chimes on approvals and hires. Off by default.">
        <Switch label="Interface sounds" checked={ui.sound} onChange={(v) => { ui.setSound(v); if (v) window.setTimeout(() => sfx('success'), 50); }} />
      </Row>
      <Row label="Sidebar" hint="Show labels next to icons.">
        <Switch label="Expanded sidebar" checked={ui.sidebarOpen} onChange={ui.toggleSidebar} />
      </Row>
    </SectionCard>
  );
}

function Privacy() {
  const { privacy, setPrivacy } = useSettings();
  const resetDemo = useDb((s) => s.resetDemo);
  const [confirm, setConfirm] = useState(false);
  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), db: useDb.getState(), settings: useSettings.getState() };
    const blob = new Blob([JSON.stringify(data, (_k, v) => (typeof v === 'function' ? undefined : v), 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'agentforge-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Export downloaded');
  };
  return (
    <SectionCard title="Data privacy" description="You own your data. These choices apply to every agent.">
      <Row label="Improve models with my data" hint="Off: your data is never used to train shared models."><Switch label="Train on my data" checked={privacy.trainOnData} onChange={(v) => setPrivacy({ trainOnData: v })} /></Row>
      <Row label="Share anonymised benchmarks" hint="Compare your store with similar shops. No names or customer data."><Switch label="Share anonymised benchmarks" checked={privacy.shareAnonymised} onChange={(v) => setPrivacy({ shareAnonymised: v })} /></Row>
      <Row label="Keep agent history for">
        <Segmented label="Retention" value={String(privacy.retentionDays) as '30' | '90' | '365'} onChange={(v) => setPrivacy({ retentionDays: Number(v) as 30 | 90 | 365 })} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: '1 year' }]} />
      </Row>
      <Row label="Export everything" hint="Agents, activity, approvals and settings as JSON."><Button variant="outline" size="sm" onClick={exportData}><Download /> Export</Button></Row>
      <Row label="Delete all data" hint="Removes agents and history. In the demo this resets to the starting state."><Button variant="danger" size="sm" onClick={() => setConfirm(true)}><Trash2 /> Delete</Button></Row>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all data?</DialogTitle>
            <DialogDescription>Every agent, approval and activity record will be removed. This cannot be undone (in the demo, starting data is restored).</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { resetDemo(); setConfirm(false); toast('All data deleted. Demo data restored.'); }}>Delete everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function Demo() {
  const ui = useUi();
  const resetDemo = useDb((s) => s.resetDemo);
  const begin = useBuilder((s) => s.begin);
  return (
    <SectionCard title="Demo controls" description="This is a frontend prototype running on mock data." action={<Badge tone="cyan">Mock data</Badge>}>
      <Row label="Simulate network failures" hint="Randomly fails 5% of loads so error states can be seen.">
        <Switch label="Simulate network failures" checked={ui.simulateFailures} onChange={ui.setSimulateFailures} />
      </Row>
      <Row label="Onboarding tour" hint={ui.tourDismissed ? 'Dismissed' : 'Shows on the home screen'}>
        <Button variant="outline" size="sm" onClick={() => { ui.resetTour(); toast.success('The tour will show on the home screen'); }}>Show again</Button>
      </Row>
      <Row label="Reset demo" hint="Restores the original Nova Mart agents, approvals and connectors, and clears the builder.">
        <Button variant="danger" size="sm" onClick={() => { resetDemo(); begin({}, 'company'); toast.success('Demo reset'); }}><RotateCcw /> Reset</Button>
      </Row>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('profile');
  const body: Record<Section, ReactNode> = {
    profile: <Profile />,
    team: <Team />,
    billing: <Billing />,
    keys: <Keys />,
    ai: <AiModel />,
    notifications: <Notifications />,
    appearance: <Appearance />,
    privacy: <Privacy />,
    demo: <Demo />,
  };
  return (
    <Page>
      <PageHeader eyebrow="Settings" title="Settings" description="Your profile, team, billing, keys, notifications, appearance and privacy." />
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="scrollbar-thin flex gap-1 overflow-x-auto md:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className={cn('flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors', section === s.id ? 'bg-violet/15 text-fg' : 'text-fg-muted hover:bg-line/5 hover:text-fg')}
              >
                <Icon className="size-4" aria-hidden /> {s.label}
              </button>
            );
          })}
        </nav>
        <div>{body[section]}</div>
      </div>
    </Page>
  );
}
