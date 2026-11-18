import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Search, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import type { DepartmentKey, RoleTemplate } from '@/types';
import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Page, PageHeader } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { AsyncView, EmptyState, LoadingState } from '@/components/ui/states';
import { FEATURED_PACK } from '@/mocks';
import { useDb } from '@/store/db';
import { departmentByKey } from '@/lib/departments';
import { hireTemplate } from '@/lib/hire';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useApi } from '@/lib/useApi';
import { fmt } from '@/lib/utils';
import { TemplateCard } from './TemplateCard';

type Sort = 'popular' | 'rating' | 'price';
type DeptFilter = 'all' | DepartmentKey;

const DEPT_ORDER: DepartmentKey[] = ['operations', 'sales', 'customer-care', 'finance'];
const DEPT_ID: Record<string, string> = { operations: 'dep-ops', sales: 'dep-sales', 'customer-care': 'dep-care', finance: 'dep-fin' };

function FeaturedPack({ templates }: { templates: RoleTemplate[] }) {
  const navigate = useNavigate();
  const agents = useDb((s) => s.agents);
  const pack = FEATURED_PACK.templateIds.map((id) => templates.find((t) => t.id === id)).filter((t): t is RoleTemplate => !!t);
  const missing = pack.filter((t) => !agents.some((a) => a.role === t.title || a.jd.title === t.title));
  const full = pack.reduce((s, t) => s + t.pricePerMonth, 0);

  const hireAll = () => {
    const hired = missing.map((t) => hireTemplate(t));
    toast.success(`${hired.length} agents joined your company`, { description: hired.map((a) => a.name).join(', ') });
    navigate('/company');
  };

  return (
    <Card glow className="relative mb-8 overflow-hidden p-6 md:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-magenta">
            <Package className="size-3.5" aria-hidden /> Featured pack
          </p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{FEATURED_PACK.title}</h2>
          <p className="mt-2 max-w-xl text-fg-muted">
            Four agents that already know how to work together: forecasts flow from the Environment Analyst to stock and promotions, while support keeps customers happy.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {pack.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-full border border-line/10 bg-surface/40 py-1 pl-1 pr-3 text-sm">
                <Avatar agent={{ name: t.title, departmentId: DEPT_ID[t.department] ?? 'dep-ops', status: 'idle' }} size="sm" />
                {t.title}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold">{fmt.money(FEATURED_PACK.pricePerMonth)}</span>
            <span className="text-sm text-fg-subtle">/month</span>
          </div>
          <span className="text-sm text-fg-muted line-through">{fmt.money(full)} separately</span>
          <Button variant="primary" size="lg" onClick={hireAll} disabled={missing.length === 0}>
            {missing.length === 0 ? 'All four are on your team' : missing.length === pack.length ? 'Hire all four' : `Hire the remaining ${missing.length}`}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function TemplatesPage() {
  const state = useApi((o) => api.listTemplates(o));
  const [q, setQ] = useState('');
  const [dept, setDept] = useState<DeptFilter>('all');
  const [sort, setSort] = useState<Sort>('popular');

  const filtered = useMemo(() => {
    const list = (state.data ?? []).filter(
      (t) => (dept === 'all' || t.department === dept) && `${t.title} ${t.summary} ${t.kpis.join(' ')}`.toLowerCase().includes(q.toLowerCase()),
    );
    return list.sort((a, b) => (sort === 'rating' ? b.rating - a.rating : sort === 'price' ? a.pricePerMonth - b.pricePerMonth : b.hires - a.hires));
  }, [state.data, q, dept, sort]);

  const groups = dept === 'all' ? DEPT_ORDER.map((d) => ({ d, items: filtered.filter((t) => t.department === d) })).filter((g) => g.items.length) : [{ d: dept, items: filtered }];

  return (
    <Page>
      <PageHeader eyebrow="Marketplace" title="Hire from templates" description="Ready-made roles with the data they need, the KPIs they own, and what they cost." />
      <AsyncView state={state} loading={<LoadingState rows={6} />}>
        {(templates) => (
          <>
            <FeaturedPack templates={templates} />
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end">
              <Tabs<DeptFilter>
                label="Filter by department"
                value={dept}
                onChange={setDept}
                className="flex-1"
                tabs={[
                  { value: 'all', label: 'All', count: templates.length },
                  ...DEPT_ORDER.map((d) => ({ value: d, label: departmentByKey(d)?.name ?? d, count: templates.filter((t) => t.department === d).length })),
                ]}
              />
              <div className="flex gap-2">
                <div className="relative flex-1 lg:w-60">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roles" className="pl-9" aria-label="Search roles" />
                </div>
                <label className="sr-only" htmlFor="tpl-sort">
                  Sort by
                </label>
                <select id="tpl-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg">
                  <option value="popular">Most hired</option>
                  <option value="rating">Top rated</option>
                  <option value="price">Lowest price</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={SearchX} title="No roles match" description="Try a different search, or write your own job description in the builder." action={<Button variant="outline" onClick={() => { setQ(''); setDept('all'); }}>Clear filters</Button>} />
            ) : (
              groups.map((g) => (
                <section key={g.d} className="mb-10" aria-labelledby={`grp-${g.d}`}>
                  <h2 id={`grp-${g.d}`} className="mb-4 text-lg font-semibold">
                    {departmentByKey(g.d)?.name ?? g.d}
                  </h2>
                  <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((t) => (
                      <motion.div key={t.id} variants={staggerItem}>
                        <TemplateCard template={t} />
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              ))
            )}
          </>
        )}
      </AsyncView>
    </Page>
  );
}
