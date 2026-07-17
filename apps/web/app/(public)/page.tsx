import { CategoryHighlights } from '@/components/home/category-highlights';
import { FeaturedProducts } from '@/components/home/featured-products';
import { FlashSaleHighlight } from '@/components/home/flash-sale-highlight';
import { HeroSection } from '@/components/home/hero-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FlashSaleHighlight />
      <CategoryHighlights />
      <FeaturedProducts />
    </>
  );
}
