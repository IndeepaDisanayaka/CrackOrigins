'use client';

import React from 'react';
import styles from './ExtraSections.module.css';
import SteamMarketplace from './sections/SteamMarketplace';
import AboutSection from './sections/AboutSection';
import InvestmentSection from './sections/InvestmentSection';
import CareersSection from './sections/CareersSection';
import CommunitySection from './sections/CommunitySection';

import IdeasTeaser from './sections/IdeasTeaser';

export default function ExtraSections() {
  return (
    <div className={styles.container}>
      <SteamMarketplace />
      {/* <IdeasTeaser /> */}
      <AboutSection />
      <InvestmentSection />
      <CareersSection />
      <CommunitySection />
    </div>
  );
}
