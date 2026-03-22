'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function ProfilePage() {
  const { user, profile, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isWorker = user?.role === 'worker';

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isWorker && profile) {
      setFormData({
        full_name: (profile as any).full_name || '',
        bio: (profile as any).bio || '',
        city: (profile as any).city || '',
        region: (profile as any).region || '',
        availability: (profile as any).availability || '',
      });
    } else if (profile) {
      setFormData({
        company_name: (profile as any).company_name || '',
        description: (profile as any).description || '',
        business_type: (profile as any).business_type || '',
      });
    }
  }, [profile, isWorker]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isWorker) {
        await api.workers.updateProfile(formData);
      } else {
        await api.businesses.updateProfile(formData);
      }
      await refreshUser();
      toast.success('Το προφίλ ενημερώθηκε επιτυχώς!');
    } catch {
      toast.error('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  };

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

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Βασικά Στοιχεία</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {isWorker ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ονοματεπώνυμο</label>
                <Input value={formData.full_name || ''} onChange={(e) => handleChange('full_name', e.target.value)} placeholder="π.χ. Γιώργος Παπαδόπουλος" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label>
                <Textarea value={formData.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} rows={4} placeholder="Περίγραψε τον εαυτό σου..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη</label>
                  <Input value={formData.city || ''} onChange={(e) => handleChange('city', e.target.value)} placeholder="π.χ. Μύκονος" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
                  <Input value={formData.region || ''} onChange={(e) => handleChange('region', e.target.value)} placeholder="π.χ. Κυκλάδες" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Διαθεσιμότητα</label>
                <select
                  value={formData.availability || ''}
                  onChange={(e) => handleChange('availability', e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Επέλεξε</option>
                  <option value="immediate">Άμεση</option>
                  <option value="within_7_days">Εντός 7 ημερών</option>
                  <option value="seasonal">Εποχιακή</option>
                  <option value="part_time">Μερικής απασχόλησης</option>
                  <option value="full_time">Πλήρους απασχόλησης</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Επωνυμία Επιχείρησης</label>
                <Input value={formData.company_name || ''} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="π.χ. Sunset Hotel" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label>
                <Textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={4} placeholder="Περίγραψε την επιχείρησή σου..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος</label>
                <select
                  value={formData.business_type || ''}
                  onChange={(e) => handleChange('business_type', e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Επέλεξε</option>
                  <option value="hotel">Ξενοδοχείο</option>
                  <option value="restaurant">Εστιατόριο</option>
                  <option value="bar">Μπαρ</option>
                  <option value="cafe">Καφετέρια</option>
                  <option value="other">Άλλο</option>
                </select>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving} className="mt-4">
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
