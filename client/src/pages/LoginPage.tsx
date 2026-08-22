import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { FormField } from '../components/form/FormField';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { useAuth } from '../lib/AuthContext';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

        <div className="rounded-md border border-border bg-surface p-5">
          <h1 className="text-base font-semibold text-heading">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use your SafetyOS account to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            <FormField label="Email" htmlFor="login-email" required>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password" required>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FormField>

            <Button type="submit" variant="primary" loading={submitting} className="w-full justify-center">
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-6 rounded-md border border-border bg-canvas-raised p-3 text-xs text-muted">
          <p className="font-medium text-body">Demo accounts</p>
          <p className="mt-1">Password for all: <span className="font-mono text-body">password123</span></p>
          <ul className="mt-1.5 space-y-0.5">
            <li>admin@safetyos.local &mdash; Admin</li>
            <li>k.mensah@safetyos.local &mdash; EHS Officer</li>
            <li>d.brooks@safetyos.local &mdash; Supervisor</li>
            <li>r.ibrahim@safetyos.local &mdash; Worker</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
