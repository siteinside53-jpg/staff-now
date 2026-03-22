'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PLANS } from '@staffnow/config';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface SubscriptionInfo {
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'none';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function BillingPage() {
  const { user, profile, subscription, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isWorker = user?.role === 'worker';

  const allPlans = Object.values(PLANS);
  const availablePlans = allPlans.filter(
    (plan) =>
      (isWorker && plan.id.startsWith('worker')) ||
      (!isWorker && plan.id.startsWith('business'))
  );

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await api.billing.getSubscription();
        setSubscriptionInfo(res);
      } catch {
        setSubscriptionInfo({ planId: 'free', status: 'none' });
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setActionLoading(planId);
    try {
      const res = await api.billing.createCheckout(planId);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Αποτυχία δημιουργίας πληρωμής.');
      }
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Είσαι σίγουρος ότι θέλεις να ακυρώσεις τη συνδρομή σου;')) {
      return;
    }
    setActionLoading('cancel');
    try {
      await api.billing.cancelSubscription();
      await refreshUser();
      toast.success('Η συνδρομή σου ακυρώθηκε.');
      const res = await api.billing.getSubscription();
      setSubscriptionInfo(res);
    } catch {
      toast.error('Αποτυχία ακύρωσης. Δοκίμασε ξανά.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const currentPlanId =
    subscriptionInfo?.planId || subscription?.planId || 'free';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Συνδρομή & Πληρωμές</h1>
        <p className="mt-1 text-gray-600">
          Διαχειρίσου το πλάνο και τις πληρωμές σου.
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Τρέχον Πλάνο
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold text-gray-900">
                  {availablePlans.find((p) => p.id === currentPlanId)?.nameEl ||
                    'Δωρεάν'}
                </p>
                <Badge
                  variant={
                    subscriptionInfo?.status === 'active'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {subscriptionInfo?.status === 'active'
                    ? 'Ενεργό'
                    : subscriptionInfo?.status === 'cancelled'
                      ? 'Ακυρωμένο'
                      : 'Δωρεάν'}
                </Badge>
              </div>
              {subscriptionInfo?.currentPeriodEnd && (
                <p className="mt-1 text-sm text-gray-500">
                  {subscriptionInfo.cancelAtPeriodEnd
                    ? 'Λήγει στις '
                    : 'Ανανέωση στις '}
                  {new Date(
                    subscriptionInfo.currentPeriodEnd
                  ).toLocaleDateString('el-GR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            {subscriptionInfo?.status === 'active' &&
              !subscriptionInfo.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                >
                  {actionLoading === 'cancel'
                    ? 'Ακύρωση...'
                    : 'Ακύρωση Συνδρομής'}
                </Button>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Διαθέσιμα Πλάνα
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {availablePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.popular;
          return (
            <Card
              key={plan.id}
              className={`relative ${
                isPopular
                  ? 'border-2 border-blue-600 shadow-md'
                  : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    Δημοφιλές
                  </Badge>
                </div>
              )}
              <CardContent className="p-6">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">
                    {plan.nameEl}
                  </p>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}&euro;
                    </span>
                    {plan.price > 0 && (
                      <span className="ml-1 text-gray-500">/μήνα</span>
                    )}
                  </div>
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    Τρέχον Πλάνο
                  </Button>
                ) : plan.price === 0 ? (
                  <Button disabled className="w-full" variant="outline">
                    Δωρεάν
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={actionLoading === plan.id}
                  >
                    {actionLoading === plan.id
                      ? 'Μετάβαση...'
                      : isCurrent
                        ? 'Τρέχον'
                        : 'Αναβάθμιση'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
