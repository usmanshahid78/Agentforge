/**
 * Domain model for AgentForge. These types are the contract between the UI
 * and the data layer (src/api). When a real backend arrives, keep these
 * shapes stable and only swap the implementations in src/api.
 */

export type ID = string;
export type ISODate = string;

export type ThemeMode = 'dark' | 'light';

export interface Owner {
  id: ID;
  name: string;
  email: string;
  initials: string;
  role: 'Owner' | 'Admin' | 'Manager' | 'Viewer';
}

export interface Business {
  id: ID;
  name: string;
  industry: string;
  location: string;
  stores: number;
  currency: 'USD' | 'GBP' | 'EUR';
}

export type DepartmentKey = 'operations' | 'sales' | 'customer-care' | 'finance' | (string & {});

export interface Department {
  id: ID;
  key: DepartmentKey;
  name: string;
  description: string;
  /** Token colour name used by avatars and chips. */
  accent: 'violet' | 'cyan' | 'magenta' | 'warning';
  headAgentId?: ID;
}

/** Trust ladder, ordered from least to most autonomous. */
export type TrustLevel = 'shadow' | 'approval' | 'limited' | 'trusted';

export type AgentStatus = 'working' | 'idle' | 'paused' | 'error' | 'draft';

export type AgentMode = 'company' | 'builder';

export type AvatarKind = 'orb' | 'character' | 'model3d';

export interface CharacterAvatarConfig {
  faceShape: 'oval' | 'round' | 'square' | 'heart';
  skinTone: string;
  hairStyle: 'short' | 'long' | 'bun' | 'buzz' | 'curly' | 'none';
  hairColor: string;
  outfit: 'blazer' | 'hoodie' | 'shirt' | 'turtleneck';
  outfitColor: string;
  accessory: 'none' | 'glasses' | 'headset' | 'earring';
  glow: 'violet' | 'cyan' | 'magenta';
}

export interface AvatarConfig {
  kind: AvatarKind;
  character?: CharacterAvatarConfig;
  /** URL of a VRM/GLB model for the 3D tier. */
  modelUrl?: string;
  /** Where this avatar appears. */
  usage?: { badge: boolean; companion: boolean; presenter: boolean };
}

export interface VoiceConfig {
  voiceURI?: string;
  pitch: number; // 0–2
  rate: number; // 0.5–2
}

export interface Personality {
  /** 0 = formal, 100 = friendly */
  warmth: number;
  /** 0 = concise, 100 = detailed */
  verbosity: number;
  /** 0 = cautious, 100 = bold */
  boldness: number;
}

export interface KPI {
  id: ID;
  label: string;
  target: string;
  current: string;
  trend: number[]; // sparkline points
  direction: 'up-good' | 'down-good';
}

export interface JobDescription {
  title: string;
  department: DepartmentKey;
  mission: string;
  responsibilities: string[];
  inputs: string[];
  outputs: string[];
  schedule: string;
  kpis: string[];
  canDecideAlone: string[];
  needsApproval: string[];
  spendingCapPerDay: number;
  escalation: string[];
}

export interface AgentPermissions {
  spendingCapPerDay: number;
  allowedActions: string[];
  blockedActions: string[];
}

export interface Agent {
  id: ID;
  name: string;
  role: string;
  departmentId: ID;
  mode: AgentMode;
  status: AgentStatus;
  trust: TrustLevel;
  hiredAt: ISODate;
  costPerDay: number;
  valuePerDay: number;
  avatar: AvatarConfig;
  voice: VoiceConfig;
  personality: Personality;
  jd: JobDescription;
  permissions: AgentPermissions;
  connectorIds: ID[];
  kpis: KPI[];
  /** Agent ids this agent hands work to. */
  handoffsTo: ID[];
  model: string;
  temperature: number;
  systemPrompt?: string;
  /** Tool ids enabled in builder mode. */
  tools?: string[];
}

export type ConnectorStatus = 'not-connected' | 'connecting' | 'connected' | 'needs-attention';

export type ConnectorCategory = 'sales' | 'web' | 'environment' | 'market' | 'files' | 'messaging' | 'sensors';

export type ConnectorAuth = 'oauth' | 'api-key' | 'upload' | 'device';

export interface Connector {
  id: ID;
  key: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  auth: ConnectorAuth;
  status: ConnectorStatus;
  lastSync?: ISODate;
  sampleFields: string[];
  /** Lucide icon name; resolved in the UI. */
  icon: string;
  coverageDays?: number;
  issues?: string[];
}

export interface ReadinessFinding {
  id: ID;
  connectorId: ID;
  severity: 'good' | 'info' | 'warning';
  text: string;
}

export interface ReadinessReport {
  score: number; // 0–100
  findings: ReadinessFinding[];
  limitsAccuracy: boolean;
}

export interface DailyMetric {
  date: ISODate; // yyyy-mm-dd
  sales: number;
  footfall: number;
  tempC: number;
  rainMm: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';
  event?: string;
  /** Gaps are represented as null sales for honest readiness checks. */
  salesMissing?: boolean;
}

export type Severity = 'info' | 'success' | 'warning' | 'critical';

export interface ActivityEvent {
  id: ID;
  agentId: ID;
  at: ISODate;
  title: string;
  detail: string;
  severity: Severity;
  traceId?: ID;
}

export interface ApprovalRequest {
  id: ID;
  agentId: ID;
  createdAt: ISODate;
  action: string;
  reasoning: string;
  expectedImpact: string;
  impactValue: number;
  risk: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  traceId?: ID;
}

export type TraceStepKind = 'think' | 'tool' | 'data' | 'decision' | 'handoff' | 'error';

