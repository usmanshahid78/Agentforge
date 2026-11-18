import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RouteError } from './RouteError';

// Every screen is its own chunk; heavy ones (3D, React Flow, charts) stay out of the first load.
const BackOfficePage = lazy(() => import('@/features/backoffice/BackOfficePage'));
const NewOrgPage = lazy(() => import('@/features/backoffice/NewOrgPage'));
const OrgPage = lazy(() => import('@/features/backoffice/OrgPage'));
const PortfolioPage = lazy(() => import('@/features/portfolio/PortfolioPage'));
const ProjectPage = lazy(() => import('@/features/portfolio/ProjectPage'));
const HomePage = lazy(() => import('@/features/home/HomePage'));
const BuilderPage = lazy(() => import('@/features/builder/BuilderPage'));
const ConnectPage = lazy(() => import('@/features/connect/ConnectPage'));
const TestPage = lazy(() => import('@/features/test/TestPage'));
const CompanyPage = lazy(() => import('@/features/company/CompanyPage'));
const AgentPage = lazy(() => import('@/features/agents/AgentPage'));
const ObservePage = lazy(() => import('@/features/observe/ObservePage'));
const OutputsPage = lazy(() => import('@/features/outputs/OutputsPage'));
const AvatarsPage = lazy(() => import('@/features/avatars/AvatarsPage'));
const TemplatesPage = lazy(() => import('@/features/templates/TemplatesPage'));
const DeployPage = lazy(() => import('@/features/deploy/DeployPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ChatPage = lazy(() => import('@/features/chat/ChatPage'));
const NotFoundPage = lazy(() => import('@/features/home/NotFoundPage'));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <BackOfficePage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/orgs/new', element: <NewOrgPage /> },
      { path: '/orgs/:id', element: <OrgPage /> },
      { path: '/portfolio', element: <PortfolioPage /> },
      { path: '/projects/:id', element: <ProjectPage /> },
      { path: '/mission', element: <HomePage /> },
      { path: '/build', element: <BuilderPage /> },
      { path: '/connect', element: <ConnectPage /> },
      { path: '/test', element: <TestPage /> },
      { path: '/company', element: <CompanyPage /> },
      { path: '/agents/:id', element: <AgentPage /> },
      { path: '/observe', element: <ObservePage /> },
      { path: '/outputs', element: <OutputsPage /> },
      { path: '/avatars', element: <AvatarsPage /> },
      { path: '/templates', element: <TemplatesPage /> },
      { path: '/deploy', element: <DeployPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true },
});
