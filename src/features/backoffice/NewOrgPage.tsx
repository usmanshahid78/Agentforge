import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, ScrollText, ShieldCheck, Sparkles, Target, Users, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { reportFallback, useAi } from '@/ai';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/controls';
import { Input, Textarea } from '@/components/ui/input';
import { KIND_LABEL, createOrganization, readDescription, type OrgDraft } from '@/lib/orgs';
import { useOrgs } from '@/store/orgs';
import { readWithModel } from './ai';

const EXAMPLES = [
  {
    label: 'Portfolio management',
    text: 'Thor is a CEO of a portfolio management company. Under him there is an investment manager, fund manager, trader, audit; these are the agents which will interact with each other to actively invest in different portfolios to maximize the returns of multiple portfolios within the regulatory limits. I would need a dashboard for each portfolio showing the return as a whole, then stock-wise return and the contribution of every stock, and a buy and sell recommendation by each agent. I would need inception to date, month on month, month to date and year to date returns of the portfolio and each stock, shown in a graphical manner, plus AI suggestions based on the statistics. Consider the regulations and compliance rules while suggesting.',
  },
  {
    label: 'Bakery chain',
    text: 'Amira is the owner of a bakery business with four shops. Under her there are an inventory planner, a marketing manager and an accountant. I need a dashboard of daily sales, alerts when flour or butter runs low and a weekly report.',
  },
];

const NAME_KEY = 'agentforge-backoffice-creator';

function Section({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        <Icon className="size-3.5" aria-hidden /> {title}
      </h3>
      {children}
    </div>
  );
}

/** What the description was read as. Updates live while typing. */
function Preview({ draft, name }: { draft: OrgDraft; name: string }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold">{name || draft.name}</h2>
          <Badge tone="violet">{KIND_LABEL[draft.kind]}</Badge>
        </div>
        <p className="mt-1 text-sm text-fg-muted">{draft.industry}</p>
      </div>
      <Section icon={Target} title="Mission">
        <p className="text-sm">{draft.mission}</p>
      </Section>
      <Section icon={Users} title="People">
        <ul className="space-y-1.5 text-sm">
          <li>
            <span className="font-semibold">{draft.head.name}</span> <span className="text-fg-muted">· {draft.head.role} (person)</span>
          </li>
          {draft.agents.map((a) => (
            <li key={a.role} className="border-l-2 border-line/10 pl-3">
              <span className="font-medium">{a.role}</span> <span className="text-fg-muted">· AI agent</span>
              <p className="text-xs text-fg-muted">{a.responsibility}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section icon={ScrollText} title="Asked for">
        {draft.requirements.length ? (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {draft.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Nothing specific yet. Say what you want to see, e.g. “I need a dashboard of …”.</p>
        )}
        {draft.periods.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.periods.map((p) => (
              <Badge key={p} tone="cyan">
                {p}
              </Badge>
            ))}
          </div>
        )}
      </Section>
      <Section icon={ShieldCheck} title="Rules the agents keep">
        <ul className="list-disc space-y-1 pl-4 text-sm text-fg-muted">
          {draft.compliance.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export default function NewOrgPage() {
  const navigate = useNavigate();
  const add = useOrgs((s) => s.add);
  const provider = useAi((s) => s.provider);
  const model = useAi((s) => s.model);
  const [creator, setCreator] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useModel, setUseModel] = useState(provider === 'local');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const draft = useMemo(() => readDescription(description), [description]);
  const ready = description.trim().length >= 20 && creator.trim().length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    localStorage.setItem(NAME_KEY, creator.trim());
    let final = draft;
    let readBy: 'model' | 'rules' = 'rules';
    if (useModel && provider === 'local') {
      setBusy(true);
      abort.current = new AbortController();
      try {
        const read = await readWithModel(description, draft, abort.current.signal);
        if (read) {
          final = read;
          readBy = 'model';
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setBusy(false);
          return;
        }
        reportFallback(err);
      }
      setBusy(false);
    }
    const org = createOrganization(name.trim() ? { ...final, name: name.trim() } : final, { description, createdBy: creator, readBy });
    add(org);
    toast.success(`${org.name} is set up`, { description: `${org.members.length - 1} agents report to ${org.members[0]?.name}.` });
    navigate(`/orgs/${org.id}`);
  };

  return (
    <Page wide>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 pt-2 text-sm text-fg-muted">
        <Link to="/" className="hover:text-fg">
          Back office
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-fg" aria-current="page">
          New organization
        </span>
      </nav>
      <PageHeader
        title="Describe the organization"
        description="Say who heads it, which agents work under them, what they should achieve and what you want to see. It is set up from your words."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Your name</span>
                <Input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Who is creating this" required />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">
                  Organization name <span className="font-normal text-fg-subtle">(optional)</span>
                </span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={draft.name} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Description</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-72 font-normal leading-relaxed"
                placeholder="e.g. Thor is the CEO of a portfolio management company. Under him there is an investment manager, a fund manager, a trader and an auditor…"
                required
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-fg-muted">Try an example:</span>
              {EXAMPLES.map((ex) => (
                <Button key={ex.label} type="button" size="sm" variant="outline" onClick={() => setDescription(ex.text)}>
                  {ex.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-md border border-line/10 bg-line/5 p-3">
              <Switch checked={useModel && provider === 'local'} onChange={setUseModel} label="Let the local model read the description" disabled={provider !== 'local'} />
              <div className="text-sm">
                <div className="font-medium">Let the local model read it</div>
                <div className="text-xs text-fg-muted">
                  {provider === 'local'
                    ? `${model} improves the wording of the mission, duties and requests. Rules and numbers stay rule-based. Can take a minute on a CPU.`
                    : 'Scripted replies are selected in Settings > AI model, so the built-in rules read it.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={!ready || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? 'Reading the description…' : 'Create organization'}
              </Button>
              {busy && (
                <Button type="button" variant="ghost" onClick={() => abort.current?.abort()}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <aside aria-label="What was understood">
          <Card className="sticky top-20 p-5">
            <p className="mb-4 flex items-center gap-1.5 text-xs text-fg-muted">
              <Sparkles className="size-3.5 text-violet" aria-hidden /> What we understood so far
            </p>
            {description.trim() ? <Preview draft={draft} name={name.trim()} /> : <p className="py-8 text-center text-sm text-fg-muted">Start typing, or pick an example. The organization appears here as you write.</p>}
          </Card>
        </aside>
      </div>
    </Page>
  );
}
