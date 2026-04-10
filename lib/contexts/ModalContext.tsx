'use client';

import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  isCouponModalOpen: boolean;
  setIsCouponModalOpen: (open: boolean) => void;
  isAddOfferModalOpen: boolean;
  setIsAddOfferModalOpen: (open: boolean) => void;
  isBugReportOpen: boolean;
  setIsBugReportOpen: (open: boolean) => void;
  selectedBugGame: any | null;
  setSelectedBugGame: (game: any | null) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [selectedBugGame, setSelectedBugGame] = useState<any | null>(null);

  const closeAllModals = () => {
    setIsAuthModalOpen(false);
    setIsAdminModalOpen(false);
    setIsCouponModalOpen(false);
    setIsAddOfferModalOpen(false);
    setIsBugReportOpen(false);
    setSelectedBugGame(null);
  };

  return (
    <ModalContext.Provider value={{
      isAuthModalOpen,
      setIsAuthModalOpen,
      isAdminModalOpen,
      setIsAdminModalOpen,
      isCouponModalOpen,
      setIsCouponModalOpen,
      isAddOfferModalOpen,
      setIsAddOfferModalOpen,
      isBugReportOpen,
      setIsBugReportOpen,
      selectedBugGame,
      setSelectedBugGame,
      closeAllModals
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}
