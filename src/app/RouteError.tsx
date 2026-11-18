import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Backdrop } from '@/components/layout/Backdrop';

/** Last-resort boundary for crashes during render or chunk loading. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Backdrop />
      <div role="alert" className="glass max-w-md rounded-xl p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold">This screen hit a problem</h1>
        <p className="mt-2 text-sm text-fg-muted">Your data is safe. Reload the screen or head back to mission control.</p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-line/5 p-3 text-left font-mono text-xs text-fg-subtle">{message}</pre>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCw /> Reload
          </Button>
          <Button variant="primary" asChild>
            <Link to="/">
              <Home /> Mission control
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
