import {
  Briefcase,
  Building2,
  Landmark,
  Cpu,
  FlaskConical,
  Hammer,
  LayoutGrid,
  MessagesSquare,
  Newspaper,
  Plug,
  Radar,
  Settings,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Shown in the mobile bottom tab bar. */
  mobile?: boolean;
  /** Extra search terms for the command palette. */
  keywords?: string[];
  /** Sidebar section the item is listed under. */
  group?: NavGroup;
}

export type NavGroup = 'workspace' | 'build' | 'operate';

export const NAV_GROUPS: { id: NavGroup; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'build', label: 'Build' },
  { id: 'operate', label: 'Operate' },
];

export const NAV_PRIMARY: NavItem[] = [
  { to: '/chat', group: 'workspace', label: 'AI Chat', icon: MessagesSquare, description: 'Chat with your local AI model', mobile: true, keywords: ['chatbot', 'ollama', 'qwen', 'llama', 'assistant'] },
  { to: '/', group: 'workspace', label: 'Back office', icon: Landmark, description: 'Organizations people create, and their stats', mobile: true, keywords: ['home', 'organizations', 'orgs', 'stats', 'admin', 'create organization', 'dashboard'] },
  { to: '/portfolio', group: 'workspace', label: 'Portfolio', icon: Briefcase, description: 'Industries and use cases', keywords: ['home', 'industries', 'projects', 'use cases', 'canvas'] },
  { to: '/mission', group: 'workspace', label: 'Mission control', icon: LayoutGrid, description: 'Company overview and quick build', keywords: ['dashboard', 'overview'] },
  { to: '/build', group: 'build', label: 'Build', icon: Hammer, description: 'Create an agent by chatting', mobile: true, keywords: ['interview', 'create', 'jd'] },
  { to: '/company', group: 'build', label: 'Company', icon: Building2, description: 'Org chart of your AI team', mobile: true, keywords: ['org', 'departments', 'team'] },
  { to: '/observe', group: 'operate', label: 'Observe', icon: Radar, description: 'Activity, approvals, costs, traces', mobile: true, keywords: ['approvals', 'cost', 'traces', 'alerts'] },
  { to: '/connect', group: 'operate', label: 'Data sources', icon: Plug, description: 'Connect your business data', keywords: ['connectors', 'integrations', 'pos', 'weather'] },
  { to: '/test', group: 'operate', label: 'Test lab', icon: FlaskConical, description: 'Backtest agents on past data', keywords: ['backtest', 'accuracy', 'shadow'] },
  { to: '/outputs', group: 'operate', label: 'Briefings', icon: Newspaper, description: 'Daily briefings and delivery', keywords: ['outputs', 'reports', 'schedule'] },
  { to: '/avatars', group: 'build', label: 'Avatar studio', icon: Sparkles, description: 'Faces, voices and personalities', keywords: ['voice', 'personality', 'kiosk'] },
  { to: '/templates', group: 'build', label: 'Marketplace', icon: Store, description: 'Hire from role templates', keywords: ['templates', 'hire', 'roles'] },
  { to: '/deploy', group: 'operate', label: 'Deploy', icon: Cpu, description: 'Cloud, edge devices and rollouts', keywords: ['edge', 'devices', 'rollout'] },
];

export const NAV_SECONDARY: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings, description: 'Profile, team, billing, privacy', mobile: true, keywords: ['theme', 'billing', 'api keys'] },
];

export const ALL_NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];
