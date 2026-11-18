import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, CheckCircle2, Cloud, Cpu, Layers, Loader2, Pause, Play, Plus, RotateCcw, ServerCrash, Wifi, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Device, DeviceHealth } from '@/types';
import { api } from '@/api';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Meter } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AsyncView, EmptyState, LoadingState } from '@/components/ui/states';
import { useDb, uid } from '@/store/db';
import { useUi, type DeployMode } from '@/store/ui';
import { sfx } from '@/lib/sound';
import { useApi } from '@/lib/useApi';
import { cn, fmt } from '@/lib/utils';

const LATEST = 'v2.5.0';
const RINGS: Array<{ id: Device['ring']; label: string; note: string }> = [
  { id: 'pilot', label: 'Pilot', note: '2 stores' },
  { id: 'wave-1', label: 'Wave 1', note: '2 stores' },
  { id: 'wave-2', label: 'Wave 2', note: 'remaining stores' },
];

const MODES: Array<{ id: DeployMode; title: string; icon: typeof Cloud; summary: string; pros: string[]; cons: string[] }> = [
  { id: 'cloud', title: 'Cloud', icon: Cloud, summary: 'Agents run in our data centre. Nothing to install.', pros: ['No hardware', 'Always the newest model', 'Scales instantly'], cons: ['Needs a steady internet connection', 'Data leaves the store'] },
  { id: 'edge', title: 'Edge', icon: Cpu, summary: 'A small device in each store runs the agents on site.', pros: ['Works offline', 'Camera data never leaves the store', 'Fast replies'], cons: ['Device per store', 'Smaller models', 'Updates roll out in stages'] },
  { id: 'hybrid', title: 'Hybrid', icon: Layers, summary: 'Sensitive and real-time work on site; heavy analysis in the cloud.', pros: ['Best of both', 'Keeps working if the internet drops', 'Private sensor data'], cons: ['Slightly more setup'] },
];

const HEALTH: Record<DeviceHealth, { label: string; tone: BadgeTone; icon: typeof Wifi }> = {
  healthy: { label: 'Healthy', tone: 'success', icon: CheckCircle2 },
  degraded: { label: 'Degraded', tone: 'warning', icon: AlertTriangle },
  offline: { label: 'Offline', tone: 'danger', icon: ServerCrash },
};

function ProvisionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setDevices = useDb((s) => s.setDevices);
  const [step, setStep] = useState<'details' | 'pair' | 'done'>('details');
  const [store, setStore] = useState('');
  const [city, setCity] = useState('');
  const [code] = useState(() => `NM-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);

  useEffect(() => {
    if (!open) window.setTimeout(() => setStep('details'), 200);
  }, [open]);

  useEffect(() => {
    if (step !== 'pair') return;
    const t = window.setTimeout(() => {
      setDevices((d) => [
        ...d,
        { id: uid('dev'), storeName: `Nova Mart ${store}`, city: city || store, health: 'healthy', modelVersion: LATEST, lastSync: new Date().toISOString(), cpuPct: 12, ring: 'wave-2' },
      ]);
      sfx('success');
      setStep('done');
    }, 4500);
    return () => window.clearTimeout(t);
  }, [step, store, city, setDevices]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.trim().length >= 2) setStep('pair');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision a new device</DialogTitle>
          <DialogDescription>Plug the AgentForge box into power and network, then pair it.</DialogDescription>
        </DialogHeader>
        {step === 'details' && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="dev-store" className="mb-1.5 block text-sm font-medium">
                Store name
              </label>
              <Input id="dev-store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Chorlton" autoFocus required minLength={2} />
            </div>
            <div>
              <label htmlFor="dev-city" className="mb-1.5 block text-sm font-medium">
                City
              </label>
              <Input id="dev-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Manchester" />
            </div>
            <DialogFooter>
              <Button type="submit" variant="primary" disabled={store.trim().length < 2}>
                Get pairing code
              </Button>
            </DialogFooter>
          </form>
        )}
        {step === 'pair' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-lg bg-paper p-3">
              <QRCodeSVG value={`agentforge://pair/${code}`} size={168} bgColor="transparent" fgColor="rgb(var(--c-ink))" title={`Pairing code ${code}`} />
            </div>
            <p className="font-mono text-2xl font-semibold tracking-widest text-gradient">{code}</p>
            <p className="max-w-xs text-sm text-fg-muted">Scan the QR code with the device's camera, or type the code on its screen.</p>
            <p className="flex items-center gap-2 text-sm" role="status">
              <Loader2 className="size-4 animate-spin text-violet" aria-hidden /> Waiting for the device...
            </p>
          </div>
        )}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <p className="font-display text-lg font-semibold">Nova Mart {store} is online</p>
            <p className="text-sm text-fg-muted">Running {LATEST}. It joins the Wave 2 update ring.</p>
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RolloutState = 'idle' | 'running' | 'paused' | 'done' | 'rolledback';

