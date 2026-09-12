'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useT } from '@/i18n/locale-provider';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailMatches: boolean;
  emailMessages: boolean;
  emailMarketing: boolean;
  pushMatches: boolean;
  pushMessages: boolean;
}

export default function SettingsPage() {
  const t = useT();
  const { user, logout } = useAuth();
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState((user as any)?.display_name || '');
  const [accountAvatar, setAccountAvatar] = useState((user as any)?.avatar_url || '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'avatar');
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json() as any;
      if (data.success && data.data?.url) {
        setAccountAvatar(data.data.url);
        // Save to user settings
        const token2 = localStorage.getItem('staffnow_token');
        await fetch('https://staffnow-api-production.siteinside53.workers.dev/auth/me/settings', {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token2}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: data.data.url }),
        });
        toast.success(t('settingsPage.photoUploaded'));
      } else {
        toast.error(data.error?.message || t('settingsPage.uploadFailed'));
      }
    } catch { toast.error(t('settingsPage.uploadError')); } finally { setUploadingAvatar(false); }
  };

  const saveAccountSettings = async () => {
    setSavingAccount(true);
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/auth/me/settings', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json() as any;
      if (data.success) {
        toast.success(t('settingsPage.detailsUpdated'));
      } else {
        toast.error(data.error?.message || t('settingsPage.saveFailed'));
      }
    } catch (err: any) { toast.error(err?.message || t('settingsPage.connError')); } finally { setSavingAccount(false); }
  };

  const passwordForm = useForm<PasswordForm>();

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailMatches: true,
    emailMessages: true,
    emailMarketing: false,
    pushMatches: true,
    pushMessages: true,
  });

  // Φέρνουμε τις αποθηκευμένες επιλογές. Χωρίς αυτό, η σελίδα έδειχνε πάντα τις
  // προεπιλογές — ο χρήστης έκλεινε π.χ. τα διαφημιστικά και την επόμενη φορά
  // τα έβλεπε ξανά ανοιχτά.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.notifications.getSettings();
        const s = res?.data ?? res;
        if (!cancelled && s && typeof s === 'object') {
          setNotifications((prev) => ({ ...prev, ...s }));
        }
      } catch {
        // Δεν ενοχλούμε τον χρήστη: κρατάει τις προεπιλογές.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error(t('settingsPage.passwordsMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword: data.currentPassword,
        password: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      // Η αλλαγή κωδικού διώχνει όλες τις ανοιχτές συνεδρίες σε όλες τις
      // συσκευές — αυτό ακριβώς είναι το ζητούμενο. Ο διακομιστής όμως μας
      // δίνει αμέσως καινούριο «κλειδί» για ΑΥΤΗ τη συσκευή, ώστε να μη βρεθεί
      // ο χρήστης ξαφνικά αποσυνδεδεμένος τη στιγμή που όλα πήγαν καλά.
      // Ο client επιστρέφει ολόκληρη την απάντηση ({ success, data }), οπότε το
      // νέο κλειδί βρίσκεται μέσα στο `data`.
      const fresh = (res as { data?: { token?: string } } | undefined)?.data?.token;
      if (fresh) localStorage.setItem('staffnow_token', fresh);
      toast.success(t('settingsPage.passwordChanged'));
      passwordForm.reset();
    } catch (err) {
      // Δείχνουμε το μήνυμα του διακομιστή (π.χ. «Ο τρέχων κωδικός δεν είναι
      // σωστός», «τουλάχιστον 8 χαρακτήρες»). Πριν έδειχνε πάντα «ελέγξτε τον
      // τρέχοντα κωδικό», που κατηγορούσε τον χρήστη ακόμη κι όταν το πρόβλημα
      // ήταν αλλού.
      toast.error((err as Error)?.message || t('settingsPage.passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const onSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await api.notifications.updateSettings(notifications);
      toast.success(t('settingsPage.notifSaved'));
    } catch {
      toast.error(t('settingsPage.saveFailedRetry'));
    } finally {
      setSavingNotifications(false);
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmText !== t('settingsPage.deleteWord')) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePassword ? { password: deletePassword } : undefined);
      toast.success(t('settingsPage.accountDeleted'));
      logout();
    } catch (err: any) {
      toast.error(err?.message || t('settingsPage.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('settingsPage.title')}</h1>
        <p className="mt-1 text-gray-600">
          {t('settingsPage.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Info with Avatar */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t('settingsPage.accountTitle')}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar upload */}
            <div className="flex items-center gap-5">
              <label className="cursor-pointer group relative flex-shrink-0">
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                {accountAvatar ? (
                  <img src={accountAvatar} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 group-hover:bg-blue-200">
                    {(displayName || user?.email || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  {uploadingAvatar ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  )}
                </div>
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settingsPage.accountPhoto')}</p>
                <p className="text-xs text-gray-400">{t('settingsPage.accountPhotoHint')}</p>
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('settingsPage.displayName')}</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('settingsPage.displayNamePlaceholder')} />
              <p className="mt-1 text-xs text-gray-400">{t('settingsPage.displayNameHint')}</p>
            </div>

            {/* Email (read-only) */}
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">{t('settingsPage.email')}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>

            <Button onClick={saveAccountSettings} disabled={savingAccount} size="sm">
              {savingAccount ? t('settingsPage.saving') : t('settingsPage.saveAccount')}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('settingsPage.passwordTitle')}
            </h2>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onChangePassword)}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('settingsPage.currentPassword')}
                </label>
                <Input
                  type="password"
                  placeholder={t('settingsPage.currentPasswordPlaceholder')}
                  {...passwordForm.register('currentPassword', {
                    required: t('settingsPage.required'),
                  })}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('settingsPage.newPassword')}
                </label>
                <Input
                  type="password"
                  placeholder={t('settingsPage.min8')}
                  {...passwordForm.register('newPassword', {
                    required: t('settingsPage.required'),
                    minLength: {
                      value: 8,
                      message: t('settingsPage.min8'),
                    },
                  })}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('settingsPage.confirmPassword')}
                </label>
                <Input
                  type="password"
                  placeholder={t('settingsPage.confirmPasswordPlaceholder')}
                  {...passwordForm.register('confirmPassword', {
                    required: t('settingsPage.required'),
                  })}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? t('settingsPage.saving') : t('settingsPage.changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('settingsPage.notifTitle')}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">{t('settingsPage.notifEmail')}</h3>
              {([
                { key: 'emailMatches' as const, label: t('settingsPage.newMatches') },
                { key: 'emailMessages' as const, label: t('settingsPage.newMessages') },
                { key: 'emailMarketing' as const, label: t('settingsPage.offersNews') },
              ]).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {t('settingsPage.pushTitle')}
                </h3>
              </div>
              {([
                { key: 'pushMatches' as const, label: t('settingsPage.newMatches') },
                { key: 'pushMessages' as const, label: t('settingsPage.newMessages') },
              ]).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}

              <Button
                onClick={onSaveNotifications}
                disabled={savingNotifications}
              >
                {savingNotifications
                  ? t('settingsPage.saving')
                  : t('settingsPage.saveSettings')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <h2 className="text-lg font-semibold text-red-600">
              {t('settingsPage.dangerTitle')}
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {t('settingsPage.dangerText')}
            </p>
            <Button
              variant="outline"
              className="mt-4 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}
            >
              {t('settingsPage.deleteAccount')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">
            {t('settingsPage.deleteAccount')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('settingsPage.deleteModalText')}
          </p>
          <p className="mt-4 text-sm font-medium text-gray-700">
            {t('settingsPage.typeToConfirm')} <strong>{t('settingsPage.deleteWord')}</strong> {t('settingsPage.typeToConfirmSuffix')}
          </p>
          <Input
            className="mt-2"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={t('settingsPage.deleteWord')}
          />
          <p className="mt-4 text-sm font-medium text-gray-700">
            {t('settingsPage.andPassword')}
          </p>
          <Input
            className="mt-2"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder={t('settingsPage.passwordPlaceholder')}
          />
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
                setDeletePassword('');
              }}
            >
              {t('settingsPage.cancel')}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onDeleteAccount}
              disabled={deleteConfirmText !== t('settingsPage.deleteWord') || deleting}
            >
              {deleting ? t('settingsPage.deleting') : t('settingsPage.deletePermanently')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
