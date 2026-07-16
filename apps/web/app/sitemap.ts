import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/categories',
    '/products',
    '/flash-sales',
    '/promotions',
    '/about',
    '/blog',
    '/contact',
    '/faq',
    '/reviews',
    '/login',
    '/register',
    '/privacy-policy',
    '/terms',
  ];

  return routes.map((route) => ({
    url: `${env.siteUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}
