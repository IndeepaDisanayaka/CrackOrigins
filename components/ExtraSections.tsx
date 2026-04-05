'use client';
import React, { useRef, useState } from 'react';
import styles from './ExtraSections.module.css';
import { Mail, ArrowRight, Heart, Globe, Zap, DollarSign, TrendingUp, Shield, UserPlus, Briefcase, Code, Trophy } from 'lucide-react';

import { motion } from 'framer-motion';

const YOUTUBE_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
);

const INSTAGRAM_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const DISCORD_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5485-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

const PROJECTS = [
  { id: 1, title: 'Project Zenith', category: 'Alpha Access', description: 'Our most ambitious multiplayer arena brawler currently undergoing closed alpha testing.', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop', date: 'Mar 2026' },
  { id: 2, title: 'Crimson Sky', category: 'Prototyping', description: 'A 2D action side-scroller featuring hand-drawn art and punishing combat mechanics.', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop', date: 'Jan 2026' },
  { id: 3, title: 'Neon Drift: Mobile', category: 'In Development', description: 'Bringing the high-speed thrills of Neon Drift to iOS and Android devices.', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop', date: 'Dec 2025' }
];

const VALUES = [
  { icon: <Heart size={22} />, title: 'Player First', description: 'Every design decision starts with the player experience.' },
  { icon: <Zap size={22} />, title: 'Innovation', description: 'We push boundaries with creative mechanics and fresh ideas.' },
  { icon: <Globe size={22} />, title: 'Community', description: 'Our players are part of the development journey from day one.' },
];

const INVEST_PERKS = [
  { icon: <TrendingUp size={24} />, title: 'Growing Market', desc: 'The indie gaming industry is projected to reach $30B by 2028.' },
  { icon: <Shield size={24} />, title: 'Proven Track Record', desc: '4 successful releases with 20k+ combined active players.' },
  { icon: <DollarSign size={24} />, title: 'Revenue Sharing', desc: 'Investors receive proportional revenue share across all titles.' },
];

const JOIN_ROLES = [
  { icon: <Code size={22} />, title: 'Game Developer', type: 'Full-time · Remote', desc: 'Build gameplay systems and core engine features.' },
  { icon: <Briefcase size={22} />, title: 'UI/UX Designer', type: 'Full-time · Remote', desc: 'Design intuitive interfaces for immersive gaming experiences.' },
  { icon: <UserPlus size={22} />, title: 'Community Manager', type: 'Part-time · Remote', desc: 'Manage Discord, social media, and player engagement.' },
];

const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function ExtraSections() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => setIsDown(false);
  const onMouseUp = () => setIsDown(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className={styles.container}>

      {/* About */}
      <motion.section 
        className={styles.section} 
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Who We Are</span>
        <h2 className={styles.sectionTitle}>About Crack Origins</h2>
        <div className={styles.aboutContent}>
          <p className={styles.aboutText}>
            We are a collective of hardcore gamers turned developers. Operating out of California, Crack Origins was founded on the principle that indie games can compete with triple-A visuals while maintaining the soul, creativity, and player-first mentality that major studios often lose.
          </p>
          <p className={styles.aboutMission}>
            Our mission is simple: <strong>Create universes you never want to leave.</strong>
          </p>
        </div>
        <motion.div 
            className={styles.valuesGrid}
            variants={staggerContainer}
        >
          {VALUES.map((val, i) => (
            <motion.div key={i} className={styles.valueCard} variants={revealVariants}>
              <div className={styles.valueIcon}>{val.icon}</div>
              <h3 className={styles.valueTitle}>{val.title}</h3>
              <p className={styles.valueDesc}>{val.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>



      {/* Invest In Our Games */}
      <motion.section 
        className={styles.section} 
        id="invest"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Opportunity</span>
        <h2 className={styles.sectionTitle}>Invest In Our Games</h2>
        <p className={styles.sectionSubtext}>
          Back the next generation of indie games. Join our investor program and grow with us.
        </p>
        <motion.div 
            className={styles.investGrid}
            variants={staggerContainer}
        >
          {INVEST_PERKS.map((perk, i) => (
            <motion.div key={i} className={styles.investCard} variants={revealVariants}>
              <div className={styles.investIcon}>{perk.icon}</div>
              <h3 className={styles.investTitle}>{perk.title}</h3>
              <p className={styles.investDesc}>{perk.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className={styles.investCta} variants={revealVariants}>
          <button className="btnSolid">
            Become an Investor <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.section>

      {/* Join With Us */}
      <motion.section 
        className={styles.section} 
        id="join"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Careers</span>
        <h2 className={styles.sectionTitle}>Join With Us</h2>
        <p className={styles.sectionSubtext}>
          We&apos;re looking for talented individuals who share our passion for creating exceptional games.
        </p>
        <motion.div 
            className={styles.rolesGrid}
            variants={staggerContainer}
        >
          {JOIN_ROLES.map((role, i) => (
            <motion.div key={i} className={styles.roleCard} variants={revealVariants}>
              <div className={styles.roleHeader}>
                <div className={styles.roleIcon}>{role.icon}</div>
                <div>
                  <h3 className={styles.roleTitle}>{role.title}</h3>
                  <span className={styles.roleType}>{role.type}</span>
                </div>
              </div>
              <p className={styles.roleDesc}>{role.desc}</p>
              <div>
                <button className="btnOutline">Apply Now <ArrowRight size={14} /></button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Projects (Draggable) */}
      <motion.section 
        className={styles.section} 
        id="projects" 
        style={{ userSelect: "none" }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">What&apos;s Next</span>
        <h2 className={styles.sectionTitle}>Incoming Projects</h2>
        <div className={styles.projectsContainer}>
          <div
            className={styles.projectsDraggable}
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
          >
            {PROJECTS.map(proj => (
              <div key={proj.id} className={styles.projectCardWrapper}>
                <div className={styles.projectCard}>
                  <div className={styles.projectImageWrapper}>
                    <img src={proj.image} alt={proj.title} className={styles.projectImage} />
                    <span className={styles.projectBadge}>{proj.category}</span>
                  </div>
                  <div className={styles.projectInfo}>
                    <span className={styles.projectDate}>{proj.date}</span>
                    <h3 className={styles.projectTitle}>{proj.title}</h3>
                    <p className={styles.projectDesc}>{proj.description}</p>
                    <button className={styles.readMoreBtn}>
                      Read Devlog <ArrowRight size={14} style={{ transition: 'transform 0.3s' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Socials + Contact */}
      <div className={styles.bottomWrapper}>
        <motion.section 
            className={styles.section} 
            id="teams"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
        >
          <span className="sectionLabel">Stay Connected</span>
          <h2 className={styles.sectionTitle}>Join the Community</h2>
          <motion.div className={styles.socialsGrid} variants={staggerContainer}>
            <motion.a href="https://www.youtube.com/@crackorigins" target='_blank' className={styles.socialCard} variants={revealVariants}>
              {YOUTUBE_SVG}
              <span className={styles.socialName}>YouTube</span>
              <span className={styles.socialHandle}>@crackorigins</span>
            </motion.a>
            <motion.a href="https://www.instagram.com/indeepadisanayaka?igsh=MTQ4ZWY0bWozMXp5bg%3D%3D&utm_source=qr" target='_blank' className={styles.socialCard} variants={revealVariants}>
              {INSTAGRAM_SVG}
              <span className={styles.socialName}>Instagram</span>
              <span className={styles.socialHandle}>@indeepadisanayaka</span>
            </motion.a>
            <motion.a href="https://discord.gg/qsAWD52yNc" target='_blank' className={`${styles.socialCard} ${styles.discordCard}`} variants={revealVariants}>
              {DISCORD_SVG}
              <span className={styles.socialName}>Discord</span>
              <span className={styles.socialHandle}>Join 2k+ members</span>
            </motion.a>
          </motion.div>
        </motion.section>

        <motion.section 
            className={styles.section} 
            id="contact"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
        >
          <span className="sectionLabel">Let&apos;s Talk</span>
          <h2 className={styles.sectionTitle}>Work With Us</h2>
          <div className={styles.contactCard}>
            <p className={styles.contactDesc}>
              Whether you&apos;re a publisher, creator, or fellow developer — we&apos;re always open to pushing boundaries together.
            </p>
            <div className={styles.contactForm}>
              <input type="email" placeholder="Your email address" className={styles.emailInput} />
              <button className="btnSolid" style={{ padding: '0 2rem' }}>
                <Mail size={16} /> Get in Touch
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
