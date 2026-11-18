import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, KeyRound, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Connector } from '@/types';
import { api } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { iconFor } from '@/lib/icons';
import { useDb } from '@/store/db';
import { sfx } from '@/lib/sound';
import { cn, fmt } from '@/lib/utils';

type Phase = 'auth' | 'authorising' | 'connecting' | 'success' | 'manage';

const KEY_PATTERN = /^[A-Za-z0-9_-]{24,}$/;

function SuccessMark() {
  return (
    <div className="relative mx-auto grid size-20 place-items-center">
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-success"
        initial={{ scale: 0.6, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute inset-0 rounded-full bg-success/15 shadow-[0_0_40px_rgb(var(--c-success)/0.5)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      />
      <svg viewBox="0 0 24 24" className="relative size-9 text-success" aria-hidden>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        />
      </svg>
    </div>
  );
}

const SAMPLE_VALUE: Record<string, string> = {
  transaction_id: 'TX-88213',
  sku: 'DRK-COLA-6',
  qty: '2',
  unit_price: '4.20',
  store_id: 'MAN-01',
  timestamp: '07:42:13',
  temp_c: '18.4',
  precip_mm: '0.0',
  condition: 'cloudy',
  wind_kph: '14',
  hour: '08',
  event_name: 'Farmers market',
  venue: 'Albert Sq.',
  distance_km: '0.8',
  expected_attendance: '3200',
  start: 'Sat 09:00',
};

export function ConnectDialog({ connector, onClose }: { connector: Connector | undefined; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('auth');
  const [key, setKey] = useState('');
  const [keyError, setKeyError] = useState<string>();
  const [fileFields, setFileFields] = useState<string[]>();
  const [fileName, setFileName] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const open = !!connector;

  useEffect(() => {
    if (!connector) return;
    setPhase(connector.status === 'connected' ? 'manage' : 'auth');
    setKey('');
    setKeyError(undefined);
    setFileFields(undefined);
    setFileName(undefined);
    // Reset only when a different connector opens; status refreshes mid-flow must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector?.id]);

  // Device pairing completes on its own after a short wait.
  useEffect(() => {
    if (connector?.auth !== 'device' || phase !== 'authorising') return;
    const t = window.setTimeout(() => void finish(), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, connector?.id]);

  if (!connector) return null;
  const Icon = iconFor(connector.icon);

  const finish = async () => {
    setPhase('connecting');
    useDb.getState().setConnectorStatus(connector.id, 'connecting');
    await api.connect(connector.id);
    setPhase('success');
    sfx('success');
    toast.success(`${connector.name} connected`);
  };

  const submitKey = (e: FormEvent) => {
    e.preventDefault();
    if (!KEY_PATTERN.test(key.trim())) {
      setKeyError('That key looks too short. Keys are at least 24 letters, numbers, dashes or underscores.');
      return;
    }
    setKeyError(undefined);
    void finish();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error('Please choose a .csv file');
      return;
    }
    const text = await file.slice(0, 4096).text();
    const header = text.split(/\r?\n/)[0] ?? '';
    setFileName(file.name);
    setFileFields(header.split(',').map((h) => h.trim()).filter(Boolean).slice(0, 12));
  };

  const disconnect = async () => {
    await api.disconnect(connector.id);
    toast(`${connector.name} disconnected`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-md border border-cyan/30 bg-cyan/10 text-cyan">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <DialogTitle>{phase === 'manage' ? connector.name : `Connect ${connector.name}`}</DialogTitle>
              <DialogDescription>{connector.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {phase === 'auth' && connector.auth === 'oauth' && (
          <div className="space-y-4">
            <ul className="space-y-2 rounded-md border border-line/10 p-3 text-sm">
              <li className="text-fg-muted">AgentForge will be able to:</li>
              {['Read ' + connector.sampleFields.slice(0, 3).join(', '), 'Sync every 15 minutes', 'Never change or delete your data'].map((p) => (
                <li key={p} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {p}
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setPhase('authorising');
                window.setTimeout(() => void finish(), 1600);
              }}
            >
              <ExternalLink /> Sign in and allow access
            </Button>
            <p className="text-center text-xs text-fg-subtle">Demo: no real sign-in window opens.</p>
          </div>
        )}

        {phase === 'auth' && connector.auth === 'api-key' && (
          <form onSubmit={submitKey} className="space-y-3" noValidate>
            <label htmlFor="api-key" className="text-sm font-medium">
              API key
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input
                id="api-key"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setKeyError(undefined);
                }}
                placeholder="nm_live_..."
                className={cn('pl-9 font-mono', keyError && 'border-danger/60')}
                aria-invalid={!!keyError}
                aria-describedby={keyError ? 'api-key-error' : 'api-key-hint'}
                autoComplete="off"
              />
            </div>
            {keyError ? (
              <p id="api-key-error" className="text-xs text-danger">
                {keyError}
              </p>
            ) : (
              <p id="api-key-hint" className="text-xs text-fg-subtle">
                Find it in your {connector.name} account under Settings, then API.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setKey(`nm_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`)}>
                Use demo key
              </Button>
              <Button type="submit" variant="primary" className="ml-auto">
                Verify and connect
              </Button>
            </div>
          </form>
        )}

        {phase === 'auth' && connector.auth === 'upload' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFile(e.dataTransfer.files[0]);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-line/20 px-4 py-8 text-sm text-fg-muted transition-colors hover:border-cyan/50 hover:text-fg"
            >
              <Upload className="size-6" aria-hidden />
              {fileName ?? 'Drop a CSV here, or click to choose'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Choose CSV file" />
            {fileFields && (
              <div>
                <p className="mb-1.5 text-xs text-fg-muted">Detected columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {fileFields.map((f) => (
                    <Badge key={f} className="font-mono">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFileName('nova-mart-sales-export.csv');
                  setFileFields(['date', 'store', 'sku', 'qty', 'revenue']);
                }}
              >
                Use sample file
              </Button>
              <Button variant="primary" className="ml-auto" disabled={!fileFields} onClick={() => void finish()}>
                Import
              </Button>
            </div>
          </div>
        )}

        {phase === 'auth' && connector.auth === 'device' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-fg-muted">On the sensor's setup screen, enter this pairing code:</p>
            <p className="font-mono text-3xl font-semibold tracking-[0.3em] text-gradient">NM-4827</p>
            <Button variant="primary" className="w-full" onClick={() => setPhase('authorising')}>
              I have entered the code
            </Button>
          </div>
        )}

        {(phase === 'authorising' || phase === 'connecting') && (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <Loader2 className="size-8 animate-spin text-violet" aria-hidden />
            <p className="font-medium">{phase === 'authorising' ? (connector.auth === 'device' ? 'Waiting for the device...' : 'Waiting for permission...') : 'Running first sync...'}</p>
            <p className="text-sm text-fg-muted">This usually takes a few seconds.</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="space-y-4 text-center">
            <SuccessMark />
            <div>
              <p className="font-display text-lg font-semibold">Connected</p>
              <p className="text-sm text-fg-muted">
                {connector.coverageDays ? `Found ${Math.round(connector.coverageDays / 30)} months of history.` : 'First sync complete.'}
              </p>
            </div>
            <SampleTable connector={connector} />
          </div>
        )}

        {phase === 'manage' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">
                <Check /> Connected
              </Badge>
              {connector.lastSync && <Badge>Synced {fmt.ago(connector.lastSync)}</Badge>}
            </div>
            <SampleTable connector={connector} />
          </div>
        )}

        <DialogFooter>
          {phase === 'manage' && (
            <Button variant="danger" onClick={() => void disconnect()} className="mr-auto">
              Disconnect
            </Button>
          )}
          {(phase === 'success' || phase === 'manage') && (
            <Button variant={phase === 'success' ? 'primary' : 'outline'} onClick={onClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SampleTable({ connector }: { connector: Connector }) {
  const fields = connector.sampleFields.slice(0, 4);
  return (
    <div className="overflow-x-auto rounded-md border border-line/10 text-left">
      <table className="w-full font-mono text-[11px]">
        <caption className="sr-only">Sample rows from {connector.name}</caption>
        <thead className="bg-line/5 text-fg-subtle">
          <tr>
            {fields.map((f) => (
              <th key={f} scope="col" className="px-2.5 py-1.5 font-medium">
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((r) => (
            <tr key={r} className="border-t border-line/5">
              {fields.map((f) => (
                <td key={f} className="px-2.5 py-1.5 text-fg-muted">
                  {SAMPLE_VALUE[f] ?? (r ? '…' : 'sample')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
