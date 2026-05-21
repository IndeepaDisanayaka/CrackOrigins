'use client';

import React, { useState } from 'react';
import styles from './manual.module.css';
import commonStyles from '../page.module.css';
import { Gamepad2, ArrowLeft, BookOpen, Clock, Code, Database, Lock, Settings, Layout, Zap, Shield, FileCode, Globe } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ThemeToggle from '../../components/ThemeToggle';
import Image from 'next/image';

interface ManualSubsection {
  subtitle: string;
  text?: string;
  items?: string[];
  code?: string;
  note?: string;
}

interface ManualSection {
  id: string;
  title: string;
  text?: string;
  subsections?: ManualSubsection[];
  items?: string[];
}

interface LanguageContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
  };
  sections: ManualSection[];
}

const ManualContent = () => {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const lastUpdated = "May 2026";

  const content: Record<'en' | 'si', LanguageContent> = {
    en: {
      hero: {
        badge: "TECHNICAL MASTER MANUAL",
        title: "Developer Documentation & <span class='text-gradient'>System Architecture</span>",
        subtitle: "A deep-dive guide for engineers to maintain, scale, and understand the Crack Origins ecosystem."
      },
      sections: [
        {
          id: "step-by-step",
          title: "1. Step-by-Step System Flow",
          text: "To understand the system deeply, follow this lifecycle of a typical user request.",
          subsections: [
            {
              subtitle: "Step A: Authentication & Security",
              text: "When a user hits 'Login', the request reaches `auth.ts` -> Google Provider. Upon success, `callbacks: { signIn }` calls `syncUserRecord` to link or create the account in MongoDB.",
              note: "Encrypted email logic in `lib/crypto.ts` ensures PII is never stored in plain text."
            },
            {
              subtitle: "Step B: Data Hydration & RBAC",
              text: "The `AuthContext` (lib/contexts/AuthContext.tsx) pulls the full account record. It hydrates the React state with `isAdmin`, `isOwner`, and granular `permissions` from the `account_rules` collection.",
              code: "const { user, permissions } = useAuth();\nif (permissions['blogs']?.includes('WRITE')) { ... }"
            },
            {
              subtitle: "Step C: Server Action Execution",
              text: "When an Admin adds a game or blog, they call a Server Action (e.g., `listGame` in `lib/admin-actions/games.ts`). This uses the native MongoDB driver via `getMongoDb` to perform atomic updates and ensure data integrity."
            }
          ]
        },
        {
          id: "architecture",
          title: "2. Core System Architecture",
          text: "Crack Origins is built on a high-performance architecture using Next.js App Router (v16) and a native MongoDB infrastructure for all persistent data storage.",
          subsections: [
            {
              subtitle: "Native MongoDB Strategy",
              text: "We use the official `mongodb` driver for all database operations. This ensures maximum performance, atomic operations (like `$inc` for XP), and complex aggregation pipelines.",
              code: "// Example: Reading a user directly from MongoDB\nconst db = await getMongoDb();\nconst user = await db.collection('accounts').findOne({ uid: targetUid });"
            }
          ]
        },
        {
          id: "investments",
          title: "3. Offers & Invest Points",
          text: "A unique system where users spend XP (Invest Points) to unlock software giveaways or discounts.",
          subsections: [
            {
              subtitle: "How Investing Works",
              text: "Users call `investXP(uid, offerId, points)`. This uses MongoDB's `$inc` to subtract XP from the user and adds a record to the `offer_investments` collection.",
              code: "// Logic: lib/admin-actions/payments.ts\nawait db.collection('accounts').updateOne({ uid }, { $inc: { xp: -points } });\nawait db.collection('offer_investments').insertOne({ uid, offerId, xp: points });"
            },
            {
              subtitle: "Global vs Local Scope",
              items: [
                "Global Scope: Community-wide progress goal. Once reached, a winner is chosen from all contributors.",
                "Local Scope: Individual goal. Once reached, the user unlocks the item personally."
              ]
            }
          ]
        },
        {
            id: "server-actions",
            title: "4. Server Actions & API (Backend Flow)",
            text: "Deep explanation of all core server-side functions that secure and manipulate the Crack Origins platform.",
            subsections: [
              {
                subtitle: "/lib/admin-actions/* (Admin & Core Ops)",
                items: [
                  "users.ts: `syncUserRecord` (Syncs OAuth to DB), `checkAdminStatus` (RBAC gate), `getAdminDashboardData` (Aggregates stats), `cleanupDeactivatedUsers`.",
                  "games.ts: CRUD operations to list, modify, or delete game entity deployments via DB.",
                  "offers.ts & paypments.ts: `investXP` (Deducts user points using MongoDB $inc), assigns giveaway slots.",
                  "auth-email.ts: Processes raw tokens and transmits AES-256 encrypted verification emails.",
                  "licenses.ts & coupons.ts: Handles digital goods delivery and discount logic generation."
                ]
              },
              {
                subtitle: "/lib/idea-actions.ts (Ideas Engine)",
                items: [
                  "Base CRUD: `publishIdea`, `deleteIdea`, `updateIdeaMetadata`.",
                  "Collaboration: `saveCollaborationContent`, `approveCollaboration`, `updateCollaboration`.",
                  "Versioning System: `calculateParagraphDiff`, `applyParagraphDiff` (Computes snapshot differentials utilizing fast-diff).",
                  "Interactions: `incrementIdeaViews`, `voteIdea`, `upsertIdeaComment`, `toggleLibrarySave`."
                ]
              },
              {
                subtitle: "/lib/blog-actions.ts & /lib/paypal-actions.ts",
                items: [
                  "Blog: `incrementBlogViews`, `toggleBlogLikeSimple`, `upsertBlogComment`.",
                  "PayPal: `capturePayPalOrder` (Communicates securely with PayPal Sandbox/Live API, verifies order payload details against DB expected value limits), `getPayPalBalance`."
                ]
              },
              {
                subtitle: "/app/api/* (Next.js Edge API Handlers)",
                items: [
                  "/api/presence: Handles low-latency ping heartbeats to update 'Online/Offline' visual statuses.",
                  "/api/itch-sync: Triggers Itch.io mapping webhooks fetching latest build builds.",
                  "/api/download: Stream-proxies premium binary logic to authorized users.",
                  "/api/support: Bi-directional long-polling messaging sync route."
                ]
              }
            ]
        }
      ]
    },
    si: {
      hero: {
        badge: "ප්‍රධාන තාක්ෂණික අත්පොත",
        title: "Developer Documentation & <span class='text-gradient'>පද්ධති ව්‍යුහය</span>",
        subtitle: "Crack Origins පද්ධතිය නඩත්තු කිරීමට සහ තේරුම් ගැනීමට ඉංජිනේරුවන් සඳහා වන ගැඹුරු මාර්ගෝපදේශයකි."
      },
      sections: [
        {
          id: "step-by-step",
          title: "1. පියවරෙන් පියවර ක්‍රියාවලිය (System Flow)",
          text: "සංවර්ධකයෙකුට පද්ධතිය ගැඹුරින් තේරුම් ගැනීමට මෙම පියවර අනුගමනය කරන්න.",
          subsections: [
            {
              subtitle: "පියවර A: පරිශීලක ප්‍රවේශය සහ ආරක්ෂාව",
              text: "පරිශීලකයා Login වූ විට `auth.ts` හරහා Google ගිණුම තහවුරු වේ. ඉන්පසු `syncUserRecord` මගින් ඔවුන්ගේ දත්ත MongoDB වෙත සමමුහුර්ත කෙරේ.",
              note: "`lib/crypto.ts` මගින් සියලුම ඊමේල් ලිපිනයන් සංකේතනය (Encrypt) කර ආරක්ෂා කරනු ලබයි."
            },
            {
              subtitle: "පියවර B: අවසර ලබා දීම (RBAC)",
              text: "`AuthContext` මගින් පරිශීලකයාගේ තනතුර (Admin/Owner) සහ ඔවුන්ට හිමි අවසර (Permissions) පරීක්ෂා කර React state එක පවත්වා ගනී.",
              code: "const { isAdmin, permissions } = useAuth();"
            },
            {
              subtitle: "පියවර C: දත්ත වෙනස් කිරීම් (Server Actions)",
              text: "ඕනෑම Admin ක්‍රියාවක් (Game/Blog එකක් ඇතුළත් කිරීම) `lib/admin-actions/` හි ඇති Server Action එකක් හරහා සිදුවේ. මෙහිදී සෘජුවම MongoDB Driver එක භාවිතා කරයි."
            }
          ]
        },
        {
          id: "architecture",
          title: "2. පද්ධති ව්‍යුහය (Architecture)",
          text: "Next.js App Router සහ Native MongoDB ව්‍යුහයක් මත පදනම් වී ඇත.",
          subsections: [
            {
              subtitle: "දත්ත ගබඩා සැලැස්ම",
              text: "සෑම දත්ත සමුදා ක්‍රියාවක් සඳහාම වේගවත් MongoDB Native Driver එක භාවිතා කරයි.",
              code: "const db = await getMongoDb();"
            }
          ]
        },
        {
          id: "investments",
          title: "3. Offers සහ Invest Points පද්ධතිය",
          text: "XP වැය කර මෘදුකාංග ලබා ගැනීමට (Invest) හැකි විශේෂ පද්ධතියකි.",
          subsections: [
            {
              subtitle: "ආයෝජනය වැඩ කරන්නේ මෙහෙමයි",
              text: "`investXP` ශ්‍රිතය මගින් MongoDB `$inc` භාවිතා කර XP අඩු කර අදාළ offer එකට එක් කරයි.",
              code: "// logic: lib/admin-actions/payments.ts\nawait db.collection('accounts').updateOne({ uid }, { $inc: { xp: -points } });"
            }
          ]
        },
        {
            id: "server-actions",
            title: "4. සේවාදායකයේ ක්‍රියාකාරකම් (Server Actions & APIs)",
            text: "Crack Origins පද්ධතියේ ප්‍රධාන backend ශ්‍රිත සහ API පිළිබඳ ගැඹුරු විශ්ලේෂණයක්.",
            subsections: [
              {
                subtitle: "/lib/admin-actions/* (පාලක සහ ප්‍රධාන ක්‍රියා)",
                items: [
                  "users.ts: `syncUserRecord` (පරිශීලක දත්ත සමමුහුර්ත කරයි), `checkAdminStatus` (අවසර පරීක්ෂා කරයි), `getAdminDashboardData` (සංඛ්‍යාලේඛන ලබා දෙයි).",
                  "games.ts: Games දත්ත සමුදායට එක් කිරීම, වෙනස් කිරීම සහ ඉවත් කිරීම සිදු කරන CRUD ක්‍රියා.",
                  "offers.ts / payments.ts: දත්ත සමුදායේ `$inc` යොදාගෙන XP අඩු කර Offers ලබා දීම පාලනය කරයි.",
                  "auth-email.ts: AES-256 යොදාගෙන රහස්‍ය ඊමේල් යැවීම සිදු කරයි."
                ]
              },
              {
                subtitle: "/lib/idea-actions.ts (නිර්මාණ එන්ජිම)",
                items: [
                  "මූලික ක්‍රියා: `publishIdea` (ප්‍රකාශනය), `deleteIdea`, `updateIdeaMetadata` (දත්ත යාවත්කාලීන කිරීම).",
                  "එකට වැඩ කිරීම (Collaboration): `saveCollaborationContent`, `approveCollaboration`.",
                  "Diff පද්ධතිය: `calculateParagraphDiff`, `applyParagraphDiff` (අකුරෙන් අකුර වෙනස්කම් ගබඩා කර Versioning සිදු කරයි).",
                  "අන්තර්ක්‍රියා: `incrementIdeaViews`, `voteIdea`, `upsertIdeaComment`."
                ]
              },
              {
                subtitle: "/lib/blog-actions.ts සහ /lib/paypal-actions.ts",
                items: [
                  "Blog: `incrementBlogViews`, `toggleBlogLikeSimple`, `upsertBlogComment`.",
                  "PayPal: `capturePayPalOrder` (PayPal API සමඟ සෘජුව සම්බන්ධ වී ගෙවීම් තහවුරු කරයි), `getPayPalBalance`."
                ]
              },
              {
                subtitle: "/app/api/* (Next.js API මාර්ග)",
                items: [
                  "/api/presence: පරිශීලකයින් Online ද Offline ද යන්න තීරණය කිරීමට තත්පර කිහිපයකට වරක් සන්නිවේදනය කරයි.",
                  "/api/itch-sync: Itch.io හි ඇති අලුත්ම ක්‍රීඩා ගොනු අපේ පද්ධතියට සමමුහුර්ත කරයි.",
                  "/api/download: බලයලත් පරිශීලකයින්ට පමණක් ෆයිල් ඩවුන්ලෝඩ් කිරීමට සහාය වේ."
                ]
              }
            ]
        }
      ]
    }
  };

  const t = content[lang];

  return (
    <div className={styles.container}>
      <div className={commonStyles.backgroundAnimation}></div>
      
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>{lang === 'en' ? 'Back to Home' : 'මුල් පිටුවට'}</span>
        </Link>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Image draggable={false} src="/favicon-icon-black.png" alt="Crack Origins" width={32} height={32} className="logo-dark" />
            <Image draggable={false} src="/favicon-icon-white.png" alt="Crack Origins" width={32} height={32} className="logo-light" />
          </div>
          <span>CO's</span>
        </div>
        <div className={styles.headerActions} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <button 
             className={styles.langToggle} 
             onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
           >
             {lang === 'en' ? 'සිංහල' : 'English'}
           </button>
           <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <motion.div 
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.badge}>
            <FileCode size={14} />
            {t.hero.badge}
          </div>
          <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: t.hero.title }} />
          <p className={styles.text} style={{ textAlign: 'center', marginTop: '-1rem', fontSize: '1.2rem' }}>{t.hero.subtitle}</p>
          <div className={styles.meta} style={{ marginTop: '2rem' }}>
            <div className={styles.metaItem}>
               <Clock size={16} />
               <span>Last Updated: {lastUpdated}</span>
            </div>
            <div className={styles.metaItem}>
               <Shield size={16} color="var(--primary)" />
               <span>Admin Access Only</span>
            </div>
          </div>
        </motion.div>

        <div className={styles.contentGrid}>
          <aside className={styles.sidebar}>
            <nav className={styles.toc}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--foreground)' }}>Table of Contents</h3>
              <ul>
                {t.sections.map((section: ManualSection) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className={styles.content}>
            {t.sections.map((section, idx) => (
              <motion.section 
                key={section.id} 
                id={section.id} 
                className={styles.section}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <div className={styles.sectionBody}>
                  {section.text && <p className={styles.text}>{section.text}</p>}
                  
                  {section.subsections && section.subsections.map((sub, sIdx) => (
                    <div key={sIdx} className={styles.subsection}>
                      <h3 className={styles.subsectionTitle}>{sub.subtitle}</h3>
                      {sub.text && <p className={styles.text}>{sub.text}</p>}
                      {sub.items && (
                        <ul className={styles.list}>
                          {sub.items.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                        </ul>
                      )}
                      {sub.code && (
                        <div className={styles.codeBlock}>
                          <div className={styles.codeLabel}>Snippet</div>
                          <pre><code>{sub.code}</code></pre>
                        </div>
                      )}
                      {sub.note && <div className={styles.note}>{sub.note}</div>}
                    </div>
                  ))}

                  {section.items && (
                    <ul className={styles.list}>
                      {section.items.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </motion.section>
            ))}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 Crack Origins Technical Operations. Built with Precision.</p>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
             <BookOpen size={18} />
             <Database size={18} />
             <Lock size={18} />
             <Zap size={18} color="var(--primary)" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ManualContent;
