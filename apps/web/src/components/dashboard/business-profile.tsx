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
import { BusinessProfilePanel } from './business-profile-panel';

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
  tourism_company: '✈️ Τουριστική Εταιρεία', resort: '🌴 Resort',
  technical: '🔧 Τεχνική Εταιρεία', other: '📋 Άλλο',
};

export function BusinessProfile({ user, profile, refreshUser }: { user: any; profile: any; refreshUser: () => Promise<void> }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewBusinessId, setPreviewBusinessId] = useState<string | null>(null);

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

  // Upload logo
  const [uploading, setUploading] = useState(false);
  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'logo');
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json() as any;
      if (data.success && data.data?.url) {
        setEditingBranch((p) => p ? { ...p, logo_url: data.data.url } : p);
        toast.success('Το λογότυπο ανέβηκε!');
      } else {
        toast.error(data.error?.message || 'Αποτυχία upload');
      }
    } catch (err: any) { toast.error(err?.message || 'Σφάλμα σύνδεσης'); } finally { setUploading(false); }
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
        {/* Logo Upload */}
        <Card className="mb-6"><CardContent className="p-6">
          <div className="flex items-center gap-5">
            <label className="cursor-pointer group relative flex-shrink-0">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
              {editingBranch?.logo_url ? (
                <img src={editingBranch.logo_url} alt="" className="h-20 w-20 rounded-xl object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100 text-2xl font-bold text-blue-600 group-hover:bg-blue-200 transition-colors">
                  {editingBranch?.name?.[0]?.toUpperCase() || '🏢'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md group-hover:bg-blue-700">
                {uploading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                )}
              </div>
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700">Λογότυπο / Φωτογραφία</p>
              <p className="text-xs text-gray-400">Πάτα για να ανεβάσεις (JPG, PNG, WebP)</p>
            </div>
          </div>
        </CardContent></Card>

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
                <Input value={editingBranch.city || ''} onChange={(e) => bc('city', e.target.value)} placeholder="π.χ. Θεσσαλονίκη" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Τηλέφωνο</label>
                <Input value={editingBranch.phone || ''} onChange={(e) => bc('phone', e.target.value)} placeholder="+30 210 1234567" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Διεύθυνση</label>
              <Input value={editingBranch.address || ''} onChange={(e) => bc('address', e.target.value)} placeholder="π.χ. Κασσάνδρου 123, Θεσσαλονίκη" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Ταχυδρομικός Κώδικας (ΤΚ)</label>
                <Input value={(editingBranch as any).postal_code || ''} onChange={(e) => {
                  const tk = e.target.value.replace(/\D/g, '').substring(0, 5);
                  bc('postal_code', tk);
                  // Auto-fill area based on postal code
                  const postalAreas: Record<string, string> = {
                    '546': 'Κέντρο Θεσσαλονίκης', '562': 'Εύοσμος', '563': 'Κορδελιό-Εύοσμος',
                    '551': 'Καλαμαριά', '552': 'Πυλαία', '553': 'Θέρμη', '554': 'Μίκρα',
                    '555': 'Πανόραμα', '564': 'Σταυρούπολη', '565': 'Νεάπολη-Συκιές',
                    '566': 'Αμπελόκηποι-Μενεμένη', '561': 'Ωραιόκαστρο',
                    '104': 'Αθήνα Κέντρο', '105': 'Πλάκα-Μοναστηράκι', '111': 'Γκάζι-Κεραμεικός',
                    '112': 'Περιστέρι', '113': 'Πατήσια', '114': 'Κυψέλη',
                    '115': 'Αμπελόκηποι Αθήνα', '116': 'Παγκράτι', '117': 'Νέος Κόσμος',
                    '121': 'Περιστέρι', '131': 'Πετρούπολη', '141': 'Ν. Ηράκλειο',
                    '151': 'Μαρούσι', '152': 'Χαλάνδρι', '153': 'Αγ. Παρασκευή',
                    '154': 'Κηφισιά', '161': 'Γλυφάδα', '162': 'Βούλα',
                    '163': 'Βουλιαγμένη', '171': 'Ν. Σμύρνη', '172': 'Καλλιθέα',
                    '173': 'Δάφνη', '174': 'Άγ. Δημήτριος', '175': 'Άλιμος',
                    '176': 'Ελληνικό', '181': 'Πειραιάς', '185': 'Πέραμα',
                    '731': 'Ηράκλειο Κρήτης', '741': 'Ρέθυμνο', '711': 'Χανιά',
                    '721': 'Αγ. Νικόλαος Κρήτης',
                    '491': 'Κέρκυρα', '291': 'Ζάκυνθος', '841': 'Μύκονος',
                    '847': 'Σαντορίνη', '851': 'Ρόδος', '631': 'Χαλκιδική',
                    '261': 'Πάτρα', '411': 'Λάρισα', '451': 'Ιωάννινα',
                    '681': 'Αλεξανδρούπολη', '671': 'Ξάνθη', '661': 'Δράμα',
                    '641': 'Καβάλα', '611': 'Κοζάνη', '501': 'Βέροια',
                  };
                  if (tk.length >= 3) {
                    const prefix3 = tk.substring(0, 3);
                    if (postalAreas[prefix3]) {
                      bc('area', postalAreas[prefix3]);
                    }
                  }
                }} placeholder="π.χ. 56224" maxLength={5} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Περιοχή / Δήμος</label>
                <Input value={(editingBranch as any).area || ''} onChange={(e) => bc('area', e.target.value)} placeholder="π.χ. Εύοσμος" />
                {(editingBranch as any).area && <p className="mt-1 text-xs text-emerald-600">📍 {(editingBranch as any).area}</p>}
              </div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label>
              <Input value={editingBranch.website || ''} onChange={(e) => bc('website', e.target.value)} placeholder="https://example.com" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Νομική Μορφή</label>
                <select value={(editingBranch as any).legal_form || ''} onChange={(e) => bc('legal_form', e.target.value)} className={sel}>
                  <option value="">Επέλεξε</option>
                  <option value="sole">Ατομική</option>
                  <option value="ike">ΙΚΕ</option>
                  <option value="oe">ΟΕ</option>
                  <option value="ee">ΕΕ</option>
                  <option value="epe">ΕΠΕ</option>
                  <option value="ae">ΑΕ</option>
                  <option value="koinsx">ΚοινΣΕπ</option>
                  <option value="other">Άλλο</option>
                </select></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">ΑΦΜ <span className="text-xs text-gray-400">(προαιρετικό)</span></label>
                <Input value={(editingBranch as any).tax_id || ''} onChange={(e) => bc('tax_id', e.target.value)} placeholder="π.χ. 123456789" /></div>
            </div>
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
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                      {b.name?.[0]?.toUpperCase() || '🏢'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{b.name}</h3>
                      <Badge variant="secondary" className="text-xs">{BIZ_TYPES[b.business_type] || b.business_type}</Badge>
                    </div>
                    {b.description && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{b.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      {(b.address || b.city) && <span>📍 {[b.address, (b as any).area, b.city, (b as any).postal_code].filter(Boolean).join(', ')}</span>}
                      {b.staff_housing ? <span className="text-emerald-600">🏠 Διαμονή</span> : null}
                      {b.meals_provided ? <span className="text-emerald-600">🍽️ Σίτιση</span> : null}
                      {b.transportation_assistance ? <span className="text-emerald-600">🚌 Μεταφορά</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Preview */}
                    <button onClick={() => setPreviewBusinessId(user?.id || null)} title="Προεπισκόπηση"
                      className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-500 hover:text-emerald-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    {/* Edit */}
                    <button onClick={() => { setEditingBranch({ ...b }); setEditingId(b.id); }} title="Επεξεργασία"
                      className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 text-gray-500 hover:text-blue-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteBranch(b.id)} title="Διαγραφή"
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

      {/* Preview panel */}
      {previewBusinessId && (
        <BusinessProfilePanel
          businessUserId={previewBusinessId}
          onClose={() => setPreviewBusinessId(null)}
        />
      )}
    </div>
  );
}
