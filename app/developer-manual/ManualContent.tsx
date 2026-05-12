'use client';

import React, { useState } from 'react';
import styles from './manual.module.css';
import { Book, Code, Database, Lock, Settings, Layout, Share2, Globe } from 'lucide-react';

export default function ManualContent() {
  const [lang, setLang] = useState<'en' | 'si'>('en');

  const content = {
    en: {
      title: 'Developer Manual',
      introduction: {
        title: 'Introduction',
        text: 'Welcome to the Crack Origins Developer Manual. This guide is designed to help both beginners and experienced developers understand the inner workings of our platform. Crack Origins is built using modern web technologies to ensure high performance, security, and scalability.',
      },
      architecture: {
        title: 'Project Architecture',
        text: 'The project follows the Next.js App Router architecture. Here is a breakdown of the key directories:',
        items: [
          { name: 'app/', desc: 'Contains all the pages, layouts, and API routes. Each folder inside represents a route.' },
          { name: 'components/', desc: 'Reusable UI components (buttons, headers, cards) organized by category.' },
          { name: 'lib/', desc: 'Core logic, including database actions, authentication helpers, and utility functions.' },
          { name: 'public/', desc: 'Static assets like images, icons, and legal documents.' },
        ],
      },
      techStack: {
        title: 'Tech Stack',
        items: [
          { name: 'Next.js', desc: 'React framework for server-side rendering and static site generation.' },
          { name: 'MongoDB', desc: 'Primary database for user accounts, blogs, and ideas.' },
          { name: 'Firebase Admin', desc: 'Used for secure server-side operations and legacy data integration.' },
          { name: 'NextAuth.js', desc: 'Handles secure authentication with Google.' },
          { name: 'Framer Motion', desc: 'Used for premium animations and transitions.' },
        ],
      },
      auth: {
        title: 'Authentication & Roles',
        text: 'Access to the administrative parts of the site is restricted based on user roles.',
        roles: [
          { name: 'Owner', desc: 'Full access to everything, including financial records and admin management.' },
          { name: 'Admin', desc: 'Access to manage blogs, ideas, and games. Defined by a `ruleId` in the database.' },
          { name: 'User', desc: 'Standard access for viewing content and participating in ideas.' },
        ],
        warning: 'Role-based access is enforced in `lib/admin-actions.ts` using the `checkAdminStatus` function.',
      },
      management: {
        title: 'Managing Content',
        steps: [
          { title: 'Blogs', desc: 'Blogs are fetched from `lib/blog.ts` which interacts with MongoDB. Use the Admin Dashboard to create or delete posts.' },
          { title: 'Ideas', desc: 'Idea collaborations are managed in `app/ideas`. Every idea has a dynamic route based on its unique ID and slug.' },
          { title: 'Games', desc: 'Game listings are stored in the `games` collection in Firestore/MongoDB and managed via server actions.' },
        ],
      },
      seo: {
        title: 'SEO Best Practices',
        text: 'To maintain high visibility on Google, follow these rules:',
        rules: [
          'Always provide a unique `title` and `description` in `generateMetadata`.',
          'Ensure `alternates.canonical` points to the correct absolute URL.',
          'Use JSON-LD (structured data) for all articles and products.',
          'Verify that new pages are added to `app/sitemap.ts`.',
        ],
      },
    },
    si: {
      title: 'සංවර්ධක අත්පොත (Developer Manual)',
      introduction: {
        title: 'හැඳින්වීම',
        text: 'Crack Origins සංවර්ධක අත්පොත වෙත ඔබව සාදරයෙන් පිළිගනිමු. මෙම මාර්ගෝපදේශය ආරම්භකයින් සහ පළපුරුදු සංවර්ධකයින්ට අපගේ වෙබ් අඩවියේ ක්‍රියාකාරීත්වය තේරුම් ගැනීමට උපකාරී වේ. Crack Origins නිර්මාණය කර ඇත්තේ ඉහළ කාර්යසාධනයක්, ආරක්ෂාවක් සහ වර්ධනය වීමේ හැකියාවක් සහතික කිරීම සඳහා නවීන වෙබ් තාක්ෂණයන් භාවිතා කරමිනි.',
      },
      architecture: {
        title: 'ව්‍යාපෘති ව්‍යුහය (Project Architecture)',
        text: 'මෙම ව්‍යාපෘතිය Next.js App Router ව්‍යුහය අනුගමනය කරයි. ප්‍රධාන ෆෝල්ඩර මෙන්න:',
        items: [
          { name: 'app/', desc: 'සියලුම පිටු (pages), පිරිසැලසුම් (layouts) සහ API මාර්ග මෙහි ඇත.' },
          { name: 'components/', desc: 'නැවත භාවිතා කළ හැකි UI උපාංග (බොත්තම්, මෙනු, කාඩ්) මෙහි ඇත.' },
          { name: 'lib/', desc: 'දත්ත සමුදාය, ආරක්ෂාව සහ අනෙකුත් ප්‍රධාන තාර්කික කේත මෙහි ඇත.' },
          { name: 'public/', desc: 'පින්තූර, අයිකන වැනි ස්ථිතික ලිපිගොනු මෙහි ඇත.' },
        ],
      },
      techStack: {
        title: 'භාවිතා කර ඇති තාක්ෂණයන්',
        items: [
          { name: 'Next.js', desc: 'වෙබ් අඩවියේ වේගය සහ ක්‍රියාකාරීත්වය වැඩි කිරීමට භාවිතා කරන ප්‍රධාන Framework එක.' },
          { name: 'MongoDB', desc: 'පරිශීලක තොරතුරු, බ්ලොග් සහ අදහස් ගබඩා කරන ප්‍රධාන දත්ත සමුදාය.' },
          { name: 'Firebase Admin', desc: 'ආරක්ෂිත මෙහෙයුම් සහ දත්ත කළමනාකරණය සඳහා භාවිතා වේ.' },
          { name: 'NextAuth.js', desc: 'Google හරහා ආරක්ෂිතව වෙබ් අඩවියට ඇතුළු වීමට භාවිතා වේ.' },
          { name: 'Framer Motion', desc: 'වෙබ් අඩවියේ චලන (animations) සහ වෙනස්කම් සඳහා භාවිතා වේ.' },
        ],
      },
      auth: {
        title: 'ආරක්ෂාව සහ භූමිකාවන් (Authentication & Roles)',
        text: 'වෙබ් අඩවියේ පරිපාලනමය කොටස් වලට ප්‍රවේශය පරිශීලක මට්ටම අනුව සීමා කර ඇත.',
        roles: [
          { name: 'Owner', desc: 'මුළු පද්ධතියටම පූර්ණ ප්‍රවේශය ඇත.' },
          { name: 'Admin', desc: 'බ්ලොග්, ක්‍රීඩා සහ අදහස් කළමනාකරණය කිරීමට ප්‍රවේශය ඇත.' },
          { name: 'User', desc: 'සාමාන්‍ය පරිශීලකයින්ට ලැබෙන සාමාන්‍ය ප්‍රවේශය.' },
        ],
        warning: 'භූමිකාවන් පරීක්ෂා කිරීම `lib/admin-actions.ts` හි `checkAdminStatus` හරහා සිදු වේ.',
      },
      management: {
        title: 'අන්තර්ගතය කළමනාකරණය (Managing Content)',
        steps: [
          { title: 'බ්ලොග් (Blogs)', desc: 'Admin Dashboard එක හරහා බ්ලොග් ලිපි ඇතුළත් කිරීමට හෝ ඉවත් කිරීමට හැකිය.' },
          { title: 'අදහස් (Ideas)', desc: 'පරිශීලකයින් ඉදිරිපත් කරන අදහස් `app/ideas` හරහා පාලනය වේ.' },
          { title: 'ක්‍රීඩා (Games)', desc: 'අලුත් ක්‍රීඩා පිළිබඳ තොරතුරු Firestore/MongoDB හි ගබඩා වේ.' },
        ],
      },
      seo: {
        title: 'SEO උපදෙස්',
        text: 'Google සෙවුම් ප්‍රතිඵල වල ඉහළින්ම සිටීමට මෙම නීති අනුගමනය කරන්න:',
        rules: [
          'සෑම පිටුවකටම අනන්‍ය වූ `title` සහ `description` එකක් ලබා දෙන්න.',
          'සාර්ථක වෙබ් ලින්ක් (Canonical URLs) භාවිතා කරන්න.',
          'සෑම ලිපියකටම JSON-LD දත්ත ඇතුළත් කරන්න.',
          'නව පිටු `app/sitemap.ts` වෙත ඇතුළත් කර ඇති බව සහතික කරගන්න.',
        ],
      },
    }
  };

  const t = content[lang];

  return (
    <div className={styles.manualWrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <button 
          className={styles.langToggle} 
          onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
        >
          {lang === 'en' ? 'Switch to Sinhala (සිංහල)' : 'Switch to English'}
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Book size={28} /> {t.introduction.title}</h2>
        <p className={styles.content}>{t.introduction.text}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Layout size={28} /> {t.architecture.title}</h2>
        <p className={styles.content}>{t.architecture.text}</p>
        <div className={styles.cardGrid}>
          {t.architecture.items.map((item, i) => (
            <div key={i} className={styles.card}>
              <h3>{item.name}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Code size={28} /> {t.techStack.title}</h2>
        <div className={styles.cardGrid}>
          {t.techStack.items.map((item, i) => (
            <div key={i} className={styles.card}>
              <h3>{item.name}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Lock size={28} /> {t.auth.title}</h2>
        <p className={styles.content}>{t.auth.text}</p>
        <div className={styles.cardGrid}>
          {t.auth.roles.map((role, i) => (
            <div key={i} className={styles.card}>
              <h3>{role.name}</h3>
              <p>{role.desc}</p>
            </div>
          ))}
        </div>
        <div className={`${styles.alert} ${styles.alertWarning}`}>
          <Settings size={20} />
          <span>{t.auth.warning}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Database size={28} /> {t.management.title}</h2>
        <div className={styles.cardGrid}>
          {t.management.steps.map((step, i) => (
            <div key={i} className={styles.card}>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Globe size={28} /> {t.seo.title}</h2>
        <p className={styles.content}>{t.seo.text}</p>
        <ul className={styles.content} style={{ marginTop: '1rem' }}>
          {t.seo.rules.map((rule, i) => (
            <li key={i} style={{ marginBottom: '0.8rem' }}>{rule}</li>
          ))}
        </ul>
      </section>

      <div className={`${styles.alert} ${styles.alertInfo}`}>
        <Share2 size={20} />
        <span>
          {lang === 'en' 
            ? 'For any further questions, please contact the lead developer.' 
            : 'වැඩිදුර ප්‍රශ්න සඳහා කරුණාකර ප්‍රධාන සංවර්ධකයා අමතන්න.'}
        </span>
      </div>
    </div>
  );
}
