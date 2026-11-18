import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, FileText, LayoutDashboard, Network, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Organization } from '@/types';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/states';
import { KIND_LABEL, agentsOf, headOf } from '@/lib/orgs';
import { useOrgs } from '@/store/orgs';
import { InvestmentDashboard } from './InvestmentDashboard';
import { OpsDashboard } from './OpsDashboard';
import { shortDay } from './helpers';
import { MemberDot, OrgStatusBadge } from './shared';

type Tab = 'dashboard' | 'organization' | 'details';

function OrgChart({ org }: { org: Organization }) {
  const head = headOf(org);
  const agents = agentsOf(org);
  const nameOf = (id: string) => org.members.find((m) => m.id === id);
  return (
    <div className="space-y-6">
      {head && (
        <div className="flex justify-center">
          <Card className="flex w-full max-w-sm items-center gap-4 p-4">
            <MemberDot org={org} member={head} size="lg" />
            <div>
              <div className="font-display text-lg font-semibold">{head.name}</div>
              <div className="text-sm text-fg-muted">{head.role} · person</div>
              <p className="mt-1 text-xs text-fg-muted">{head.responsibility}</p>
            </div>
          </Card>
        </div>
      )}
      <div className="mx-auto h-6 w-px bg-line/20" aria-hidden />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={`Agents reporting to ${head?.name}`}>
        {agents.map((a) => (
          <li key={a.id}>
            <Card className="h-full p-4">
              <div className="flex items-center gap-3">
                <MemberDot org={org} member={a} />
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm text-fg-muted">{a.role} · AI agent</div>
                </div>
              </div>
              <p className="mt-3 text-sm">{a.responsibility}</p>
              <div className="mt-3 text-xs text-fg-muted">
                Reports to {head?.name}
                {a.talksTo.length > 0 && (
                  <>
                    {' '}
                    · works with {a.talksTo.map((id) => nameOf(id)?.name).filter(Boolean).join(', ')}
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Details({ org }: { org: Organization }) {
  const navigate = useNavigate();
  const remove = useOrgs((s) => s.remove);
  const head = headOf(org);
  const facts: Array<[string, string]> = [
    ['Created by', org.createdBy],
    ['Created', shortDay(org.createdAt)],
    ['Industry', `${KIND_LABEL[org.kind]} · ${org.industry}`],
    ['Headed by', `${head?.name} (${head?.role})`],
    ['AI agents', String(agentsOf(org).length)],
    ['Read by', org.readBy === 'model' ? 'Local model, checked by the rules' : 'Built-in rules'],
    ['Return periods', org.periods.join(', ') || '—'],
    ['ID', org.id],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-display font-semibold">Original description</h3>
          <p className="mb-3 text-sm text-fg-muted">Exactly as {org.createdBy} wrote it.</p>
          <blockquote className="whitespace-pre-wrap rounded-md border-l-2 border-violet/50 bg-line/5 p-4 text-sm leading-relaxed">{org.description}</blockquote>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold">What was asked for</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {org.requirements.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet" aria-hidden /> {r}
              </li>
            ))}
            {!org.requirements.length && <li className="text-fg-muted">Nothing specific.</li>}
          </ul>
        </Card>
      </div>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-display font-semibold">Mission</h3>
          <p className="mt-2 text-sm">{org.mission}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-5">
          <h3 className="font-display font-semibold">Regulatory and compliance rules</h3>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-sm">
            {org.compliance.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card>
        <Button
          variant="danger"
          onClick={() => {
            remove(org.id);
            toast(`${org.name} was removed`);
            navigate('/');
          }}
        >
          <Trash2 /> Remove organization
        </Button>
      </div>
    </div>
  );
}

export default function OrgPage() {
  const { id } = useParams();
  const org = useOrgs((s) => s.orgs.find((o) => o.id === id));
  const [params, setParams] = useSearchParams();
  // Held in state, seeded from ?tab= (see ProjectPage for why it is not derived from the URL).
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get('tab');
    return t === 'organization' || t === 'details' ? t : 'dashboard';
  });

  if (!org) {
    return (
      <Page>
        <EmptyState
          className="mt-16"
          title="Organization not found"
          description="It may have been removed, or the link is wrong."
          action={
            <Button variant="primary" asChild>
              <Link to="/">Back office</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const head = headOf(org);
  return (
    <Page wide>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 pt-2 text-sm text-fg-muted">
        <Link to="/" className="hover:text-fg">
          Back office
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-fg" aria-current="page">
          {org.name}
        </span>
      </nav>

      <header className="mb-4 mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          {head && <MemberDot org={org} member={head} size="lg" />}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold md:text-3xl">{org.name}</h1>
              <Badge tone="violet">{KIND_LABEL[org.kind]}</Badge>
              <OrgStatusBadge org={org} />
            </div>
            <p className="mt-1 max-w-3xl text-fg-muted">{org.mission}</p>
            <p className="mt-1 text-sm">
              Headed by <span className="font-semibold">{head?.name}</span> · {agentsOf(org).length} AI agents · created by {org.createdBy} on {shortDay(org.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/orgs/new">
            New organization <ArrowRight />
          </Link>
        </Button>
      </header>

      <Tabs<Tab>
        label="Organization views"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setParams({ tab: t }, { replace: true });
        }}
        tabs={[
          { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { value: 'organization', label: 'Organization', icon: Network, count: org.members.length },
          { value: 'details', label: 'Details', icon: FileText },
        ]}
        className="mb-6"
      />

      {tab === 'dashboard' && (org.kind === 'investment' ? <InvestmentDashboard org={org} /> : <OpsDashboard org={org} />)}
      {tab === 'organization' && <OrgChart org={org} />}
      {tab === 'details' && <Details org={org} />}
    </Page>
  );
}
