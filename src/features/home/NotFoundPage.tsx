import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';

export default function NotFoundPage() {
  return (
    <Page className="pt-16">
      <EmptyState
        icon={Compass}
        title="This part of the station is empty"
        description="The page you asked for does not exist. Press Ctrl+K to search, or head back to mission control."
        action={
          <Button variant="primary" asChild>
            <Link to="/">
              <Home /> Mission control
            </Link>
          </Button>
        }
      />
    </Page>
  );
}
