'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { REGIONS_GREECE } from '@staffnow/config';

interface Branch {
  id: string;
  name: string;
  business_type: string;
  description: string;
  region: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  logo_url: string;
  staff_housing: number;
  meals_provided: number;
  transportation_assistance: number;
}

const EMPTY_BRANCH: Partial<Branch> = {
  name: '', business_type: 'other', description: '', region: '', city: '', address: '', phone: '', website: '', logo_url: '', staff_housing: 0, meals_provided: 0, transportation_assistance: 0,
};

const BIZ_TYPES: Record<string, string> = {
  hotel: '🏨 Ξενοδοχείο', restaurant: '🍽️ Εστιατόριο', beach_bar: '🏖️ Beach Bar',
  bar: '🍸 Μπαρ', cafe: '☕ Καφετέρια', villa: '🏡 Βίλα',
  tourism_company: '✈️ Τουριστική Εταιρεία', resort: '🌴 Resort', other: '📋 Άλλο',
};

export function BusinessProfile({ user, profile, refreshUser }: { user: any; profile: any; refreshUser: () => Promise<void> }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new
  const [saving, setSaving] = useState(false);

  // Load branches
  useEffect(() => {
    async function load() {
      try {
        const res = await (api as any).branches.list() as any;
        if (res.success) setBranches(res.data || []);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  // Save branch (create or update)
  const saveBranch = async () => {
    if (!editingBranch?.name) { toast.error('Συμπλήρωσε το όνομα'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await (api as any).branches.update(editingId, editingBranch) as any;
        if (res.success) {
          setBranches((prev) => prev.map((b) => b.id === editingId ? { ...b, ...res.data } : b));
          toast.success('Η επιχείρηση ενημερώθηκε!');
        }
      } else {
        const res = await (api as any).branches.create(editingBranch) as any;
        if (res.success) {
          setBranches((prev) => [...prev, res.data]);
          toast.success('Η επιχείρηση προστέθηκε!');
        }
      }
      setEditingBranch(null);
      setEditingId(null);
    } catch { toast.error('Σφάλμα αποθήκευσης'); } finally { setSaving(false); }
  };

  // Delete branch
  const deleteBranch = async (id: string) => {
    if (!confirm('Σίγουρα θέλεις να διαγράψεις αυτή την επιχείρηση;')) return;
    try {
      await (api as any).branches.delete(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      toast.success('Η επιχείρηση διαγράφηκε');
    } catch { toast.error('Σφάλμα διαγραφής'); }
  };

  const bc = (f: string, v: any) => setEditingBranch((p) => p ? { ...p, [f]: v } : p);
  const sel = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500";

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  // ====== EDITING A BRANCH ======
  if (editingBranch) {
    return (
      <div className="max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => { setEditingBranch(null); setEditingId(null); }} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingId ? 'Επεξεργασία Επιχείρησης' : 'Νέα Επιχείρηση'}</h1>
            <p className="mt-1 text-gray-600">Συμπλήρωσε τα στοιχεία.</p>
          </div>
        </div>

        {/* Basic */}
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🏢 Στοιχεία</h2></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Όνομα Επιχείρησης *</label>
              <Input value={editingBranch.name || ''} onChange={(e) => bc('name', e.target.value)} placeholder="π.χ. Sunset Boutique Hotel" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιγραφή</label>
              <Textarea value={editingBranch.description || ''} onChange={(e) => bc('description', e.target.value)} rows={3} placeholder="Περίγραψε την επιχείρηση..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τύπος</label>
                <select value={editingBranch.business_type || 'other'} onChange={(e) => bc('business_type', e.target.value)} className={sel}>
                  {Object.entries(BIZ_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή</label>
                <select value={editingBranch.region || ''} onChange={(e) => bc('region', e.target.value)} className={sel}>
                  <option value="">Επέλεξε</option>{REGIONS_GREECE.map((r) => <option key={r} value={r}>{r}</option>)}
                </select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Πόλη</label>
                <Input value={editingBranch.city || ''} onChange={(e) => bc('city', e.target.value)} placeholder="π.χ. Μύκονος" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τηλέφωνο</label>
                <Input value={editingBranch.phone || ''} onChange={(e) => bc('phone', e.target.value)} placeholder="+30 210 1234567" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διεύθυνση</label>
              <Input value={editingBranch.address || ''} onChange={(e) => bc('address', e.target.value)} placeholder="π.χ. Λεωφ. Βασ. Σοφίας 12" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label>
              <Input value={editingBranch.website || ''} onChange={(e) => bc('website', e.target.value)} placeholder="https://example.com" /></div>
          </CardContent></Card>

        {/* Conditions */}
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold text-gray-900">🏠 Συνθήκες Εργασίας</h2></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Αυτά βοηθούν τους εργαζομένους να αποφασίσουν.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'staff_housing', label: '🏠 Διαμονή', desc: 'Στέγαση εργαζομένων' },
                { key: 'meals_provided', label: '🍽️ Σίτιση', desc: 'Γεύματα εργασίας' },
                { key: 'transportation_assistance', label: '🚌 Μεταφορά', desc: 'Βοήθεια μετακίνησης' },
              ].map((item) => {
                const on = !!(editingBranch as any)[item.key];
                return (
                  <div key={item.key} onClick={() => bc(item.key, on ? 0 : 1)}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${on ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                    <div className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {on ? 'Ναι' : 'Όχι'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>

        {/* Save */}
        <div className="flex gap-3">
          <Button onClick={saveBranch} disabled={saving} size="lg">
            {saving ? 'Αποθήκευση...' : editingId ? '💾 Ενημέρωση' : '➕ Προσθήκη'}
          </Button>
          <Button variant="outline" size="lg" onClick={() => { setEditingBranch(null); setEditingId(null); }}>Ακύρωση</Button>
        </div>
      </div>
    );
  }

  // ====== MAIN VIEW: BRANCHES LIST ======
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Οι Επιχειρήσεις μου</h1>
        <p className="mt-1 text-gray-600">Διαχειρίσου τις επιχειρήσεις σου και πρόσθεσε νέες.</p>
      </div>

      {/* Branches List */}
      {branches.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="p-10 text-center">
            <p className="text-4xl mb-4">🏢</p>
            <h3 className="text-lg font-bold text-gray-900">Δεν έχεις προσθέσει επιχείρηση ακόμα</h3>
            <p className="mt-2 text-gray-500">Πρόσθεσε την πρώτη σου επιχείρηση για να ξεκινήσεις να δημοσιεύεις αγγελίες.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {branches.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                    {b.name?.[0]?.toUpperCase() || '🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                      <Badge variant="secondary" className="text-xs">{BIZ_TYPES[b.business_type] || b.business_type}</Badge>
                    </div>
                    {b.description && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{b.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      {b.city && <span>📍 {b.city}{b.region ? `, ${b.region}` : ''}</span>}
                      {b.staff_housing ? <span className="text-emerald-600">🏠 Διαμονή</span> : null}
                      {b.meals_provided ? <span className="text-emerald-600">🍽️ Σίτιση</span> : null}
                      {b.transportation_assistance ? <span className="text-emerald-600">🚌 Μεταφορά</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setEditingBranch({ ...b }); setEditingId(b.id); }}
                      className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-500 hover:text-blue-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onClick={() => deleteBranch(b.id)}
                      className="rounded-lg border border-gray-200 p-2 hover:bg-red-50 text-gray-500 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add button */}
      <Button onClick={() => { setEditingBranch({ ...EMPTY_BRANCH }); setEditingId(null); }} size="lg" className="w-full">
        ➕ Πρόσθεσε Επιχείρηση
      </Button>

      {branches.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          {branches.length}/10 επιχειρήσεις • Πήγαινε στις Αγγελίες για να δημοσιεύσεις θέσεις
        </p>
      )}
    </div>
  );
}