function Rollout({ devices }: { devices: Device[] }) {
  const setDevices = useDb((s) => s.setDevices);
  const addEvent = useDb((s) => s.addEvent);
  const [state, setState] = useState<RolloutState>(() => (devices.every((d) => d.modelVersion === LATEST || d.health === 'offline') ? 'done' : 'idle'));
  const [confirmRollback, setConfirmRollback] = useState(false);
  const previous = useRef<Record<string, string>>({});
  const eligible = devices.filter((d) => d.health !== 'offline');
  const updated = eligible.filter((d) => d.modelVersion === LATEST).length;

  // Upgrade one device per tick, ring by ring, skipping offline devices.
  useEffect(() => {
    if (state !== 'running') return;
    const t = window.setInterval(() => {
      const next = RINGS.flatMap((r) => devices.filter((d) => d.ring === r.id)).find((d) => d.health !== 'offline' && d.modelVersion !== LATEST);
      if (!next) {
        setState('done');
        sfx('success');
        toast.success(`${LATEST} rolled out`, { description: 'Health checks passed in every ring.' });
        return;
      }
      previous.current[next.id] ??= next.modelVersion;
      setDevices((ds) => ds.map((d) => (d.id === next.id ? { ...d, modelVersion: LATEST, lastSync: new Date().toISOString() } : d)));
    }, 1400);
    return () => window.clearInterval(t);
  }, [state, devices, setDevices]);

  const rollback = () => {
    setDevices((ds) => ds.map((d) => (previous.current[d.id] ? { ...d, modelVersion: previous.current[d.id] ?? d.modelVersion } : d)));
    previous.current = {};
    setState('rolledback');
    setConfirmRollback(false);
    addEvent({ agentId: 'agt-atlas', title: `Rolled back ${LATEST}`, detail: 'Owner rolled back the model update on edge devices.', severity: 'warning' });
    toast(`Rolled back to the previous version`);
  };

  const ringStatus = (ring: Device['ring']) => {
    const ds = devices.filter((d) => d.ring === ring);
    const live = ds.filter((d) => d.health !== 'offline');
    const done = live.filter((d) => d.modelVersion === LATEST).length;
    return { total: ds.length, live: live.length, done, offline: ds.length - live.length };
  };

  const checks = [
    { label: 'Forecast accuracy on pilot stores', ok: updated >= 1, detail: updated >= 1 ? '91.2% (was 90.4%)' : 'Waiting for pilot' },
    { label: 'Response time', ok: updated >= 1, detail: updated >= 1 ? '0.9s median, within 1.5s limit' : 'Waiting for pilot' },
    { label: 'Error rate', ok: updated >= 2, detail: updated >= 2 ? '0.2%, within 1% limit' : 'Waiting for pilot' },
  ];
  const offline = devices.filter((d) => d.health === 'offline');

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-lg font-semibold">Model update rollout</h2>
          <p className="text-sm text-fg-muted">
            {LATEST}: better weather forecasting. Pilot stores first, then waves, with health checks between.
          </p>
        </div>
        <Badge tone={state === 'done' ? 'success' : state === 'running' ? 'cyan' : state === 'rolledback' ? 'warning' : 'neutral'} className="capitalize">
          {state === 'running' && <Loader2 className="animate-spin" />}
          {state === 'rolledback' ? 'Rolled back' : state}
        </Badge>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Rollout stages">
        {RINGS.map((r) => {
          const s = ringStatus(r.id);
          const pct = s.live ? (s.done / s.live) * 100 : 0;
          return (
            <li key={r.id} className="rounded-lg border border-line/10 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{r.label}</span>
                <span className="font-mono text-xs text-fg-subtle">
                  {s.done}/{s.live} updated
                </span>
              </div>
              <div className="mt-3">
                <Meter label={`${r.label} progress`} value={pct} tone="cyan" showValue={false} />
              </div>
              {s.offline > 0 && <p className="mt-2 text-xs text-warning">{s.offline} offline, will update when back</p>}
            </li>
          );
        })}
      </ol>

      <h3 className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">Health checks</h3>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            {c.ok ? <CheckCircle2 className="size-4 text-success" aria-label="passed" /> : <Loader2 className={cn('size-4 text-fg-subtle', state === 'running' && 'animate-spin')} aria-label="pending" />}
            <span>{c.label}</span>
            <span className="ml-auto font-mono text-xs text-fg-muted">{c.detail}</span>
          </li>
        ))}
        {offline.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <XCircle className="size-4 text-danger" aria-label="skipped" />
            <span>{d.storeName} is offline and was skipped</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {(state === 'idle' || state === 'paused' || state === 'rolledback') && (
          <Button variant="primary" onClick={() => setState('running')}>
            <Play /> {state === 'paused' ? 'Resume' : 'Start rollout'}
          </Button>
        )}
        {state === 'running' && (
          <Button variant="outline" onClick={() => setState('paused')}>
            <Pause /> Pause
          </Button>
        )}
        <Button variant="danger" onClick={() => setConfirmRollback(true)} disabled={Object.keys(previous.current).length === 0 && state !== 'done'}>
          <RotateCcw /> Roll back
        </Button>
      </div>

      <Dialog open={confirmRollback} onOpenChange={setConfirmRollback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roll back {LATEST}?</DialogTitle>
            <DialogDescription>Every updated device returns to its previous version within a minute. Agents keep working during the switch.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRollback(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={rollback}>
              Roll back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function DeployPage() {
  const mode = useUi((s) => s.deployMode);
  const setMode = useUi((s) => s.setDeployMode);
  const state = useApi((o) => api.listDevices(o));
  const devices = useDb((s) => s.devices);
  const [provision, setProvision] = useState(false);

  return (
    <Page wide>
      <PageHeader eyebrow="Deployment and edge" title="Where your agents run" description="Choose cloud, on-site devices, or both. Manage store devices and roll out updates safely." />

      <div role="radiogroup" aria-label="Deployment mode" className="mb-8 grid gap-4 md:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const on = mode === m.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.id)} className="text-left">
              <Card interactive glow={on} className={cn('h-full p-5', on && 'border-violet/50')}>
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-10 place-items-center rounded-md', on ? 'bg-violet/20 text-violet' : 'bg-line/5 text-fg-muted')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="font-display text-lg font-semibold">{m.title}</h2>
                  {on && <Badge tone="violet" className="ml-auto">Selected</Badge>}
                </div>
                <p className="mt-3 text-sm text-fg-muted">{m.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <ul className="space-y-1">
                    {m.pros.map((p) => (
                      <li key={p} className="flex gap-1.5">
                        <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-label="pro" /> {p}
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1">
                    {m.cons.map((c) => (
                      <li key={c} className="flex gap-1.5 text-fg-muted">
                        <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-label="con" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {mode === 'cloud' ? (
        <EmptyState icon={Cloud} title="Running fully in the cloud" description="No store devices needed. Switch to Edge or Hybrid to manage on-site devices." />
      ) : (
        <AsyncView state={state} loading={<LoadingState rows={3} />}>
          {() => (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="mr-auto font-display text-lg font-semibold">Store fleet</h2>
                  <Button variant="primary" size="sm" onClick={() => setProvision(true)}>
                    <Plus /> Provision device
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <caption className="sr-only">Edge devices by store</caption>
                    <thead className="text-left text-xs text-fg-subtle">
                      <tr>
                        <th className="pb-2 font-medium">Store</th>
                        <th className="pb-2 font-medium">Health</th>
                        <th className="pb-2 font-medium">Model</th>
                        <th className="pb-2 font-medium">CPU</th>
                        <th className="pb-2 font-medium">Last sync</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((d) => {
                        const h = HEALTH[d.health];
                        const Icon = h.icon;
                        return (
                          <tr key={d.id} className="border-t border-line/5">
                            <td className="py-3">
                              <div className="font-medium">{d.storeName}</div>
                              <div className="text-xs text-fg-subtle">
                                {d.city} · {RINGS.find((r) => r.id === d.ring)?.label}
                              </div>
                            </td>
                            <td>
                              <Badge tone={h.tone}>
                                <Icon /> {h.label}
                              </Badge>
                            </td>
                            <td>
                              <span className={cn('font-mono text-xs', d.modelVersion === LATEST ? 'text-success' : 'text-fg-muted')}>{d.modelVersion}</span>
                            </td>
                            <td className="w-28 pr-4">
                              <div className="h-1.5 overflow-hidden rounded-full bg-line/10" role="meter" aria-label={`CPU ${d.cpuPct}%`} aria-valuenow={d.cpuPct} aria-valuemin={0} aria-valuemax={100}>
                                <div className={cn('h-full rounded-full', d.cpuPct > 80 ? 'bg-warning' : 'bg-cyan')} style={{ width: `${d.cpuPct}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-fg-subtle">{d.cpuPct}%</span>
                            </td>
                            <td className="font-mono text-xs text-fg-muted">{fmt.ago(d.lastSync)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Rollout devices={devices} />
            </div>
          )}
        </AsyncView>
      )}
      <ProvisionDialog open={provision} onOpenChange={setProvision} />
    </Page>
  );
}
