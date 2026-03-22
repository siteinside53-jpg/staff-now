'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@staffnow/validation';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await api.auth.forgotPassword(data.email);
      setIsSubmitted(true);
      toast.success('Στάλθηκε email επαναφοράς κωδικού!');
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-900">
            Ελέγξτε το Email σας
          </h2>
          <p className="mt-3 text-gray-600">
            Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο
            επαναφοράς κωδικού. Ελέγξτε και τον φάκελο spam.
          </p>
          <div className="mt-8 space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Επιστροφή στη Σύνδεση</Link>
            </Button>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Δοκίμασε ξανά με διαφορετικό email
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Επαναφορά Κωδικού
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Εισάγετε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Αποστολή...' : 'Αποστολή Συνδέσμου'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Θυμάσαι τον κωδικό σου;{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Σύνδεση
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
