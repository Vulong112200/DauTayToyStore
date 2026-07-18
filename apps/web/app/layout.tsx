import type { Metadata } from 'next';
import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { env } from '@/lib/env';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const baloo2 = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'DauTayToy Store - Đồ chơi trẻ em chính hãng',
    template: '%s | DauTayToy Store',
  },
  description:
    'DauTayToy Store - Cửa hàng đồ chơi trẻ em chính hãng, an toàn, đa dạng mẫu mã, giao hàng toàn quốc.',
  keywords: ['đồ chơi trẻ em', 'đồ chơi lắp ráp', 'đồ chơi giáo dục', 'DauTayToy Store'],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'DauTayToy Store',
    title: 'DauTayToy Store - Đồ chơi trẻ em chính hãng',
    description: 'Cửa hàng đồ chơi trẻ em chính hãng, an toàn, đa dạng mẫu mã, giao hàng toàn quốc.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} ${baloo2.variable} font-sans`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
