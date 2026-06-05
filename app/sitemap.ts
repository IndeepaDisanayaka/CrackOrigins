import { MetadataRoute } from 'next';
import { getBlogPosts } from '@/lib/blog';
import { getGames } from '@/lib/admin-actions';
import { getIdeas } from '@/lib/idea-actions';
import { faqData } from '@/lib/faq';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getBlogPosts();
  const res = await getGames();
  const resIdeas = await getIdeas();
  const games = (res.success && res.games) ? res.games : [];
  const ideas = (resIdeas.success && resIdeas.ideas) ? resIdeas.ideas : [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://crackorigins.com';

  const blogPosts = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const gamePages = games.map((game: any) => ({
    url: `${baseUrl}/games/${game.slug}`,
    lastModified: new Date(game.time || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const ideaPages = ideas.map((idea: any) => ({
    url: `${baseUrl}/ideas/${idea.slug}`,
    lastModified: new Date(idea.lastUpdated || idea.time || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const faqPages = faqData.map((faq) => ({
    url: `${baseUrl}/?faq=${faq.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...gamePages,
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...ideaPages,
    {
      url: `${baseUrl}/ideas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...faqPages,
    ...blogPosts,
  ];
}
