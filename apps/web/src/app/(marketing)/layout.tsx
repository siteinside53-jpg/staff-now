import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { LoginModalProvider } from '@/components/auth/login-modal';
import { LiveActivityToasts } from '@/components/marketing/live-activity-toasts';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoginModalProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <LiveActivityToasts />
    </LoginModalProvider>
  );
}
