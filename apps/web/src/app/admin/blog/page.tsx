'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string;
  author: string;
  readTime: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string;
  author: string;
  status: 'draft' | 'published';
}

const EMPTY_FORM: FormState = {
  title: '',
  excerpt: '',
  content: '',
  category: '',
  coverImageUrl: '',
  author: '',
  status: 'draft',
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .getBlogPosts()
      .then((res) => setPosts((res.items || []) as BlogPost[]))
      .catch((err: any) => toast.error(err?.message || 'Σφάλμα φόρτωσης'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      coverImageUrl: p.coverImageUrl,
      author: p.author,
      status: p.status,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async (status?: 'draft' | 'published') => {
    const payload = { ...form, status: status ?? form.status };
    if (payload.title.trim().length < 3) {
      toast.error('Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες');
      return;
    }
    if (payload.content.trim().length < 1) {
      toast.error('Το περιεχόμενο είναι υποχρεωτικό');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateBlogPost(editingId, payload);
        toast.success('Το άρθρο ενημερώθηκε');
      } else {
        await adminApi.createBlogPost(payload);
        toast.success('Το άρθρο δημιουργήθηκε');
      }
      closeEditor();
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const next = p.status === 'published' ? 'draft' : 'published';
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    try {
      await adminApi.updateBlogPost(p.id, { status: next });
      toast.success(next === 'published' ? 'Δημοσιεύτηκε' : 'Μετατράπηκε σε πρόχειρο');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: p.status } : x)));
    }
  };

  const remove = async (p: BlogPost) => {
    if (!confirm(`Διαγραφή του άρθρου "${p.title}";`)) return;
    const prev = posts;
    setPosts((list) => list.filter((x) => x.id !== p.id));
    try {
      await adminApi.deleteBlogPost(p.id);
      toast.success('Το άρθρο διαγράφηκε');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα διαγραφής');
      setPosts(prev);
    }
  };

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.length - publishedCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">📝</div>
          <div>
            <p className="font-bold text-gray-900">
              {posts.length} άρθρα · {publishedCount} δημοσιευμένα · {draftCount} πρόχειρα
            </p>
            <p className="text-xs text-gray-500">Δημιουργία και διαχείριση άρθρων blog</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
        >
          + Νέο άρθρο
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Κανένα άρθρο ακόμη"
          description="Δημιούργησε το πρώτο σου άρθρο για να εμφανιστεί στη δημόσια σελίδα blog"
        />
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xl">
                {p.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  '📄'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{p.title}</h3>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        p.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.status === 'published' ? 'Δημοσιευμένο' : 'Πρόχειρο'}
                    </span>
                    {p.category && (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                    {new Date(p.updatedAt).toLocaleString('el-GR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {p.excerpt && <p className="line-clamp-2 text-sm text-gray-600">{p.excerpt}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Επεξεργασία
                  </button>
                  <button
                    onClick={() => togglePublish(p)}
                    className="text-[11px] font-semibold text-purple-600 hover:underline"
                  >
                    {p.status === 'published' ? 'Απόσυρση' : 'Δημοσίευση'}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    Διαγραφή
                  </button>
                  {p.author && <span className="text-[11px] text-gray-400">από {p.author}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Επεξεργασία άρθρου' : 'Νέο άρθρο'}
              </h2>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Τίτλος *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="π.χ. 5 συμβουλές για να βρεις προσωπικό γρήγορα"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Κατηγορία</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    placeholder="π.χ. Συμβουλές"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Συγγραφέας</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => set('author', e.target.value)}
                    placeholder="StaffNow"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  URL εικόνας εξωφύλλου
                </label>
                <input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(e) => set('coverImageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Περίληψη (excerpt)
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => set('excerpt', e.target.value)}
                  rows={2}
                  placeholder="Σύντομη περιγραφή που εμφανίζεται στη λίστα"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Περιεχόμενο *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => set('content', e.target.value)}
                  rows={10}
                  placeholder="Γράψε εδώ το πλήρες κείμενο του άρθρου..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Ακύρωση
              </button>
              <button
                onClick={() => save('draft')}
                disabled={saving}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Αποθήκευση ως πρόχειρο
              </button>
              <button
                onClick={() => save('published')}
                disabled={saving}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Αποθήκευση...' : 'Δημοσίευση'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
