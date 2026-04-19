'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import LiveCursors from '@/components/LiveCursors';
import { useModals } from '@/lib/contexts/ModalContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });

export default function HeaderWrapper() {
  const { 
    isAuthModalOpen, setIsAuthModalOpen,
    isDispatchModalOpen, setIsDispatchModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen,
    isListGameOpen, setIsListGameOpen,
    isAdminModalOpen, setIsAdminModalOpen
  } = useModals();
  const { user, isAdmin, login } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const searchParams = useSearchParams();

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const refId = searchParams?.get('ref');
    const res = await login(type, credentials, refId);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  return (
    <>
      <LiveCursors />
      <Header 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={handleLogin} 
      />

      <DispatchModal 
        isOpen={isDispatchModalOpen} 
        onClose={() => setIsDispatchModalOpen(false)} 
      />

      <CouponModal 
        isOpen={isCouponModalOpen} 
        onClose={() => setIsCouponModalOpen(false)} 
      />

      <AddOfferModal 
        isOpen={isAddOfferModalOpen} 
        onClose={() => setIsAddOfferModalOpen(false)} 
      />
      
      <ListGameModal 
        isOpen={isListGameOpen} 
        onClose={() => setIsListGameOpen(false)} 
      />

      {user && isAdmin && (
        <AdminPanel
          userUid={user.uid}
          isOpen={isAdminModalOpen}
          setIsOpen={setIsAdminModalOpen}
        />
      )}
    </>
  );
}
