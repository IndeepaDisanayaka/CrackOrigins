'use client';

import React from 'react';
import styles from './terms.module.css';
import commonStyles from '../page.module.css';
import { Gamepad2, ArrowLeft, ShieldCheck, FileText, Scale, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ThemeToggle from '../../components/ThemeToggle';

const TermsPage = () => {
  const lastUpdated = "April 2026";

  const sections = [
    {
      id: "introduction",
      title: "1. Introduction",
      content: "Welcome to our gaming platform (“Website”, “Service”, “we”, “our”, or “us”). This document explains how we collect, use, protect, and manage user information, as well as the rules and conditions governing the use of our services.\n\nBy accessing or using this website, creating an account, or purchasing any digital product, you agree to comply with and be legally bound by this Privacy Policy and Terms of Service."
    },
    {
      id: "collection",
      title: "2. Information We Collect",
      content: "When users register and use our services, we may collect the following information:",
      subsections: [
        {
          subtitle: "Account Information",
          items: ["Name", "Email address", "Profile photo", "Country of residence"]
        },
        {
          subtitle: "Payment Information",
          content: "During payment processing, we may collect:",
          items: ["PayPal account email", "PayPal account name"],
          note: "We do not collect or store credit card numbers, PayPal passwords, or sensitive financial authentication data. All payments are processed through secure third-party payment providers."
        }
      ]
    },
    {
      id: "purpose",
      title: "3. Purpose of Data Collection",
      content: "User information is collected and used solely for legitimate operational purposes, including:",
      items: [
        "Creating and managing user accounts",
        "Delivering purchased digital products",
        "Payment verification and fraud prevention",
        "Customer support services",
        "Security monitoring and platform protection",
        "Improving platform functionality and user experience"
      ],
      footer: "We do not sell, rent, or trade user personal data to any individual or external organization."
    },
    {
      id: "protection",
      title: "4. Data Protection and Security",
      content: "We implement appropriate technical and organizational security measures to protect user data against unauthorized access, alteration, disclosure, or destruction.\n\nUser data is stored using secure systems and encryption-based protection methods where applicable. While we strive to maintain a highly secure environment, no online service can guarantee absolute security."
    },
    {
      id: "deletion",
      title: "5. Account Management and Deletion Policy",
      content: "For security and fraud prevention reasons, users are not provided with direct self-service account deletion functionality.\n\nIf a user wishes to delete their account, they must contact us through the official support system and submit a request explaining the reason for deletion. Each request will be reviewed before appropriate action is taken.\n\nWe reserve the right to retain certain information where required for legal, security, fraud prevention, or financial record-keeping purposes."
    },
    {
        id: "refunds",
        title: "6. Digital Products and Refund Policy",
        content: "All products sold on this platform are digital goods.\n\nOnce a purchase has been successfully completed and the digital product has been delivered, refunds are not available. Digital products cannot be returned, reversed, or reclaimed after delivery.\n\nUsers are responsible for verifying purchase details before completing any transaction."
    },
    {
        id: "monitoring",
        title: "7. Account Monitoring and Security Enforcement",
        content: "To maintain platform integrity, we actively monitor accounts for suspicious or abnormal activity.\n\nIf unusual behavior, fraud indicators, or security risks are detected, the account may be temporarily placed on hold. During this period, account activities may be restricted or suspended.\n\nThe account may be restored once the user provides sufficient evidence verifying legitimate ownership and activity."
    },
    {
        id: "responsibilities",
        title: "8. User Responsibilities",
        content: "Users agree to:",
        items: [
            "Provide accurate and truthful information",
            "Maintain the confidentiality of their login credentials",
            "Use the platform only for lawful purposes",
            "Protect payment confirmations and transaction evidence"
        ],
        footer: "Users must not share payment evidence, account access, or sensitive information with third parties."
    },
    {
        id: "prohibited",
        title: "9. Prohibited Activities",
        content: "The following activities are strictly prohibited:",
        items: [
            "Unauthorized game reselling or redistribution",
            "Creation of fake or duplicate accounts",
            "Affiliate system abuse",
            "Sharing or selling accounts",
            "Harassment, abusive behavior, or threats toward staff or users",
            "Attempting to exploit system vulnerabilities",
            "Circumventing platform security measures"
        ],
        footer: "Violation of these rules may result in temporary suspension or permanent account termination without prior notice."
    },
    {
        id: "ownership",
        title: "10. Account Ownership and Transfer",
        content: "User accounts are personal and non-transferable. Accounts may not be sold, shared, rented, or transferred to another individual under any circumstances.\n\nOwnership of an account remains subject to compliance with these Terms."
    },
    {
        id: "affiliate",
        title: "11. Affiliate Program Policy",
        content: "Users participating in affiliate programs must operate honestly and fairly.\n\nCreating fake accounts, manipulating referrals, or abusing promotional systems may result in:\n- Account suspension\n- Removal of affiliate privileges\n- Cancellation of earned discounts or rewards"
    },
    {
        id: "communication",
        title: "12. Communication and Support",
        content: "All official issues, disputes, or service requests must be submitted exclusively through the platform’s official contact or support system.\n\nRequests made through unofficial channels may not be recognized or processed."
    },
    {
        id: "sharing",
        title: "13. Data Sharing and Disclosure",
        content: "We do not share user personal data with third parties except under the following circumstances:",
        items: [
            "When required by law or legal authority",
            "To prevent fraud, abuse, or illegal activity",
            "To protect the rights, property, or safety of the platform or users"
        ]
    },
    {
        id: "availability",
        title: "14. Service Availability",
        content: "We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.\n\nWe are not responsible for losses caused by downtime, technical failures, or third-party service interruptions."
    },
    {
        id: "liability",
        title: "15. Limitation of Liability",
        content: "The platform provides digital products and services on an “as-is” basis.\n\nWe are not liable for:\n- User device compatibility issues\n- Third-party platform restrictions (including game platforms)\n- User misuse of purchased products\n- External service provider failures"
    },
    {
        id: "updates",
        title: "16. Policy Updates",
        content: "We may update this Privacy Policy and Terms of Service periodically. Continued use of the website after updates constitutes acceptance of the revised terms."
    },
    {
        id: "acceptance",
        title: "17. Acceptance of Terms",
        content: "By creating an account, accessing the website, or purchasing any product, users acknowledge that they have read, understood, and agreed to this Privacy Policy and Terms of Service."
    }
  ];

  return (
    <div className={styles.container}>
      <div className={commonStyles.backgroundAnimation}></div>
      
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Gamepad2 size={16} color="#000" />
          </div>
          <span>Crack Origins</span>
        </div>
        <div className={styles.headerActions}>
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
            <Scale size={14} />
            LEGAL DOCUMENTATION
          </div>
          <h1 className={styles.title}>Privacy Policy & <span className={styles.highlight}>Terms of Service</span></h1>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
               <Clock size={16} />
               <span>Last Updated: {lastUpdated}</span>
            </div>
          </div>
        </motion.div>

        <div className={styles.contentGrid}>
          <aside className={styles.sidebar}>
            <nav className={styles.toc}>
              <h3>Table of Contents</h3>
              <ul>
                {sections.map(section => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className={styles.content}>
            {sections.map((section, idx) => (
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
                  {section.content && <p className={styles.text}>{section.content}</p>}
                  
                  {section.subsections && section.subsections.map((sub, sIdx) => (
                    <div key={sIdx} className={styles.subsection}>
                      <h3 className={styles.subsectionTitle}>{sub.subtitle}</h3>
                      {sub.content && <p className={styles.text}>{sub.content}</p>}
                      {sub.items && (
                        <ul className={styles.list}>
                          {sub.items.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                        </ul>
                      )}
                      {sub.note && <div className={styles.note}>{sub.note}</div>}
                    </div>
                  ))}

                  {section.items && (
                    <ul className={styles.list}>
                      {section.items.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                    </ul>
                  )}

                  {section.footer && <p className={styles.textFooter}>{section.footer}</p>}
                </div>
              </motion.section>
            ))}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 Crack Origins Studio. All rights reserved.</p>
          <div className={styles.footerLinks}>
             <Link href="/">Home</Link>
             <Link href="/#about">About</Link>
             <Link href="/#contact">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
