import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Tabs, type TabItem } from '../components/Tabs';
import { ProfileSettingsForm } from '../components/settings/ProfileSettingsForm';
import { ChangePasswordForm } from '../components/settings/ChangePasswordForm';
import { UserManagementPanel } from '../components/settings/UserManagementPanel';
import { useAuth } from '../lib/AuthContext';
import { canManageUsers } from '../lib/roles';

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) return null;

  const tabs: TabItem[] = [
    { id: 'profile', label: 'My Profile' },
    ...(canManageUsers(user.role) ? [{ id: 'users', label: 'Users' }] : []),
  ];

  return (
    <>
      <PageHeader title="Settings" description="Account and system settings." />

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="mt-4 space-y-4">
        {activeTab === 'profile' && (
          <>
            <ProfileSettingsForm />
            <ChangePasswordForm />
          </>
        )}
        {activeTab === 'users' && canManageUsers(user.role) && <UserManagementPanel />}
      </div>
    </>
  );
}
