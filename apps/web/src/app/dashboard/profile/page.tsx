'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  REGIONS_GREECE,
  WORKER_JOB_ROLE_LABELS_EL,
  BUSINESS_TYPE_LABELS_EL,
} from '@staffnow/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface WorkerProfileForm {
  name: string;
  phone: string;
  bio: string;
  location: string;
  jobRoles: string[];
  experience: string;
  languages: string;
  availability: string;
}

interface BusinessProfileForm {
  businessName: string;
  businessType: string;
  phone: string;
  description: string;
  location: string;
  website: string;
  contactPerson: string;
}

export default function ProfilePage() {
  const { profile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isWorker = profile?.role === 'worker';

  // Worker form
  const workerForm = useForm<WorkerProfileForm>();
  // Business form
  const businessForm = useForm<BusinessProfileForm>();

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (isWorker) {
          const res = await api.workers.getProfile();
          workerForm.reset({
            name: res.name || '',
            phone: res.phone || '',
            bio: res.bio || '',
            location: res.location || '',
            jobRoles: res.jobRoles || [],
            experience: res.experience || '',
            languages: res.languages?.join(', ') || '',
            availability: res.availability || '',
          });
        } else {
          const res = await api.businesses.getProfile();
          businessForm.reset({
            businessName: res.businessName || '',
            businessType: res.businessType || '',
            phone: res.phone || '',
            description: res.description || '',
            location: res.location || '',
            website: res.website || '',
            contactPerson: res.contactPerson || '',
          });
        }
      } catch {
        // Profile might not exist yet
      } finally {
        setLoading(false);
      }
    }

    if (profile) {
      fetchProfile();
    }
  }, [profile, isWorker, workerForm, businessForm]);

  const onSaveWorker = async (data: WorkerProfileForm) => {
    setSaving(true);
    try {
      await api.workers.updateProfile({
        ...data,
        languages: data.languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      await refreshUser();
      toast.success('Το προφίλ ενημερώθηκε επιτυχώς!');
    } catch {
      toast.error('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  };

  const onSaveBusiness = async (data: BusinessProfileForm) => {
    setSaving(true);
    try {
      await api.businesses.updateProfile(data);
      await refreshUser();
      toast.success('Το προφίλ ενημερώθηκε επιτυχώς!');
    } catch {
      toast.error('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isWorker ? 'Προφίλ Εργαζομένου' : 'Προφίλ Επιχείρησης'}
        </h1>
        <p className="mt-1 text-gray-600">
          Ενημέρωσε τα στοιχεία σου για καλύτερα ταιριάσματα.
        </p>
      </div>

      {isWorker ? (
        <form onSubmit={workerForm.handleSubmit(onSaveWorker)}>
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Βασικά Στοιχεία
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Ονοματεπώνυμο
                    </label>
                    <Input
                      placeholder="π.χ. Γιώργος Παπαδόπουλος"
                      {...workerForm.register('name')}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Τηλέφωνο
                    </label>
                    <Input
                      placeholder="π.χ. 6912345678"
                      {...workerForm.register('phone')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Περιγραφή
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Περίγραψε τον εαυτό σου, την εμπειρία σου και τι ψάχνεις..."
                    {...workerForm.register('bio')}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Τοποθεσία
                  </label>
                  <Select {...workerForm.register('location')}>
                    <option value="">Επέλεξε τοποθεσία</option>
                    {REGIONS_GREECE.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Skills & Experience */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Δεξιότητες & Εμπειρία
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ρόλοι που Ψάχνεις
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(WORKER_JOB_ROLE_LABELS_EL).map(
                      ([value, label]) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            value={value}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            {...workerForm.register('jobRoles')}
                          />
                          <span>{label}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Εμπειρία
                  </label>
                  <Select {...workerForm.register('experience')}>
                    <option value="">Επέλεξε εμπειρία</option>
                    <option value="none">Χωρίς εμπειρία</option>
                    <option value="0-1">0-1 χρόνια</option>
                    <option value="1-3">1-3 χρόνια</option>
                    <option value="3-5">3-5 χρόνια</option>
                    <option value="5+">5+ χρόνια</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Γλώσσες (χωρισμένες με κόμμα)
                  </label>
                  <Input
                    placeholder="π.χ. Ελληνικά, Αγγλικά, Γερμανικά"
                    {...workerForm.register('languages')}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Διαθεσιμότητα
                  </label>
                  <Select {...workerForm.register('availability')}>
                    <option value="">Επέλεξε διαθεσιμότητα</option>
                    <option value="immediate">Άμεση</option>
                    <option value="1week">Σε 1 εβδομάδα</option>
                    <option value="2weeks">Σε 2 εβδομάδες</option>
                    <option value="1month">Σε 1 μήνα</option>
                    <option value="seasonal">Εποχιακή (Καλοκαίρι)</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση Προφίλ'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={businessForm.handleSubmit(onSaveBusiness)}>
          <div className="space-y-6">
            {/* Business Info */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Στοιχεία Επιχείρησης
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Επωνυμία Επιχείρησης
                    </label>
                    <Input
                      placeholder="π.χ. Hotel Sunrise"
                      {...businessForm.register('businessName')}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Τύπος Επιχείρησης
                    </label>
                    <Select {...businessForm.register('businessType')}>
                      <option value="">Επέλεξε τύπο</option>
                      {Object.entries(BUSINESS_TYPE_LABELS_EL).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Υπεύθυνος Επικοινωνίας
                    </label>
                    <Input
                      placeholder="π.χ. Μαρία Κωνσταντίνου"
                      {...businessForm.register('contactPerson')}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Τηλέφωνο
                    </label>
                    <Input
                      placeholder="π.χ. 2101234567"
                      {...businessForm.register('phone')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Περιγραφή Επιχείρησης
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Περίγραψε την επιχείρησή σου..."
                    {...businessForm.register('description')}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Τοποθεσία
                    </label>
                    <Select {...businessForm.register('location')}>
                      <option value="">Επέλεξε τοποθεσία</option>
                      {REGIONS_GREECE.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <Input
                      placeholder="https://www.example.com"
                      {...businessForm.register('website')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση Προφίλ'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
