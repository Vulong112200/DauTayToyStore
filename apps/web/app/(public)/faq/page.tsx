import type { Metadata } from 'next';
import type { FaqEntryView } from '@repo/contracts';
import { faqApi } from '@/lib/api/faq';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp',
  description: 'Giải đáp các câu hỏi thường gặp khi mua sắm tại DauTayToy Store.',
};

export default async function FaqPage() {
  const faqs = await faqApi.list();

  const grouped = faqs.reduce<Record<string, FaqEntryView[]>>((acc, faq) => {
    const key = faq.category ?? 'Khác';
    acc[key] = acc[key] ? [...acc[key], faq] : [faq];
    return acc;
  }, {});

  return (
    <section className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Câu hỏi thường gặp</h1>

        {Object.keys(grouped).length === 0 ? (
          <p className="mt-8 text-muted-foreground">Chưa có câu hỏi nào.</p>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h2 className="font-display text-lg font-bold text-primary">{category}</h2>
                <div className="mt-4 space-y-3">
                  {items.map((faq) => (
                    <details key={faq.id} className="rounded-2xl border border-border p-4">
                      <summary className="cursor-pointer font-semibold">{faq.question}</summary>
                      <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
