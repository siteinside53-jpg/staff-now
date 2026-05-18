'use client';

import { MetricCard } from '@/components/admin/ui/metric-card';
import { KpiChartCard } from '@/components/admin/ui/kpi-chart-card';
import { useAnalyticsStream } from '@/components/admin/lib/use-analytics-stream';
import { MOCK_FUNNEL } from '@/components/admin/lib/mock-data';

function formatTime(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AnalyticsPage() {
  const { snapshot, status, lastHeartbeat } = useAnalyticsStream();
  const series = snapshot?.series ?? null;
  const stats = snapshot?.stats ?? null;
  const loading = snapshot === null;

  const dauArr: number[] = series?.dau || [];
  const signupsArr: number[] = series?.signups || [];
  const matchesArr: number[] = series?.matches || [];
  const messagesArr: number[] = series?.messages || [];

  const dau = dauArr.length ? dauArr[dauArr.length - 1] : 0;
  const wau = dauArr.length ? Math.round(dauArr.slice(-7).reduce((s, v) => s + v, 0) / Math.min(dauArr.slice(-7).length, 7)) : 0;
  const mau = dauArr.length ? Math.round(dauArr.reduce((s, v) => s + v, 0)) : 0;

  const totalSignups = signupsArr.reduce((s, v) => s + v, 0);
  const totalMatches = matchesArr.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      {/* Live connection indicator — same pattern as Security > Live */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-xs">
        <span
          className={`flex h-2.5 w-2.5 rounded-full ${
            status === 'open'
              ? 'bg-emerald-500 animate-pulse'
              : status === 'connecting'
                ? 'bg-amber-400'
                : 'bg-rose-500'
          }`}
        />
        <span className="font-semibold text-gray-700">
          {status === 'open'
            ? 'Live · ενημερώνεται κάθε 5 δευτερόλεπτα'
            : status === 'connecting'
              ? 'Σύνδεση...'
              : 'Αποσυνδεδεμένο'}
        </span>
        <span className="ml-auto text-gray-400">
          Τελευταία ενημέρωση: {formatTime(snapshot?.ts || lastHeartbeat)}
        </span>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Active Users</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Daily Active Users" value={dau} icon="📅" tone="info" loading={loading} />
          <MetricCard label="Weekly Active Users" value={wau} icon="📆" tone="info" loading={loading} />
          <MetricCard label="Monthly Active Users" value={mau} icon="🗓" tone="success" loading={loading} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Ανάπτυξη (14 ημέρες)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiChartCard
            title="Εγγραφές"
            value={totalSignups}
            series={signupsArr.length ? signupsArr : [0, 0, 0, 0, 0, 0, 0]}
            color="emerald"
            subtitle={<span className="text-gray-500">{totalSignups} νέοι χρήστες</span>}
          />
          <KpiChartCard
            title="Matches"
            value={totalMatches}
            series={matchesArr.length ? matchesArr : [0, 0, 0, 0, 0, 0, 0]}
            color="purple"
            subtitle={<span className="text-gray-500">{totalMatches} νέα matches</span>}
          />
          <KpiChartCard
            title="Μηνύματα"
            value={messagesArr.reduce((s, v) => s + v, 0)}
            series={messagesArr.length ? messagesArr : [0, 0, 0, 0, 0, 0, 0]}
            color="blue"
          />
          <KpiChartCard
            title="Νέες αγγελίες"
            value={series?.jobs?.reduce((s: number, v: number) => s + v, 0) || 0}
            series={series?.jobs?.length ? series.jobs : [0, 0, 0, 0, 0, 0, 0]}
            color="amber"
          />
        </div>
      </section>

      <section>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-bold text-gray-900">Conversion Funnel</h3>
            <p className="text-xs text-gray-500">Από εγγραφή έως paid subscription (μέσος όρος)</p>
          </div>
          <div className="space-y-3">
            {MOCK_FUNNEL.map((stage, i) => {
              const color = i === 0 ? 'bg-blue-500' : i < 3 ? 'bg-indigo-500' : i < 5 ? 'bg-purple-500' : 'bg-emerald-500';
              const dropOffPct = i > 0 ? Math.round(((MOCK_FUNNEL[i - 1].count - stage.count) / MOCK_FUNNEL[i - 1].count) * 100) : 0;
              return (
                <div key={stage.stage}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{stage.stage}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {i > 0 && dropOffPct > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">−{dropOffPct}%</span>
                      )}
                      <span className="font-bold text-gray-900 tabular-nums">{stage.count.toLocaleString('el-GR')}</span>
                      <span className="text-gray-400">({stage.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${stage.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-gray-400">Activation Rate</p>
              <p className="mt-1 text-xl font-bold text-blue-700">72%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-gray-400">Match Rate</p>
              <p className="mt-1 text-xl font-bold text-purple-700">39%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-gray-400">Paid Conversion</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">11%</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Σύνολο χρηστών" value={stats?.users?.total ?? 0} icon="👥" tone="info" loading={loading} />
          <MetricCard label="Συνολικά jobs" value={stats?.jobs?.total ?? 0} icon="💼" tone="info" loading={loading} />
          <MetricCard label="Συνολικά matches" value={stats?.matches?.total ?? 0} icon="🎯" tone="info" loading={loading} />
          <MetricCard label="Active subs" value={stats?.subscriptions?.active ?? 0} icon="🎟️" tone="info" loading={loading} />
        </div>
      </section>
    </div>
  );
}
