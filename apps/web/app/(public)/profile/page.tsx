import type { Metadata } from 'next';
import { ProfileView } from './profile-view';

export const metadata: Metadata = {
  title: 'Tài khoản của tôi',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Tài khoản của tôi</h1>
      <div className="mt-8">
        <ProfileView />
      </div>
    </section>
  );
}
