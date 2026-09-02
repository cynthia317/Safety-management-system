import { useState, type FormEvent } from 'react';
import { SectionCard } from '../SectionCard';
import { FormField } from '../form/FormField';
import { Input } from '../form/Input';
import { Button } from '../Button';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../lib/ToastContext';
import { useWorkplaceSuggestions } from '../../lib/useWorkplaceSuggestions';
import { hasOrgWideAccess } from '../../lib/roles';
import { ApiError } from '../../lib/api';

interface FormErrors {
  name?: string;
  workplace?: string;
}

export function ProfileSettingsForm() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { workplaces } = useWorkplaceSuggestions();

  const [name, setName] = useState(user?.name ?? '');
  const [workplace, setWorkplace] = useState(user?.workplace ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  // Workplace is the root input to every workplace-scoping check server-side — letting a
  // scoped user change their own would let them grant themselves another workplace's data.
  // Only Admin (already organisation-wide) may self-edit it; everyone else needs an
  // administrator, same as the Role field below.
  const canEditWorkplace = hasOrgWideAccess(user.role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      await updateProfile({ name: name.trim(), workplace: workplace.trim() });
      showToast('success', 'Profile updated.');
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as FormErrors);
      } else {
        showToast('error', err instanceof Error ? err.message : 'Could not update profile.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="My Profile" description="Your account details.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="profile-name" required error={errors.name}>
            <Input id="profile-name" value={name} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="profile-email" hint="Contact an administrator to change your email.">
            <Input id="profile-email" value={user.email} disabled />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Workplace"
            htmlFor="profile-workplace"
            required={canEditWorkplace}
            error={errors.workplace}
            hint={canEditWorkplace ? undefined : 'Contact an administrator to change your workplace.'}
          >
            {canEditWorkplace ? (
              <>
                <Input
                  id="profile-workplace"
                  list="profile-workplace-suggestions"
                  value={workplace}
                  invalid={!!errors.workplace}
                  onChange={(e) => setWorkplace(e.target.value)}
                />
                <datalist id="profile-workplace-suggestions">
                  {workplaces.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </>
            ) : (
              <Input id="profile-workplace" value={workplace} disabled />
            )}
          </FormField>
          <FormField label="Role" htmlFor="profile-role" hint="Contact an administrator to change your role.">
            <Input id="profile-role" value={user.role} disabled />
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
