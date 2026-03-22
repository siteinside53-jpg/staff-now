'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const contactSchema = z.object({
  name: z.string().min(2, 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες'),
  email: z.string().email('Μη έγκυρη διεύθυνση email'),
  subject: z.string().min(3, 'Το θέμα πρέπει να έχει τουλάχιστον 3 χαρακτήρες'),
  message: z.string().min(10, 'Το μήνυμα πρέπει να έχει τουλάχιστον 10 χαρακτήρες'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      // TODO: Integrate with API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      reset();
      toast.success('Το μήνυμά σου στάλθηκε επιτυχώς!');
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
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
            Επικοινωνία
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Έχεις ερωτήσεις; Θέλεις να μάθεις περισσότερα; Στείλε μας μήνυμα.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                Φόρμα Επικοινωνίας
              </h2>
              <p className="text-sm text-gray-500">
                Συμπλήρωσε τα παρακάτω στοιχεία και θα σου απαντήσουμε εντός 24 ωρών.
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
                    Ευχαριστούμε!
                  </h3>
                  <p className="mt-2 text-green-700">
                    Το μήνυμά σου στάλθηκε επιτυχώς. Θα σου απαντήσουμε το
                    συντομότερο δυνατό.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Στείλε νέο μήνυμα
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Ονοματεπώνυμο
                    </label>
                    <Input
                      id="name"
                      placeholder="π.χ. Γιώργος Παπαδόπουλος"
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
                      Email
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
                      Θέμα
                    </label>
                    <Input
                      id="subject"
                      placeholder="π.χ. Ερώτηση για τιμολόγηση"
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
                      Μήνυμα
                    </label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder="Γράψε το μήνυμά σου εδώ..."
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
                    {isSubmitting ? 'Αποστολή...' : 'Αποστολή Μηνύματος'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Στοιχεία Επικοινωνίας
              </h2>
              <p className="mt-2 text-gray-600">
                Μπορείς επίσης να επικοινωνήσεις μαζί μας μέσω:
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
                  <p className="font-medium text-gray-900">Email</p>
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
                  <p className="font-medium text-gray-900">Τηλέφωνο</p>
                  <p className="mt-1 text-gray-600">+30 210 1234 567</p>
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
                  <p className="font-medium text-gray-900">Διεύθυνση</p>
                  <p className="mt-1 text-gray-600">
                    Αθήνα, Ελλάδα
                  </p>
                </div>
              </div>
            </div>

            {/* Business hours */}
            <div className="rounded-lg bg-gray-50 p-6">
              <h3 className="font-semibold text-gray-900">Ωράριο Εξυπηρέτησης</h3>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Δευτέρα - Παρασκευή: 09:00 - 18:00</p>
                <p>Σάββατο: 10:00 - 14:00</p>
                <p>Κυριακή: Κλειστά</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
