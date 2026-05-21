/**
 * Utility functions for Crack Origins
 * This file contains reusable helpers for date formatting, strings, and metadata.
 */

/**
 * Ensures an image URL is absolute, mostly for Open Graph tags.
 * Falls back to a default open graph image.
 */
export function getAbsoluteImageUrl(urlStr?: string, fallback = '/og-image.png'): string {
  if (!urlStr) return fallback;
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  return `https://crackorigins.com${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
}

/**
 * Format a Date to a readable string
 */
export function formatDate(date: Date | string | number): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(d);
}

/**
 * Small helper to pause execution
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Extracts reading time roughly assuming 200 words per minute.
 */
export function calculateReadingTime(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}
