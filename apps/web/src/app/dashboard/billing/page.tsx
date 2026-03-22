'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PLANS } from '@staffnow/config';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function BillingPage() {
  const { user, subscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const isWorker = user?.role === 'worker';

  const allPlans = Object.values(PLANS);
  const availablePlans = allPlans.filter(
    (plan) =>
      (isWorker && plan.id.startsWith('worker')) ||
      (!isWorker && plan.id.startsWith('business'))
  );

  const currentPlanId = subscription?.plan_id || 'free';

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
        <h1 className="text-2xl font-bold text-gray-900">Συνδρομή & Πληρωμές</h1>
        <p className="mt-1 text-gray-600">
          Διαχειρίσου το πλάνο και τις πληρωμές σου.
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Τρέχον Πλάνο</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <p className="text-xl font-bold text-gray-900">
              {allPlans.find((p) => p.id === currentPlanId)?.nameEl || 'Δωρεάν'}
            </p>
            <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
              {subscription?.status === 'active' ? 'Ενεργό' : 'Δωρεάν'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Διαθέσιμα Πλάνα</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {availablePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const features = plan.features;
          const featureLabels: string[] = [];

          if (features.maxSwipesPerMonth === null) {
            featureLabels.push('Απεριόριστα swipes');
          } else {
            featureLabels.push(`${features.maxSwipesPerMonth} swipes/μήνα`);
          }

          if (features.maxActiveMatches === null) {
            featureLabels.push('Απεριόριστα matches');
          } else if (features.maxActiveMatches) {
            featureLabels.push(`${features.maxActiveMatches} ενεργά matches`);
          }

          if (features.advancedFilters) featureLabels.push('Προηγμένα φίλτρα');
          if (features.boostedVisibility) featureLabels.push('Αυξημένη ορατότητα');
          if (features.verifiedBadge) featureLabels.push('Verified badge');
          if (features.favoriteLists) featureLabels.push('Λίστες αγαπημένων');
          if (features.prioritySupport) featureLabels.push('Priority support');

          return (
            <Card
              key={plan.id}
              className={isCurrent ? 'border-2 border-blue-600 shadow-md' : ''}
            >
              <CardContent className="p-6">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">{plan.nameEl}</p>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.priceMonthly}&euro;
                    </span>
                    <span className="ml-1 text-gray-500">/μήνα</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    ή {plan.priceYearly}&euro;/χρόνο
                  </p>
                </div>

                <ul className="mb-6 space-y-2">
                  {featureLabels.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    Τρέχον Πλάνο
                  </Button>
                ) : (
                  <Button className="w-full" disabled>
                    Αναβάθμιση (σύντομα)
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
