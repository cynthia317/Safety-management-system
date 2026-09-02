import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../lib/AuthContext';

// Phase 0 (multi-organisation security hardening): public self-registration is disabled.
// There is no longer a POST /api/auth/register endpoint (see server/src/modules/auth/routes.ts),
// so this page carries no form and cannot create an account — it exists only so a bookmarked
// or shared /register link lands on an explanatory message instead of a dead route. Invite-based
// account provisioning (Phase C) will replace this page with a real accept-invite flow.
export function RegisterPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded bg-accent text-accent-foreground">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-lg font-semibold text-heading">SafetyOS</p>
            <p className="text-xs text-muted">OSH Management</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-5 text-center">
          <h1 className="text-base font-semibold text-heading">Accounts are provided by your organisation</h1>
          <p className="mt-2 text-sm text-muted">
            Accounts are provided by your organisation administrator. If you need access, contact your Admin or
            EHS Officer to be added.
          </p>
          <Link to="/login" className="mt-4 inline-block w-full">
            <Button variant="primary" className="w-full justify-center">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
