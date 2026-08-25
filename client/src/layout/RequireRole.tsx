import { ShieldAlert } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { useAuth } from '../lib/AuthContext';
import type { Role } from '../lib/roles';

interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
}

// UX-only guard — hides pages a user's role can't act on so they don't hit a page that
// only fails once submitted. The server enforces the actual permission independently
// (see server/src/modules/auth/permissions.ts); this never substitutes for that check.
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="Your role doesn't have permission to view this page."
          action={
            <Link to="/dashboard">
              <Button variant="secondary" className="mt-2">
                Back to dashboard
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
