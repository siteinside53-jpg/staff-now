'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@staffnow/validation';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useT } from '@/i18n/locale-provider';

type ResetFormData = {
  password: string;
  confirmPassword: string;
};

function ResetPasswordForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Ο κωδικός επαναφοράς έρχεται από το email, όχι από τη φόρμα — γι' αυτό το
  // schema εδώ έχει μόνο τα δύο πεδία που βλέπει ο χρήστης.
  const resetFormSchema = useMemo(
    () =>
      z
        .object({
          password: passwordSchema,
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('authPages.resetPassword.passwordsMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetFormSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsSubmitting(true);
    try {
      await api.auth.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setIsDone(true);
    } catch (err) {
      // Ο διακομιστής εξηγεί αν ο σύνδεσμος έληξε ή αν ο κωδικός δεν πληροί
      // τους κανόνες. Δείχνουμε το δικό του μήνυμα αντί για γενικόλογο λάθος.
      toast.error((err as Error)?.message || t('authPages.resetPassword.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ο χρήστης άνοιξε τη σελίδα χωρίς σύνδεσμο από email.
  if (!token) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">{t('authPages.resetPassword.invalidLink.title')}</h2>
          <p className="mt-3 text-gray-600">
            {t('authPages.resetPassword.invalidLink.message')}
          </p>
          <div className="mt-8">
            <Button asChild className="w-full" size="lg">
              <Link href="/auth/forgot-password">{t('authPages.resetPassword.invalidLink.requestNew')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isDone) {
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
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-900">{t('authPages.resetPassword.done.title')}</h2>
          <p className="mt-3 text-gray-600">
            {t('authPages.resetPassword.done.message')}
          </p>
          <div className="mt-8">
            <Button asChild className="w-full" size="lg">
              <Link href="/auth/login">{t('authPages.resetPassword.done.login')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('authPages.resetPassword.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('authPages.resetPassword.subtitle')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('authPages.resetPassword.newPassword')}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('authPages.resetPassword.passwordHint')}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              {t('authPages.resetPassword.confirmPassword')}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t('authPages.resetPassword.saving') : t('authPages.resetPassword.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
            {t('authPages.resetPassword.backToLogin')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  // Το useSearchParams χρειάζεται Suspense για να χτιστεί η σελίδα στατικά.
  return (
    <Suspense fallback={<Card><CardContent className="p-8" /></Card>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
