'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';

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
  const { user, logout } = useAuth();
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const passwordForm = useForm<PasswordForm>();

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailMatches: true,
    emailMessages: true,
    emailMarketing: false,
    pushMatches: true,
    pushMessages: true,
  });

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword(data.currentPassword, data.newPassword);
      toast.success('Ο κωδικός αλλάχτηκε επιτυχώς!');
      passwordForm.reset();
    } catch {
      toast.error('Αποτυχία αλλαγής κωδικού. Ελέγξτε τον τρέχοντα κωδικό.');
    } finally {
      setSavingPassword(false);
    }
  };

  const onSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await api.notifications.updateSettings(notifications);
      toast.success('Οι ρυθμίσεις ειδοποιήσεων ενημερώθηκαν!');
    } catch {
      toast.error('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirmText !== 'ΔΙΑΓΡΑΦΗ') return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount();
      toast.success('Ο λογαριασμός σου διαγράφηκε.');
      logout();
    } catch {
      toast.error('Αποτυχία διαγραφής. Δοκίμασε ξανά.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ρυθμίσεις</h1>
        <p className="mt-1 text-gray-600">
          Διαχειρίσου τον λογαριασμό και τις ειδοποιήσεις σου.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Στοιχεία Λογαριασμού
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Αλλαγή Κωδικού
            </h2>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onChangePassword)}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Τρέχων Κωδικός
                </label>
                <Input
                  type="password"
                  placeholder="Εισάγετε τον τρέχοντα κωδικό"
                  {...passwordForm.register('currentPassword', {
                    required: 'Υποχρεωτικό πεδίο',
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
                  Νέος Κωδικός
                </label>
                <Input
                  type="password"
                  placeholder="Τουλάχιστον 8 χαρακτήρες"
                  {...passwordForm.register('newPassword', {
                    required: 'Υποχρεωτικό πεδίο',
                    minLength: {
                      value: 8,
                      message: 'Τουλάχιστον 8 χαρακτήρες',
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
                  Επιβεβαίωση Νέου Κωδικού
                </label>
                <Input
                  type="password"
                  placeholder="Επανέλαβε τον νέο κωδικό"
                  {...passwordForm.register('confirmPassword', {
                    required: 'Υποχρεωτικό πεδίο',
                  })}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Αποθήκευση...' : 'Αλλαγή Κωδικού'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Ειδοποιήσεις
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Email</h3>
              {([
                { key: 'emailMatches' as const, label: 'Νέα matches' },
                { key: 'emailMessages' as const, label: 'Νέα μηνύματα' },
                { key: 'emailMarketing' as const, label: 'Προσφορές & νέα' },
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
                  Push Notifications
                </h3>
              </div>
              {([
                { key: 'pushMatches' as const, label: 'Νέα matches' },
                { key: 'pushMessages' as const, label: 'Νέα μηνύματα' },
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
                  ? 'Αποθήκευση...'
                  : 'Αποθήκευση Ρυθμίσεων'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <h2 className="text-lg font-semibold text-red-600">
              Ζώνη Κινδύνου
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Η διαγραφή του λογαριασμού σου είναι μόνιμη και δεν μπορεί να
              αναιρεθεί. Όλα τα δεδομένα σου θα διαγραφούν οριστικά.
            </p>
            <Button
              variant="outline"
              className="mt-4 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}
            >
              Διαγραφή Λογαριασμού
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
            Διαγραφή Λογαριασμού
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Αυτή η ενέργεια είναι μόνιμη. Θα χάσεις όλα τα δεδομένα σου,
            τα matches, τα μηνύματα και τη συνδρομή σου.
          </p>
          <p className="mt-4 text-sm font-medium text-gray-700">
            Πληκτρολόγησε <strong>ΔΙΑΓΡΑΦΗ</strong> για να επιβεβαιώσεις:
          </p>
          <Input
            className="mt-2"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="ΔΙΑΓΡΑΦΗ"
          />
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              Ακύρωση
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onDeleteAccount}
              disabled={deleteConfirmText !== 'ΔΙΑΓΡΑΦΗ' || deleting}
            >
              {deleting ? 'Διαγραφή...' : 'Οριστική Διαγραφή'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
