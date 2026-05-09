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
  isListGameOpen: boolean;
  setIsListGameOpen: (open: boolean) => void;
  isDispatchModalOpen: boolean;
  setIsDispatchModalOpen: (open: boolean) => void;
  isBugReportOpen: boolean;
  setIsBugReportOpen: (open: boolean) => void;
  selectedBugGame: any | null;
  setSelectedBugGame: (game: any | null) => void;
  isBlogChatOpen: boolean;
  setIsBlogChatOpen: (open: boolean) => void;
  selectedBlogTitle: string;
  setSelectedBlogTitle: (title: string) => void;
  selectedBlogId: string;
  setSelectedBlogId: (id: string) => void;
  isCreateIdeaOpen: boolean;
  setIsCreateIdeaOpen: (open: boolean) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);
  const [isListGameOpen, setIsListGameOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [selectedBugGame, setSelectedBugGame] = useState<any | null>(null);
  const [isBlogChatOpen, setIsBlogChatOpen] = useState(false);
  const [selectedBlogTitle, setSelectedBlogTitle] = useState('');
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [isCreateIdeaOpen, setIsCreateIdeaOpen] = useState(false);

  const closeAllModals = () => {
    setIsAuthModalOpen(false);
    setIsAdminModalOpen(false);
    setIsCouponModalOpen(false);
    setIsAddOfferModalOpen(false);
    setIsListGameOpen(false);
    setIsDispatchModalOpen(false);
    setIsBugReportOpen(false);
    setIsBlogChatOpen(false);
    setIsCreateIdeaOpen(false);
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
      isListGameOpen,
      setIsListGameOpen,
      isDispatchModalOpen,
      setIsDispatchModalOpen,
      isBugReportOpen,
      setIsBugReportOpen,
      selectedBugGame,
      setSelectedBugGame,
      isBlogChatOpen,
      setIsBlogChatOpen,
      selectedBlogTitle,
      setSelectedBlogTitle,
      selectedBlogId,
      setSelectedBlogId,
      isCreateIdeaOpen,
      setIsCreateIdeaOpen,
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
