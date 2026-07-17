'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pastel-pink via-background to-pastel-blue">
      <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col justify-center gap-6"
        >
          <span className="w-fit rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            🎉 Miễn phí vận chuyển cho đơn từ 500.000₫
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Đồ chơi an toàn,
            <br />
            <span className="text-primary">nuôi dưỡng tuổi thơ</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            Hàng ngàn mẫu đồ chơi giáo dục, lắp ráp và sáng tạo chính hãng — chọn lựa an tâm cho
            bé yêu của bạn.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/products">
                Mua sắm ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/products">Xem sản phẩm nổi bật</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="relative flex items-center justify-center"
        >
          <div className="relative aspect-[960/536] w-full max-w-xl overflow-hidden rounded-[2.5rem] shadow-lg">
            <Image
              src="/hero-banner.jpg"
              alt="Dâu Tây Toys - Nơi trí tưởng tượng bay xa"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
