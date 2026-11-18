import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Circle, Dices, MonitorSmartphone, Play, Save, Smile, Square, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { Agent, AvatarConfig, AvatarKind, CharacterAvatarConfig, Personality, VoiceConfig } from '@/types';
import { Avatar, type AvatarState } from '@/components/avatar/Avatar';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented, Slider, Switch, Tabs } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';
import { useDb } from '@/store/db';
import {
  ACCESSORIES,
  CHARACTER_PRESETS,
  FACE_SHAPES,
  GLOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  OUTFITS,
  SKIN_TONES,
  randomCharacter,
} from '@/lib/avatarPresets';
import { accentColor, departmentById } from '@/lib/departments';
import { sampleReply } from '@/lib/personality';
import { canSpeak, useSpeaker, useVoices } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { KioskMode } from './KioskMode';

type Panel = 'look' | 'voice' | 'personality' | 'usage';

interface Draft {
  avatar: AvatarConfig;
  voice: VoiceConfig;
  personality: Personality;
}

const STATES: AvatarState[] = ['idle', 'listening', 'thinking', 'speaking', 'alert'];

function Swatches({ label, colors, value, onChange }: { label: string; colors: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={cn('size-8 rounded-full border-2 transition-transform hover:scale-110', value === c ? 'border-fg' : 'border-transparent')}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
              value === o ? 'border-violet/60 bg-violet/15 text-fg' : 'border-line/10 text-fg-muted hover:text-fg',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

export default function AvatarsPage() {
  const agents = useDb((s) => s.agents);
  const updateAgent = useDb((s) => s.updateAgent);
  const [params] = useSearchParams();
  const [agentId, setAgentId] = useState(params.get('agent') ?? agents[0]?.id);
  const agent = agents.find((a) => a.id === agentId) ?? agents[0];
  const [draft, setDraft] = useState<Draft>();
  const [panel, setPanel] = useState<Panel>('look');
  const [previewState, setPreviewState] = useState<AvatarState>('idle');
  const [kiosk, setKiosk] = useState(false);
  const speaker = useSpeaker();
  const voices = useVoices();

  useEffect(() => {
    if (agent) setDraft({ avatar: structuredClone(agent.avatar), voice: { ...agent.voice }, personality: { ...agent.personality } });
    speaker.stop();
    // Reset the draft only when switching agents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  const sorted = useMemo(
    () => [...voices].sort((a, b) => Number(b.lang.startsWith('en')) - Number(a.lang.startsWith('en')) || a.name.localeCompare(b.name)),
    [voices],
  );

  if (!agent || !draft) {
    return (
      <Page>
        <PageHeader eyebrow="Avatar studio" title="Give your agents a face" />
        <EmptyState icon={UserRound} title="No agents yet" description="Hire your first agent to design its avatar." />
      </Page>
    );
  }

  const preview: Agent = { ...agent, avatar: draft.avatar, voice: draft.voice, personality: draft.personality };
  const dirty = JSON.stringify({ a: agent.avatar, v: agent.voice, p: agent.personality }) !== JSON.stringify({ a: draft.avatar, v: draft.voice, p: draft.personality });
  const dept = departmentById(agent.departmentId);
  const sample = sampleReply(draft.personality, agent.name);
  const usage = draft.avatar.usage ?? { badge: true, companion: true, presenter: agent.id === 'agt-atlas' };
  const shownState: AvatarState = speaker.speaking ? 'speaking' : previewState;

  const setAvatar = (patch: Partial<AvatarConfig>) => setDraft((d) => d && { ...d, avatar: { ...d.avatar, ...patch } });
  const setChar = (patch: Partial<CharacterAvatarConfig>) =>
    setAvatar({ character: { ...(draft.avatar.character ?? CHARACTER_PRESETS.analyst), ...patch } });
  const setKind = (kind: AvatarKind) =>
    setAvatar({ kind, character: kind === 'character' ? draft.avatar.character ?? CHARACTER_PRESETS.analyst : draft.avatar.character });

  const save = () => {
    updateAgent(agent.id, { avatar: draft.avatar, voice: draft.voice, personality: draft.personality });
    toast.success(`${agent.name}'s avatar saved`);
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow="Avatar studio"
        title="Give your agents a face"
        description="Choose how each agent looks, sounds and talks. The same avatar appears everywhere in your company."
        actions={
          <>
            <Button variant="outline" onClick={() => setKiosk(true)}>
              <MonitorSmartphone /> Kiosk mode
            </Button>
            <Button variant="primary" onClick={save} disabled={!dirty}>
              <Save /> {dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      <div className="scrollbar-thin mb-6 flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Choose agent">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={a.id === agent.id}
            onClick={() => setAgentId(a.id)}
            className={cn(
              'glass flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-sm transition-colors',
              a.id === agent.id ? 'border-violet/50 bg-violet/10' : 'hover:border-line/20',
            )}
          >
            <Avatar agent={a} size="sm" />
            <span className="font-medium">{a.name}</span>
            <span className="hidden text-fg-subtle sm:inline">{a.role}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <Card className="relative flex flex-col items-center overflow-hidden p-6 md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-2/3 opacity-60"
            style={{ background: `radial-gradient(ellipse at 50% 30%, ${accentColor(dept?.accent ?? 'violet', 0.25)}, transparent 70%)` }}
          />
          <Segmented<AvatarKind>
            label="Avatar tier"
            value={draft.avatar.kind}
            onChange={setKind}
            options={[
              { value: 'orb', label: 'Orb', icon: Circle },
              { value: 'character', label: 'Character', icon: Smile },
              { value: 'model3d', label: '3D', icon: Box },
            ]}
          />
          <div className="relative my-10 grid place-items-center">
            <Avatar agent={preview} size="2xl" state={shownState} level={speaker.level} allow3d />
          </div>
          <p className="min-h-12 max-w-lg text-center text-sm text-fg-muted" aria-live="polite">
            {speaker.speaking ? speaker.caption : `${agent.name} · ${agent.role} · ${dept?.name}`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Preview state">
            {STATES.map((s) => (
              <Button key={s} size="sm" variant={previewState === s ? 'outline' : 'ghost'} aria-pressed={previewState === s} onClick={() => setPreviewState(s)} className="capitalize">
                {s}
              </Button>
            ))}
          </div>
          <Button variant="primary" className="mt-4" onClick={() => (speaker.speaking ? speaker.stop() : speaker.speak(sample, draft.voice))}>
            {speaker.speaking ? <Square /> : <Play />} {speaker.speaking ? 'Stop' : 'Preview voice'}
          </Button>
          {!canSpeak() && <p className="mt-2 text-xs text-fg-subtle">Speech is not available in this browser; captions still play.</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-6 border-t border-line/5 pt-5">
            {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5">
                <Avatar agent={preview} size={s} showStatus />
                <span className="font-mono text-[10px] text-fg-subtle">{s}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <Tabs<Panel>
            label="Studio panels"
            value={panel}
            onChange={setPanel}
            tabs={[
              { value: 'look', label: 'Look' },
              { value: 'voice', label: 'Voice' },
              { value: 'personality', label: 'Personality' },
              { value: 'usage', label: 'Usage' },
            ]}
            className="mb-5"
          />

          {panel === 'look' && draft.avatar.kind === 'orb' && (
            <Section>
              <p className="text-sm text-fg-muted">
                Orbs take their colour and shape from the department. {agent.name} works in <strong className="text-fg">{dept?.name}</strong>, so it gets the{' '}
                {dept?.accent} glow and the {dept?.key === 'operations' ? 'round' : dept?.key === 'sales' ? 'squircle' : dept?.key === 'customer-care' ? 'soft blob' : 'tile'} shape.
              </p>
              <ul className="space-y-2 text-sm">
                <li><Badge>Idle</Badge> slow breathing</li>
                <li><Badge tone="cyan">Listening</Badge> ripples outward</li>
                <li><Badge tone="violet">Thinking</Badge> inner swirl</li>
                <li><Badge tone="magenta">Speaking</Badge> pulses with the voice</li>
                <li><Badge tone="warning">Alert</Badge> amber flash</li>
              </ul>
            </Section>
          )}

          {panel === 'look' && draft.avatar.kind === 'character' && draft.avatar.character && (
            <Section>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHARACTER_PRESETS) as Array<keyof typeof CHARACTER_PRESETS>).map((k) => (
                  <Button key={k} size="sm" variant="outline" className="capitalize" onClick={() => setAvatar({ character: CHARACTER_PRESETS[k] })}>
                    {k}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setAvatar({ character: randomCharacter() })}>
                  <Dices /> Randomise
                </Button>
              </div>
              <Chips label="Face shape" options={FACE_SHAPES} value={draft.avatar.character.faceShape} onChange={(v) => setChar({ faceShape: v })} />
              <Swatches label="Skin" colors={SKIN_TONES} value={draft.avatar.character.skinTone} onChange={(v) => setChar({ skinTone: v })} />
              <Chips label="Hair" options={HAIR_STYLES} value={draft.avatar.character.hairStyle} onChange={(v) => setChar({ hairStyle: v })} />
              <Swatches label="Hair colour" colors={HAIR_COLORS} value={draft.avatar.character.hairColor} onChange={(v) => setChar({ hairColor: v })} />
              <Chips label="Outfit" options={OUTFITS} value={draft.avatar.character.outfit} onChange={(v) => setChar({ outfit: v })} />
              <Swatches label="Outfit colour" colors={OUTFIT_COLORS} value={draft.avatar.character.outfitColor} onChange={(v) => setChar({ outfitColor: v })} />
              <Chips label="Accessory" options={ACCESSORIES} value={draft.avatar.character.accessory} onChange={(v) => setChar({ accessory: v })} />
              <Chips label="Background glow" options={GLOWS} value={draft.avatar.character.glow} onChange={(v) => setChar({ glow: v })} />
            </Section>
          )}

          {panel === 'look' && draft.avatar.kind === 'model3d' && (
            <Section>
              <p className="text-sm text-fg-muted">
                The 3D stage shows a placeholder head that follows your pointer and lip-syncs. To use your own model, put a VRM or GLB file in <code className="font-mono text-xs">public/models/</code> and enter its path.
              </p>
              <div>
                <label htmlFor="model-url" className="mb-1.5 block text-sm font-medium">
                  Model URL
                </label>
                <Input id="model-url" placeholder="/models/atlas.vrm" value={draft.avatar.modelUrl ?? ''} onChange={(e) => setAvatar({ modelUrl: e.target.value || undefined })} className="font-mono" />
                <p className="mt-1.5 text-xs text-fg-subtle">If the file cannot be loaded, the placeholder head is shown instead.</p>
              </div>
            </Section>
          )}

          {panel === 'voice' && (
            <Section>
              <div>
                <label htmlFor="voice-select" className="mb-1.5 block text-sm font-medium">
                  Voice
                </label>
                <select
                  id="voice-select"
                  value={draft.voice.voiceURI ?? ''}
                  onChange={(e) => setDraft((d) => d && { ...d, voice: { ...d.voice, voiceURI: e.target.value || undefined } })}
                  className="h-10 w-full rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg"
                >
                  <option value="">Browser default</option>
                  {sorted.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                {sorted.length === 0 && <p className="mt-1.5 text-xs text-fg-subtle">No system voices found. The browser default will be used.</p>}
              </div>
              <Slider label="Pitch" min={0.5} max={2} step={0.05} value={draft.voice.pitch} onChange={(v) => setDraft((d) => d && { ...d, voice: { ...d.voice, pitch: v } })} format={(v) => v.toFixed(2)} leftLabel="Lower" rightLabel="Higher" />
              <Slider label="Speed" min={0.5} max={2} step={0.05} value={draft.voice.rate} onChange={(v) => setDraft((d) => d && { ...d, voice: { ...d.voice, rate: v } })} format={(v) => `${v.toFixed(2)}x`} leftLabel="Slower" rightLabel="Faster" />
              <Button variant="outline" onClick={() => speaker.speak(`Hi, I'm ${agent.name}. This is how I'll sound in your briefings.`, draft.voice)}>
                <Play /> Preview voice
              </Button>
            </Section>
          )}

          {panel === 'personality' && (
            <Section>
              <Slider label="Tone" value={draft.personality.warmth} onChange={(v) => setDraft((d) => d && { ...d, personality: { ...d.personality, warmth: v } })} leftLabel="Formal" rightLabel="Friendly" />
              <Slider label="Detail" value={draft.personality.verbosity} onChange={(v) => setDraft((d) => d && { ...d, personality: { ...d.personality, verbosity: v } })} leftLabel="Concise" rightLabel="Detailed" />
              <Slider label="Confidence" value={draft.personality.boldness} onChange={(v) => setDraft((d) => d && { ...d, personality: { ...d.personality, boldness: v } })} leftLabel="Cautious" rightLabel="Bold" />
              <div className="rounded-lg border border-violet/20 bg-violet/[0.06] p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-violet">Sample reply</p>
                <p className="text-sm leading-relaxed" aria-live="polite">
                  {sample}
                </p>
              </div>
            </Section>
          )}

          {panel === 'usage' && (
            <Section>
              {(
                [
                  ['badge', 'Dashboard badge', 'Small avatar next to activity and approvals'],
                  ['companion', 'Chat companion', 'Appears when you talk to the agent'],
                  ['presenter', 'Briefing presenter', 'Reads the daily briefing aloud'],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-fg-subtle">{hint}</div>
                  </div>
                  <Switch label={label} checked={usage[key]} onChange={(v) => setAvatar({ usage: { ...usage, [key]: v } })} />
                </div>
              ))}
              <div className="rounded-lg border border-line/10 p-4">
                <div className="text-sm font-medium">Kiosk mode</div>
                <p className="mb-3 text-xs text-fg-subtle">Full-screen greeting for in-store tablets. Customers tap the avatar to hear it.</p>
                <Button variant="outline" size="sm" onClick={() => setKiosk(true)}>
                  <MonitorSmartphone /> Launch kiosk
                </Button>
              </div>
            </Section>
          )}
        </Card>
      </div>

      {kiosk && <KioskMode agent={preview} onExit={() => setKiosk(false)} />}
    </Page>
  );
}
