import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'], // Although admin is a modal, preserve the path pattern if any
    },
    sitemap: 'https://crackorigins.com/sitemap.xml',
  };
}
