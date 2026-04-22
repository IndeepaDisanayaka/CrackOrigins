'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, HelpCircle, CreditCard, Box, MessageCircle, Shield, Smartphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './FAQSection.module.css';
import { faqData, FAQItem } from '@/lib/faq';

const categories = ['All', 'General FAQs', 'Pricing & Delivery', 'Features'];

const getIcon = (faq: FAQItem) => {
  const q = faq.question.toLowerCase();
  if (q.includes('safe') || q.includes('secure')) return <Shield size={24} />;
  if (q.includes('mobile')) return <Smartphone size={24} />;
  if (q.includes('sell') || q.includes('payment') || q.includes('key')) return <CreditCard size={24} />;
  if (q.includes('contact') || q.includes('support')) return <MessageCircle size={24} />;
  if (faq.category === 'Features') return <Box size={24} />;
  return <HelpCircle size={24} />;
};

export default function FAQSection() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const faqRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const slug = searchParams.get('faq');
    if (slug) {
      setSelectedSlug(slug);
      setTimeout(() => {
        const element = faqRefs.current[slug];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [searchParams]);

  const handleQuestionClick = (slug: string) => {
    setSelectedSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set('faq', slug);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section className={styles.faqSection} id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <div className={styles.header}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Frequently Asked Questions
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          Can't find what you're looking for? Check out our <a href="/terms">full documentation</a>.
        </motion.p>
      </div>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeCategory === cat ? styles.active : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="Search questions..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.grid}>
        <AnimatePresence mode="popLayout">
          {filteredFAQs.map((faq, index) => (
            <motion.div
              key={faq.slug}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`${styles.faqItem} ${selectedSlug === faq.slug ? styles.selected : ''}`}
              onClick={() => handleQuestionClick(faq.slug)}
              ref={el => { faqRefs.current[faq.slug] = el; }}
            >
              <div className={styles.iconWrapper}>
                {getIcon(faq)}
              </div>
              <div className={styles.content}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredFAQs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>No questions found matching your search.</p>
        </div>
      )}
    </section>
  );
}