export interface TraceStep {
  id: ID;
  kind: TraceStepKind;
  label: string;
  detail: string;
  latencyMs: number;
  tokens?: number;
  tool?: string;
  input?: string;
  output?: string;
}

export interface Trace {
  id: ID;
  agentId: ID;
  startedAt: ISODate;
  summary: string;
  steps: TraceStep[];
  totalTokens: number;
  totalLatencyMs: number;
  costUsd: number;
}

export interface ReviewReport {
  id: ID;
  agentId: ID;
  month: string; // e.g. "2026-09"
  score: number; // 0–100
  strengths: string[];
  issues: string[];
  suggestedJdChanges: string[];
  recommendation: 'keep' | 'promote' | 'retrain' | 'retire';
}

export type DeviceHealth = 'healthy' | 'degraded' | 'offline';

export interface Device {
  id: ID;
  storeName: string;
  city: string;
  health: DeviceHealth;
  modelVersion: string;
  lastSync: ISODate;
  cpuPct: number;
  ring: 'pilot' | 'wave-1' | 'wave-2';
}

export interface RoleTemplate {
  id: ID;
  title: string;
  department: DepartmentKey;
  summary: string;
  requiredConnectors: string[]; // connector keys
  kpis: string[];
  pricePerMonth: number;
  rating: number;
  hires: number;
  featured?: boolean;
}

export interface AppNotification {
  id: ID;
  at: ISODate;
  title: string;
  body: string;
  severity: Severity;
  read: boolean;
  href?: string;
}

export interface CostPoint {
  date: ISODate;
  /** cost per agent id */
  byAgent: Record<ID, number>;
}

/* ------------------------------- Portfolio -------------------------------- */
/* Industry → project (use case) → agent team → canvas. See src/mocks/portfolio.ts. */

export interface Industry {
  id: ID;
  name: string;
  description: string;
  accent: Department['accent'];
  /** Shown as a "Coming soon" box with no tiles. */
  comingSoon?: boolean;
}

/** Same meaning (and colour) on every screen: tile, org chart and canvas. */
export type ProjectStatus = 'not-started' | 'configuring' | 'live' | 'issue';

export interface ProjectParam {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

export interface ProjectIntegration {
  name: string;
  status: 'connected' | 'pending';
}

export type ProjectAgentKind = 'lead' | 'assistant' | 'specialist';

export interface ProjectAgent {
  id: ID;
  name: string;
  role: string;
  kind: ProjectAgentKind;
  /** Who this agent reports to. Only the lead has none. */
  parentId?: ID;
  status: AgentStatus;
  responsibility: string;
  integrations: string[];
  /** Existing department id, used for avatar colour. */
  departmentId: ID;
}

export interface AgentRecommendation {
  id: ID;
  name: string;
  role: string;
  reason: string;
  responsibility: string;
  integrations: string[];
}

export interface ProjectFinding {
  id: ID;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  /** The fix the team proposes; the human approves it on the canvas. */
  proposedFix: string;
  status: 'open' | 'approved' | 'escalated';
}

export interface RunLogEntry {
  id: ID;
  at: ISODate;
  agentId: ID;
  /** Set when one agent talks to another. */
  toAgentId?: ID;
  text: string;
  kind: 'message' | 'tool' | 'result' | 'alert';
  tool?: string;
}

export interface ProjectRun {
  id: ID;
  startedAt: ISODate;
  durationMs: number;
  log: RunLogEntry[];
  outcome: string;
  findingsCount: number;
  costUsd: number;
}

export interface Project {
  id: ID;
  industryId: ID;
  name: string;
  short: string;
  summary: string;
  status: ProjectStatus;
  /** The one number shown on the tile. */
  metric: { label: string; value: string };
  /** What "no problems" means here, e.g. "inventory problems". Used in the clean outcome sentence. */
  subject: string;
  /** Plain-language result while findings are open, written by the lead agent. The hero of the canvas. */
  outcome: string;
  jd: { mission: string; responsibilities: string[] };
  params: ProjectParam[];
  integrations: ProjectIntegration[];
  team: ProjectAgent[];
  recommendations: AgentRecommendation[];
  findings: ProjectFinding[];
  /** Issues found per day, last 14 days. */
  trend: number[];
  runs: ProjectRun[];
  paused?: boolean;
}

/* --------------------------- Back office: organizations --------------------------- */

/** What an organization does. Picks the dashboard it gets. */
export type OrgKind = 'investment' | 'banking' | 'retail' | 'healthcare' | 'logistics' | 'general';

export type OrgStatus = 'live' | 'attention' | 'provisioning';

export interface OrgMember {
  id: ID;
  /** Given name, e.g. "Thor" for the CEO or "Mira" for an agent. */
  name: string;
  /** Job title, e.g. "Investment Manager". */
  role: string;
  /** The person who heads the organization is a human; everyone under them is an AI agent. */
  kind: 'head' | 'agent';
  reportsTo?: ID;
  responsibility: string;
  /** Members this one exchanges work with (besides its manager). */
  talksTo: ID[];
}

/** An organization created in the back office from a plain-language description. */
export interface Organization {
  id: ID;
  name: string;
  kind: OrgKind;
  /** Short industry label, e.g. "Portfolio management". */
  industry: string;
  /** Who typed the description. */
  createdBy: string;
  createdAt: ISODate;
  description: string;
  mission: string;
  members: OrgMember[];
  /** What the creator asked for, one item per request. */
  requirements: string[];
  /** Return periods asked for, e.g. ["ITD", "MoM", "MTD", "YTD"]. */
  periods: string[];
  /** Regulatory and compliance rules the agents must keep. */
  compliance: string[];
  /** Whether the local model or the built-in rules read the description. */
  readBy: 'model' | 'rules';
  /** Seed for the simulated data behind its dashboard. */
  seed: number;
}
