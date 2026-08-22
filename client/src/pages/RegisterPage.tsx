import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { FormField } from '../components/form/FormField';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { Select } from '../components/form/Select';
import { useAuth } from '../lib/AuthContext';
import { useWorkplaceSuggestions } from '../lib/useWorkplaceSuggestions';
import { ApiError } from '../lib/api';
import { ROLE_DESCRIPTIONS, SELF_REGISTER_ROLES, type Role } from '../lib/roles';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  workplace?: string;
}

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const { workplaces } = useWorkplaceSuggestions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [workplace, setWorkplace] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (!role) nextErrors.role = 'Select a role.';
    if (!workplace.trim()) nextErrors.workplace = 'Workplace is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    setErrors({});

    try {
      await register({ name: name.trim(), email: email.trim(), password, role: role as Role, workplace: workplace.trim() });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as FormErrors);
        setGeneralError(err.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
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
          <h1 className="text-base font-semibold text-heading">Create an account</h1>
          <p className="mt-1 text-sm text-muted">Get access to your organization's safety records.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
            {generalError && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{generalError}</div>
            )}

            <FormField label="Full Name" htmlFor="register-name" required error={errors.name}>
              <Input id="register-name" value={name} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </FormField>

            <FormField label="Email" htmlFor="register-email" required error={errors.email}>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </FormField>

            <FormField label="Password" htmlFor="register-password" required error={errors.password} hint="At least 8 characters.">
              <PasswordInput
                id="register-password"
                autoComplete="new-password"
                value={password}
                invalid={!!errors.password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </FormField>

            <FormField label="Workplace" htmlFor="register-workplace" required error={errors.workplace}>
              <Input
                id="register-workplace"
                list="register-workplace-suggestions"
                value={workplace}
                invalid={!!errors.workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                placeholder="e.g. Main Plant"
              />
              <datalist id="register-workplace-suggestions">
                {workplaces.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Role" htmlFor="register-role" required error={errors.role} hint={role ? ROLE_DESCRIPTIONS[role] : undefined}>
              <Select id="register-role" value={role} invalid={!!errors.role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="">Select a role…</option>
                {SELF_REGISTER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </FormField>

            <Button type="submit" variant="primary" loading={submitting} className="w-full justify-center">
              Create Account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
