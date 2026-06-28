import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://netra-ai.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: ['/student/', '/teacher/', '/parent/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
