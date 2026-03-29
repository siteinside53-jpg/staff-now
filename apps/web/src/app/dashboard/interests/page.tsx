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

  const isWorker = user?.role === 'worker';

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
        <h1 className="text-2xl font-bold text-gray-900">❤️ Ποιος Ενδιαφέρθηκε</h1>
        <p className="mt-1 text-gray-600">
          {isWorker
            ? 'Επιχειρήσεις που σε έκαναν like. Πάτα "Ενδιαφέρομαι" για match!'
            : 'Εργαζόμενοι που ενδιαφέρθηκαν για τις αγγελίες σου.'}
        </p>
        {interests.length > 0 && (
          <Badge className="mt-2 bg-blue-100 text-blue-700">{interests.length} ενδιαφερόμενοι</Badge>
        )}
      </div>

      {interests.length === 0 ? (
        <EmptyState
          title="Κανένας δεν ενδιαφέρθηκε ακόμα"
          description={isWorker
            ? 'Συμπλήρωσε το προφίλ σου για να σε βρουν οι επιχειρήσεις!'
            : 'Δημοσίευσε αγγελίες για να προσελκύσεις εργαζομένους!'}
        />
      ) : (
        <div className="space-y-4">
          {interests.map((item: any) => {
            const isMatched = item.is_matched > 0 || item.liked_back;

            if (isWorker) {
              // Worker sees businesses that liked them
              return (
                <Card key={item.swipe_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
                        {item.company_name?.[0]?.toUpperCase() || '🏢'}
                      </div>
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
                      <div className="flex-shrink-0">
                        {isMatched ? (
                          <a href="/dashboard/messages" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                            💬 Chat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleLikeBack(item)}
                            disabled={liking === item.swiper_id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {liking === item.swiper_id ? '...' : '❤️ Ενδιαφέρομαι'}
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              // Business sees workers that liked their jobs
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
                      <div className="flex-shrink-0">
                        {isMatched ? (
                          <a href="/dashboard/messages" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                            💬 Chat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleLikeBack(item)}
                            disabled={liking === item.swiper_id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {liking === item.swiper_id ? '...' : '❤️ Ενδιαφέρομαι'}
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
    </div>
  );
}
