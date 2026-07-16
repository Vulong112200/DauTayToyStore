import type { Metadata } from 'next';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với DauTayToy Store để được hỗ trợ.',
};

export default function ContactPage() {
  return (
    <section className="container py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Liên hệ với chúng tôi</h1>
        <p className="mt-2 text-muted-foreground">
          Có câu hỏi hoặc cần hỗ trợ? Gửi tin nhắn cho chúng tôi, đội ngũ DauTayToy Store sẽ phản
          hồi trong thời gian sớm nhất.
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
