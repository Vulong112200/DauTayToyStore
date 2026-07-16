import { CategoryHighlights } from '@/components/home/category-highlights';
import { FeaturedProducts } from '@/components/home/featured-products';
import { HeroSection } from '@/components/home/hero-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoryHighlights />
      <FeaturedProducts />
    </>
  );
}
