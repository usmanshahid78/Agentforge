import type { Organization } from '@/types';
import { createOrganization, readDescription } from '@/lib/orgs';

/** Organizations already created in the back office, so its stats have something to show. */
const SEEDS: Array<{ id: string; createdBy: string; createdAt: string; description: string }> = [
  {
    id: 'org-thor',
    createdBy: 'Sara Ahmed',
    createdAt: '2026-10-28T09:12:00.000Z',
    description: `Thor is a CEO of a portfolio management company
under him there is an investment manager, fund manager, trader, audit; these are the agents
which will interact with each to actively invest in different portfolios to maximize the returns of multiple portfolios
within the regulatory limits
and create best of the returns from the investments through right trading in stock
I would need a dashboard, for each portfolio showing the return as a whole, than stock wise return
contribution of the return of every stock, in that portfolio and also a suggestion and recommendation by each
investment manager agent to identify the right trade of buy and sell
to maximize the return
furthermore, I would need inception to date
month on month
month to date
year to date
returns of the complete portfolio and each stock under it
show that in a graphical manner
also add the AI suggestions and recommendations based on all the above statistical data and portfolio
consider the regulations and compliance rules while suggesting`,
  },
  {
    id: 'org-freya',
    createdBy: 'Daniel Price',
    createdAt: '2026-09-15T14:40:00.000Z',
    description:
      'Freya is the managing director of a wealth management firm. Under her there are a fund manager, a research analyst, a risk manager and a trader. I want a dashboard with year to date and month to date returns for each portfolio, charts of the returns, and alerts when a portfolio is close to the regulatory limits.',
  },
  {
    id: 'org-lena',
    createdBy: 'Mei Lin',
    createdAt: '2026-08-21T10:05:00.000Z',
    description:
      'Lena is the founder of a grocery retail business with three stores. Under her there are an inventory planner, a marketing manager and a customer care agent. I need a dashboard of sales and stock-outs, alerts when stock runs low and weekly reports.',
  },
  {
    id: 'org-patel',
    createdBy: 'Omar Haddad',
    createdAt: '2026-07-03T08:30:00.000Z',
    description:
      'Dr Patel is the owner of a dental clinic. Under him there is a scheduler, a triage nurse and a compliance officer. We need fewer missed appointments for patients, reminders by SMS and a monthly report.',
  },
  {
    id: 'org-marco',
    createdBy: 'Mei Lin',
    createdAt: '2026-06-12T16:20:00.000Z',
    description:
      'Marco is the head of a courier company. His team has a dispatcher, a fleet manager and a customer care agent. I need on-time delivery stats, a forecast of next week’s parcels and alerts for late deliveries.',
  },
];

export const seedOrganizations = (): Organization[] =>
  SEEDS.map((s) => createOrganization(readDescription(s.description), { ...s, readBy: 'rules' }));
