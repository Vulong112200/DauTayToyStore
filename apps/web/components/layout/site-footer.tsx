import Link from 'next/link';

const FOOTER_SECTIONS = [
  {
    title: 'Về chúng tôi',
    links: [
      { href: '/about', label: 'Giới thiệu' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Liên hệ' },
    ],
  },
  {
    title: 'Hỗ trợ khách hàng',
    links: [
      { href: '/faq', label: 'Câu hỏi thường gặp' },
      { href: '/order-tracking', label: 'Tra cứu đơn hàng' },
      { href: '/reviews', label: 'Đánh giá khách hàng' },
    ],
  },
  {
    title: 'Chính sách',
    links: [
      { href: '/privacy-policy', label: 'Chính sách bảo mật' },
      { href: '/terms', label: 'Điều khoản dịch vụ' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-extrabold text-primary">🧸 DauTayToy Store</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Đồ chơi trẻ em chính hãng, an toàn và sáng tạo — đồng hành cùng tuổi thơ của bé.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DauTayToy Store. All rights reserved.
      </div>
    </footer>
  );
}
