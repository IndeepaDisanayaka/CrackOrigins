'use client';

import React, { useEffect } from 'react';

interface BlogAdProps {
  className?: string;
}

const BlogAd: React.FC<BlogAdProps> = ({ className }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div 
      className={className}
      style={{ 
        margin: '2rem 0', 
        width: '100%', 
        overflow: 'hidden', 
        display: 'flex', 
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.05)',
        borderRadius: '8px',
        padding: '10px'
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '100px' }}
        data-ad-client="ca-pub-1235859654015353"
        data-ad-slot="6011579118"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default BlogAd;
