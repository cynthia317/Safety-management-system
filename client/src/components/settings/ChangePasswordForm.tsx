import { useState, type FormEvent } from 'react';
import { SectionCard } from '../SectionCard';
import { FormField } from '../form/FormField';
import { PasswordInput } from '../form/PasswordInput';
import { Button } from '../Button';
import { useToast } from '../../lib/ToastContext';
import { changePassword } from '../../lib/authApi';
import { ApiError } from '../../lib/api';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const EMPTY_VALUES = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  function setField(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!values.currentPassword) nextErrors.currentPassword = 'Current password is required.';
    if (!values.newPassword || values.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters.';
    }
    if (values.confirmPassword !== values.newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      showToast('success', 'Password changed.');
      setValues(EMPTY_VALUES);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details as FormErrors);
      } else {
        showToast('error', err instanceof Error ? err.message : 'Could not change password.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Change Password" description="Update the password used to sign in.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Current Password" htmlFor="current-password" required error={errors.currentPassword}>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={values.currentPassword}
            invalid={!!errors.currentPassword}
            onChange={(e) => setField('currentPassword', e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="New Password" htmlFor="new-password" required error={errors.newPassword} hint="At least 8 characters.">
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={values.newPassword}
              invalid={!!errors.newPassword}
              onChange={(e) => setField('newPassword', e.target.value)}
            />
          </FormField>
          <FormField label="Confirm New Password" htmlFor="confirm-password" required error={errors.confirmPassword}>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={values.confirmPassword}
              invalid={!!errors.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Change Password
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
