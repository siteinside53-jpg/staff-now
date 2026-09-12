'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/locale-provider';

const FAQ_COUNT = 12;

export function FaqContent() {
  const t = useT();

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`faq.items.${i}.q`),
    answer: t(`faq.items.${i}.a`),
  }));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            {t('faq.header.title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t('faq.header.subtitle')}
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
              open={index === 0}
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                <span className="pr-4">{faq.question}</span>
                <svg
                  className="h-5 w-5 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="border-t px-6 pb-5 pt-4">
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('faq.contact.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('faq.contact.subtitle')}
          </p>
          <Button asChild className="mt-6">
            <Link href="/contact">{t('faq.contact.cta')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
