'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useT } from '@/i18n/locale-provider';

type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactPage(): React.JSX.Element {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('contact.validation.nameMin')),
        email: z.string().email(t('contact.validation.emailInvalid')),
        subject: z.string().min(3, t('contact.validation.subjectMin')),
        message: z.string().min(10, t('contact.validation.messageMin')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        'https://staffnow-api-production.siteinside53.workers.dev';
      const res = await fetch(`${apiBase}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Request failed');
      }
      setIsSubmitted(true);
      reset();
      toast.success(t('contact.toast.success'));
    } catch (err) {
      const msg =
        err instanceof Error && err.message !== 'Request failed'
          ? err.message
          : t('contact.toast.error');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            {t('contact.header.title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t('contact.header.subtitle')}
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('contact.form.title')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('contact.form.subtitle')}
              </p>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="rounded-lg bg-green-50 p-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-semibold text-green-800">
                    {t('contact.success.title')}
                  </h3>
                  <p className="mt-2 text-green-700">
                    {t('contact.success.message')}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsSubmitted(false)}
                  >
                    {t('contact.success.newMessage')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t('contact.form.name')}
                    </label>
                    <Input
                      id="name"
                      placeholder={t('contact.form.namePlaceholder')}
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t('contact.form.email')}
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t('contact.form.subject')}
                    </label>
                    <Input
                      id="subject"
                      placeholder={t('contact.form.subjectPlaceholder')}
                      {...register('subject')}
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t('contact.form.message')}
                    </label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder={t('contact.form.messagePlaceholder')}
                      {...register('message')}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('contact.form.sending') : t('contact.form.submit')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('contact.info.title')}
              </h2>
              <p className="mt-2 text-gray-600">
                {t('contact.info.subtitle')}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t('contact.info.email')}</p>
                  <p className="mt-1 text-gray-600">info@staffnow.gr</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t('contact.info.phone')}</p>
                  <p className="mt-1 text-gray-600">+30 697 155 3942</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t('contact.info.address')}</p>
                  <p className="mt-1 text-gray-600">
                    {t('contact.info.addressValue')}
                  </p>
                </div>
              </div>
            </div>

            {/* Business hours */}
            <div className="rounded-lg bg-gray-50 p-6">
              <h3 className="font-semibold text-gray-900">{t('contact.hours.title')}</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>{t('contact.hours.weekdays')}</p>
                <p>{t('contact.hours.saturday')}</p>
                <p>{t('contact.hours.sunday')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
