'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { BusinessProfilePanel } from '@/components/dashboard/business-profile-panel';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}λ πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ω πριν`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}η πριν`;
  return new Date(dateStr).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
}

export default function InterestsPage() {
  const { user } = useAuth();
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [viewingBusinessId, setViewingBusinessId] = useState<string | null>(null);

  const isWorker = user?.role === 'worker';

  /*
    ΜΟΝΟ ΟΣΑ ΠΕΡΙΜΕΝΟΥΝ ΑΠΑΝΤΗΣΗ.

    Η λίστα έδειχνε και όσους έχουν ΗΔΗ γίνει match. Ο μετρητής όμως στην αρχική
    μετράει μόνο τα αναπάντητα — οπότε ο χρήστης έβλεπε «Αιτήματα 0» και από
    κάτω μια επιχείρηση, και δικαίως δεν καταλάβαινε τι κοιτάει. Όσοι έχουν
    γίνει match ζουν ήδη στα Matches και στα Μηνύματα· εδώ δεν έχουν λόγο.
  */
  const pending = interests.filter((i: any) => !(i.is_matched > 0 || i.liked_back));

  useEffect(() => {
    async function load() {
      try {
        const res = await (api as any).interests.received() as any;
        if (res.success) setInterests(res.data || []);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  const handleLikeBack = async (interest: any) => {
    const targetId = isWorker ? interest.swiper_id : interest.swiper_id;
    setLiking(targetId);
    try {
      // Direct match via like-back endpoint
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`https://staffnow-api-production.siteinside53.workers.dev/interests/like-back/${targetId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json() as any;

      if (data.success && data.data?.matched) {
        toast.success('🎉 Match! Μπορείτε τώρα να ξεκινήσετε συνομιλία!');
        setInterests((prev) => prev.map((i) => i.swiper_id === targetId ? { ...i, is_matched: 1, liked_back: true, conversation_id: data.data.conversationId } : i));
      } else {
        toast.error(data.error?.message || 'Κάτι πήγε στραβά');
      }
    } catch {
      toast.error('Κάτι πήγε στραβά');
    } finally {
      setLiking(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">👋 Ποιος Ενδιαφέρθηκε</h1>
        <p className="mt-1 text-gray-600">
          {isWorker
            ? 'Επιχειρήσεις που σε έκαναν like. Πάτα "Ενδιαφέρομαι" για match!'
            : 'Εργαζόμενοι που ενδιαφέρθηκαν για τις αγγελίες σου.'}
        </p>
        {/*
          Ο ΜΕΤΡΗΤΗΣ ΜΕΤΡΑΕΙ ΑΥΤΟ ΠΟΥ ΦΑΙΝΕΤΑΙ ΑΠΟ ΚΑΤΩ.

          Έγραφε το σύνολο (`interests.length`) ενώ η λίστα δείχνει μόνο τα
          αναπάντητα (`pending`), οπότε έλεγε «3 ενδιαφερόμενοι» και από κάτω
          είχε δύο κάρτες. Όσοι λείπουν έχουν ήδη γίνει match — δεν χάθηκαν,
          ζουν στα Matches, και τώρα το λέει ρητά με σύνδεσμο για να πάει
          κανείς να τους δει.
        */}
        {pending.length > 0 && (
          <Badge className="mt-2 bg-blue-100 text-blue-700">
            {pending.length}{' '}
            {pending.length === 1 ? 'περιμένει απάντηση' : 'περιμένουν απάντηση'}
          </Badge>
        )}
        {interests.length > pending.length && (
          <p className="mt-2 text-sm text-gray-500">
            Άλλα {interests.length - pending.length} έγιναν ήδη match —{' '}
            <a href="/dashboard/matches" className="font-medium text-blue-600 hover:underline">
              δες τα στα Matches
            </a>
            .
          </p>
        )}
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Κανένα αίτημα σε αναμονή"
          description={isWorker
            ? 'Εδώ εμφανίζονται όσοι σε διάλεξαν και περιμένουν απάντηση.'
            : 'Εδώ εμφανίζονται όσοι σε διάλεξαν και περιμένουν απάντηση.'}
        />
      ) : (
        <div className="space-y-4">
          {pending.map((item: any) => {
            const isMatched = item.is_matched > 0 || item.liked_back;

            if (isWorker) {
              // Worker sees businesses that liked them
              return (
                <Card key={item.swipe_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {item.logo_url ? (
                        <img src={item.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                          {item.company_name?.[0]?.toUpperCase() || '🏢'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 truncate">{item.company_name || 'Επιχείρηση'}</h3>
                          {isMatched && <Badge className="bg-emerald-100 text-emerald-700 text-xs">✓ Match</Badge>}
                        </div>
                        {item.description && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{item.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                          {item.region && <span>📍 {item.region}</span>}
                          {item.staff_housing === 1 && <span className="text-emerald-600">🏠 Διαμονή</span>}
                          {item.meals_provided === 1 && <span className="text-emerald-600">🍽️ Σίτιση</span>}
                          <span>🕐 {timeAgo(item.liked_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5 sm:gap-2">
                        <button onClick={() => setViewingBusinessId(item.swiper_id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50">
                          👤
                        </button>
                        {isMatched ? (
                          <a href="/dashboard/messages" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700">
                            💬
                          </a>
                        ) : (
                          <button onClick={() => handleLikeBack(item)} disabled={liking === item.swiper_id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {liking === item.swiper_id ? '…' : '✓'}
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              return (
                <Card key={item.swipe_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" className="h-14 w-14 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                          {item.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 truncate">{item.full_name || 'Εργαζόμενος'}</h3>
                          {isMatched && <Badge className="bg-emerald-100 text-emerald-700 text-xs">✓ Match</Badge>}
                        </div>
                        {item.bio && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{item.bio}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                          {item.city && <span>📍 {item.city}{item.region ? `, ${item.region}` : ''}</span>}
                          {item.years_of_experience && <span>⭐ {item.years_of_experience} χρόνια</span>}
                          {item.job_title && <span>📋 {item.job_title}</span>}
                          <span>🕐 {timeAgo(item.liked_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5 sm:gap-2">
                        <button onClick={() => setViewingProfileId(item.swiper_id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50">
                          👤
                        </button>
                        {isMatched ? (
                          <a href="/dashboard/messages" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700">
                            💬
                          </a>
                        ) : (
                          <button onClick={() => handleLikeBack(item)} disabled={liking === item.swiper_id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                            {liking === item.swiper_id ? '…' : '✓'}
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>
      )}

      {viewingProfileId && (
        <WorkerProfilePanel
          workerId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}

      {viewingBusinessId && (
        <BusinessProfilePanel
          businessUserId={viewingBusinessId}
          onClose={() => setViewingBusinessId(null)}
        />
      )}
    </div>
  );
}
