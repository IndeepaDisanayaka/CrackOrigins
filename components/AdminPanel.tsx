'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import {
  Shield,
  Users,
  CreditCard,
  Gamepad2,
  TrendingUp,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  DollarSign,
  MessageSquare,
  Key,
  MousePointer2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Filter
} from 'lucide-react';

import { StatCard } from './admin/StatCard';
import AddOfferModal from './admin/AddOfferModal';
import CouponModal from './admin/CouponModal';
import DispatchModal from './admin/DispatchModal';
import ListGameModal from './admin/ListGameModal';
import { 
  getAdminDashboardData,
  updateUserOwnerStatus,
  updateUserKey,
  deleteBlogPost,
  getBlogPostsAction,
  deleteUserAccount,
  deleteAnonymousUsers,
  cleanupDeactivatedUsers
} from '@/lib/admin-actions';
import { getPayPalBalance } from '@/lib/paypal-actions';
import { useToast } from './Toast';
import { rtdb } from '../lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import Link from 'next/link';
import { formatDate } from 'date-fns';

interface AdminPanelProps {
  userUid: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type Tab = 'overview' | 'users' | 'payments' | 'games' | 'blogs';
type PaymentView = 'payments' | 'offerPayments';

export default function AdminPanel({
  userUid,
  isOpen,
  setIsOpen,
}: AdminPanelProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentView, setPaymentView] = useState<PaymentView>('payments');
  const [onlyKeyNotSet, setOnlyKeyNotSet] = useState(false);
  const [userView, setUserView] = useState<'all' | 'google' | 'anonymous'>('all');
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [paypalBalance, setPaypalBalance] = useState<string | null>(null);
  const [showPaypalBalance, setShowPaypalBalance] = useState(false);
  const [isPaypalLoading, setIsPaypalLoading] = useState(false);
  const [blogData, setBlogData] = useState<any[]>([]);

  // Live Cursor Users
  const [showLiveCursors, setShowLiveCursors] = useState(false);
  const [liveCursorUsers, setLiveCursorUsers] = useState<Record<string, any>>({});
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; name: string; message: string; color: string; time: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(false);
  const [autoCleanupInterval, setAutoCleanupInterval] = useState(30); // seconds
  const autoCleanupRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  const [roleConfirm, setRoleConfirm] = useState<{ open: boolean; targetUid: string; nextOwner: boolean; name: string }>({
    open: false, targetUid: "", nextOwner: false, name: ""
  });
  const [blogDeleteConfirm, setBlogDeleteConfirm] = useState<{ open: boolean; slug: string; title: string }>({
    open: false, slug: "", title: ""
  });
  const [userDeleteConfirm, setUserDeleteConfirm] = useState<{ open: boolean; uid: string; name: string }>({
    open: false, uid: "", name: ""
  });
  const [bulkCleanupConfirm, setBulkCleanupConfirm] = useState<{ open: boolean; type: 'anonymous' | 'deactivated' }>({
    open: false, type: 'anonymous'
  });
  const [keyModal, setKeyModal] = useState<{ open: boolean; targetUid: string; paymentId: string; key: string }>({
    open: false, targetUid: "", paymentId: "", key: ""
  });
  
  // Creation Modals
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [showAddBlog, setShowAddBlog] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);

  // Progress tracking
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const res = await getAdminDashboardData(userUid);
    if (res.success) {
      setData(res.data);
    } else {
      showToast(res.error || "Failed to load dashboard.", "error");
    }
    setLoading(false);
    
    // Fetch blogs separately via server action to keep the main data fetch quick
    const resBlogs = await getBlogPostsAction();
    if (resBlogs.success && resBlogs.posts) {
      setBlogData(resBlogs.posts);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Live Cursor Users listener
  useEffect(() => {
    if (!showLiveCursors) return;
    const presenceRef = ref(rtdb, 'presence');
    const unsub = onValue(presenceRef, (snapshot) => {
      const allUsers = snapshot.val() || {};
      setLiveCursorUsers(allUsers);
      // Extract chat messages from users who have a message
      const msgs: { id: string; name: string; message: string; color: string; time: number }[] = [];
      Object.entries(allUsers).forEach(([id, userData]: [string, any]) => {
        if (userData.message) {
          msgs.push({
            id,
            name: userData.name || 'Ghost',
            message: userData.message,
            color: userData.color || '#feb60c',
            time: userData.lastActive || Date.now()
          });
        }
      });
      setChatMessages(prev => {
        const newMsgs = msgs.filter(m => !prev.find(p => p.id === m.id && p.message === m.message));
        if (newMsgs.length > 0) {
          const merged = [...prev, ...newMsgs].slice(-100);
          return merged;
        }
        return prev;
      });
    });
    return () => unsub();
  }, [showLiveCursors]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Pending offers countdown tick (every second)
  useEffect(() => {
    const interval = setInterval(() => setTimerTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-cleanup scheduler
  useEffect(() => {
    if (autoCleanupRef.current) {
      clearInterval(autoCleanupRef.current);
      autoCleanupRef.current = null;
    }
    if (!autoCleanupEnabled || !showLiveCursors) return;
    autoCleanupRef.current = setInterval(() => {
      const now = Date.now();
      Object.entries(liveCursorUsers).forEach(([id, userData]: [string, any]) => {
        if (now - (userData.lastActive || 0) > autoCleanupInterval * 1000) {
          remove(ref(rtdb, `presence/${id}`));
        }
      });
    }, 5000);
    return () => {
      if (autoCleanupRef.current) clearInterval(autoCleanupRef.current);
    };
  }, [autoCleanupEnabled, showLiveCursors, autoCleanupInterval, liveCursorUsers]);

  // RTDB delete helpers
  const handleDeletePresenceEntry = (id: string) => {
    remove(ref(rtdb, `presence/${id}`));
    showToast('Entry removed.', 'success');
  };

  const handlePurgeAllStale = () => {
    const now = Date.now();
    let count = 0;
    Object.entries(liveCursorUsers).forEach(([id, userData]: [string, any]) => {
      if (now - (userData.lastActive || 0) > 10000) {
        remove(ref(rtdb, `presence/${id}`));
        count++;
      }
    });
    showToast(`Purged ${count} stale entries.`, 'success');
  };

  const handleDeleteAllPresence = () => {
    remove(ref(rtdb, 'presence'));
    showToast('All presence data cleared.', 'success');
  };

  const handleTogglePaypalBalance = async () => {
    if (showPaypalBalance) {
      setShowPaypalBalance(false);
      return;
    }
 
    setShowPaypalBalance(true);
    if (paypalBalance || isPaypalLoading) return;
 
    setIsPaypalLoading(true);
    const res = await getPayPalBalance(userUid);
    if (res.success) {
      setPaypalBalance(`${res.currency} ${res.amount}`);
    } else {
      showToast(res.error || "Failed to load PayPal balance.", "error");
    }
    setIsPaypalLoading(false);
  };

  const handleUpdateKey = async () => {
    if (!keyModal.key.trim()) {
      showToast("Please enter a valid key.", "error");
      return;
    }
    const res = await updateUserKey(userUid, keyModal.targetUid, keyModal.paymentId, keyModal.key.trim());
    if (res.success) {
      showToast("Key updated!", "success");
      setKeyModal({ open: false, targetUid: "", paymentId: "", key: "" });
      fetchData();
    } else showToast(res.error || "Error", "error");
  };

  const toggleOwner = async () => {
    const res = await updateUserOwnerStatus(userUid, roleConfirm.targetUid, roleConfirm.nextOwner);
    if (res.success) {
      showToast("Status updated!", "success");
      setRoleConfirm({ open: false, targetUid: "", nextOwner: false, name: "" });
      fetchData();
    } else showToast(res.error || "Error", "error");
  };

  const handleDeleteUser = async () => {
    if (!userDeleteConfirm.uid) return;
    const res = await deleteUserAccount(userUid, userDeleteConfirm.uid);
    if (res.success) {
      showToast("User record deleted.", "success");
      setUserDeleteConfirm({ open: false, uid: "", name: "" });
      fetchData();
    } else showToast(res.error || "Error", "error");
  };

  const handleBulkCleanup = async () => {
    setBulkCleanupConfirm({ ...bulkCleanupConfirm, open: false });
    setIsCleaning(true);
    setCleaningProgress(10);
    
    try {
      const timer = setInterval(() => {
        setCleaningProgress(prev => (prev < 90 ? prev + 5 : prev));
      }, 500);

      const result = bulkCleanupConfirm.type === 'anonymous' 
        ? await deleteAnonymousUsers(userUid)
        : await cleanupDeactivatedUsers(userUid);
      
      clearInterval(timer);
      setCleaningProgress(100);
      
      setTimeout(() => {
        setIsCleaning(false);
        setCleaningProgress(0);
        if (result.success) {
          showToast(`Successfully removed ${result.count} accounts.`, 'success');
          fetchData();
        } else {
          showToast(result.error || "Failed to cleanup.", 'error');
        }
      }, 500);
    } catch (err) {
      setIsCleaning(false);
      setCleaningProgress(0);
      showToast("An error occurred during cleanup.", "error");
    }
  };

  const handleDeleteBlog = async () => {
    if (!blogDeleteConfirm.slug) return;
    
    const res = await deleteBlogPost(userUid, blogDeleteConfirm.slug);
    if (res.success) {
      showToast("Blog post deleted successfully.", "success");
      setBlogDeleteConfirm({ open: false, slug: "", title: "" });
      fetchData();
    } else {
      showToast(res.error || "Failed to delete blog.", "error");
    }
  };

  // Filter Logic
  const filteredUsers = (data?.users || []).filter((u: any) => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase()) ||
                          u.uid?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    const isAnonymous = !u.email || u.email === "unknown" || u.email === "anonymous";
    if (userView === 'google' && isAnonymous) return false;
    if (userView === 'anonymous' && !isAnonymous) return false;

    return true;
  });

  const filteredPaymentsAll = data?.payments?.filter((p: any) => 
    p.game?.toLowerCase().includes(search.toLowerCase()) || 
    p.payerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.toLowerCase().includes(search.toLowerCase())
  ) || [];
  const filteredPayments = filteredPaymentsAll.filter((p: any) => {
    if (paymentView === 'payments' && p.source !== 'payment') return false;
    if (paymentView === 'offerPayments' && p.source !== 'offerPayment') return false;
    if (paymentView === 'offerPayments' && onlyKeyNotSet && !!p.steamKey) return false;
    return true;
  });

  const filteredGames = data?.offers?.filter((g: any) =>
    g.title?.toLowerCase().includes(search.toLowerCase()) ||
    g.id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredBlogs = blogData.filter((b: any) =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return { formatted: '0 B', bits: '0 bits' };
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const bits = bytes * 8;
    return {
      formatted: `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`,
      bits: `${bits.toLocaleString()} bits`
    };
  };

  const totalBlogsSize = blogData.reduce((acc, b) => acc + (b.fileSize || 0), 0);
  const totalFormatted = formatFileSize(totalBlogsSize);

  return (
    <>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidth="1200px">
      <div style={{ display: 'flex', height: '80vh', backgroundColor: 'var(--background)', color: 'var(--foreground)', overflow: 'hidden', borderRadius: '12px' }}>
        
        {/* Sidebar */}
        <aside style={{ width: '240px', borderRight: '1px solid var(--outline-color)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary)', borderRadius: '8px' }}>
              <Shield size={20} color="#000" />
            </div>
            <span style={{ fontWeight: 800, letterSpacing: '1px' }}>ADMIN PANEL</span>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             {[
               { id: 'overview', icon: <TrendingUp size={18} />, label: 'Overview' },
               { id: 'users', icon: <Users size={18} />, label: 'Users' },
               { id: 'payments', icon: <CreditCard size={18} />, label: 'Payments' },
               { id: 'games', icon: <Gamepad2 size={18} />, label: 'Games' },
               { id: 'blogs', icon: <MessageSquare size={18} />, label: 'Blogs' },
             ].map(item => (
               <button
                 key={item.id}
                 onClick={() => { setActiveTab(item.id as Tab); setSearch(""); }}
                 className={activeTab === item.id ? "btnSolid" : "btnOutline"}
                 style={{
                   width: '100%',
                   justifyContent: 'flex-start',
                   padding: '0.65rem 0.9rem',
                   borderColor: activeTab === item.id ? 'var(--primary)' : 'var(--foreground)',
                   color: activeTab === item.id ? "#000" : "var(--foreground)",
                    background: activeTab === item.id ? "var(--primary)" : "transparent",
                   transform: 'none',
                 }}
               >
                 {item.icon} {item.label}
               </button>
             ))}
          </nav>

          <button onClick={fetchData} className="btnOutline" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.8rem' }}>
             <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Data
          </button>
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'var(--background)' }}>
          {loading ? (
             <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <div className="premiumLoader"><div className="glitchLoader" style={{ fontSize: '1.5rem' }}>SCANNING DATABASE...</div></div>
                <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Securely fetching studio records...</p>
             </div>
          ) : (
            <>
              {/* Top Header Content Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                                       <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                    <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Manage your studio's ecosystem records.</p>
                 </div>
                 <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {activeTab === 'overview' && (
                      <button onClick={() => setShowAddOffer(true)} className="btnSolid" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                        <Gamepad2 size={14} style={{ marginRight: '0.4rem' }} /> Add Offer
                      </button>
                    )}
                    {activeTab === 'games' && (
                      <button onClick={() => setShowAddGame(true)} className="btnSolid" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                        <ExternalLink size={14} style={{ marginRight: '0.4rem' }} /> List New Game
                      </button>
                    )}
                    {activeTab === 'blogs' && (
                      <button onClick={() => setShowAddBlog(true)} className="btnSolid" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                        <ExternalLink size={14} style={{ marginRight: '0.4rem' }} /> Post Dispatch
                      </button>
                    )}
                 </div>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <StatCard icon={Users} value={data?.users?.length || 0} label="Total Users" />
                    <StatCard icon={CreditCard} value={data?.payments?.length || 0} label="Total Orders" />
                    <StatCard 
                      icon={DollarSign} 
                      value={`$${data?.payments?.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)}`} 
                      label="Total Revenue (EST)" 
                    />
                    <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
                      <DollarSign size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                      <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>
                        {showPaypalBalance ? (paypalBalance || (isPaypalLoading ? 'Loading...' : 'N/A')) : '••••••'}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase', marginBottom: '0.8rem' }}>PayPal Balance</div>
                      <button className="btnOutline" onClick={handleTogglePaypalBalance} style={{ padding: '0.35rem 0.65rem', fontSize: '0.65rem', transform: 'none' }}>
                        {showPaypalBalance ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Pending Offers Card */}
                  {(() => {
                    const pendingOffers = (data?.payments || []).filter((p: any) => p.source === 'offerPayment' && !p.steamKey);
                    const TWO_HOURS = 2 * 60 * 60 * 1000;

                    const getCountdown = (purchaseDate: string) => {
                      const purchaseTime = new Date(purchaseDate).getTime();
                      const deadline = purchaseTime + TWO_HOURS;
                      const remaining = deadline - Date.now();
                      if (remaining <= 0) return { text: 'OVERDUE', color: '#ff4d4d', pct: 0, overdue: true };
                      const totalSec = Math.floor(remaining / 1000);
                      const h = Math.floor(totalSec / 3600);
                      const m = Math.floor((totalSec % 3600) / 60);
                      const s = totalSec % 60;
                      const pct = remaining / TWO_HOURS;
                      const color = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#f59e0b' : '#ff4d4d';
                      return { text: `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`, color, pct, overdue: false };
                    };

                    // Sort: overdue first, then by least time remaining
                    const sortedPending = [...pendingOffers].sort((a: any, b: any) => {
                      const aDeadline = new Date(a.purchaseDate).getTime() + TWO_HOURS;
                      const bDeadline = new Date(b.purchaseDate).getTime() + TWO_HOURS;
                      return aDeadline - bDeadline;
                    });

                    const overdueCount = sortedPending.filter((p: any) => {
                      const deadline = new Date(p.purchaseDate).getTime() + TWO_HOURS;
                      return Date.now() > deadline;
                    }).length;

                    return (
                      <div style={{ 
                        background: 'transparent', 
                        border: `1px solid ${overdueCount > 0 ? 'rgba(255, 77, 77, 0.5)' : 'var(--outline-color)'}`, 
                        padding: '1.5rem', 
                        borderRadius: '16px',
                        transition: 'border-color 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Clock size={22} style={{ color: overdueCount > 0 ? '#ff4d4d' : '#f59e0b' }} />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Pending Offers</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                {overdueCount > 0 
                                  ? `⚠️ ${overdueCount} overdue — assign keys ASAP!` 
                                  : 'Offer payments awaiting key assignment'}
                              </div>
                            </div>
                          </div>
                          <div style={{ 
                            background: pendingOffers.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(74, 222, 128, 0.15)', 
                            color: pendingOffers.length > 0 ? '#f59e0b' : '#4ade80', 
                            padding: '0.35rem 0.85rem', 
                            fontSize: '0.9rem', 
                            fontWeight: 900,
                            border: `1px solid ${pendingOffers.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`,
                          }}>
                            {pendingOffers.length}
                          </div>
                        </div>
                        {sortedPending.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
                            {sortedPending.slice(0, 8).map((p: any, idx: number) => {
                              const cd = getCountdown(p.purchaseDate);
                              return (
                                <div key={`${p.userId}-${p.id}-${idx}`} style={{ 
                                  border: `1px solid ${cd.overdue ? 'rgba(255, 77, 77, 0.4)' : 'var(--outline-color)'}`,
                                  background: cd.overdue ? 'rgba(255, 77, 77, 0.04)' : 'transparent',
                                  overflow: 'hidden',
                                  position: 'relative'
                                }}>
                                  {/* Progress bar background */}
                                  {!cd.overdue && (
                                    <div style={{ 
                                      position: 'absolute', bottom: 0, left: 0, 
                                      height: '2px', 
                                      width: `${(cd.pct as number) * 100}%`, 
                                      background: cd.color,
                                      transition: 'width 1s linear, background 0.5s ease'
                                    }} />
                                  )}
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '0.6rem 0.8rem', 
                                    fontSize: '0.78rem',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
                                      <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.game}</span>
                                      <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>{p.payerEmail}</span>
                                    </div>
                                    <div style={{ 
                                      fontWeight: 900, 
                                      fontSize: '0.72rem', 
                                      color: cd.color,
                                      fontFamily: 'monospace',
                                      whiteSpace: 'nowrap',
                                      animation: cd.overdue ? 'pulse 1s ease-in-out infinite' : 'none',
                                      minWidth: '85px',
                                      textAlign: 'center'
                                    }}>
                                      {cd.text}
                                    </div>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>${p.amount}</span>
                                    <button 
                                      className="btnSolid" 
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', flexShrink: 0 }}
                                      onClick={() => {
                                        setKeyModal({ open: true, targetUid: p.userId, paymentId: p.id, key: '' });
                                      }}
                                    >
                                      <Key size={10} /> Assign
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {sortedPending.length > 8 && (
                              <div style={{ fontSize: '0.7rem', opacity: 0.6, textAlign: 'center', padding: '0.4rem' }}>
                                +{sortedPending.length - 8} more pending...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', opacity: 0.6, textAlign: 'center', padding: '0.8rem' }}>
                            All offer payments have keys assigned ✓
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Live Cursor Users Toggle */}
                  <div style={{ 
                    background: 'transparent', 
                    border: '1px solid var(--outline-color)', 
                    padding: '1.5rem', 
                    borderRadius: '16px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLiveCursors ? '1rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <MousePointer2 size={22} style={{ color: 'var(--primary)' }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>Live Cursor Users</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Currently active users on the site</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {showLiveCursors && Object.keys(liveCursorUsers).length > 0 && (
                          <button
                            className="btnOutline"
                            onClick={() => setShowChatSidebar(!showChatSidebar)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.65rem', transform: 'none', borderColor: showChatSidebar ? 'var(--primary)' : undefined, color: showChatSidebar ? 'var(--primary)' : undefined }}
                          >
                            <MessageSquare size={12} /> Chat
                          </button>
                        )}
                        <div
                          onClick={() => setShowLiveCursors(!showLiveCursors)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.4rem 0.7rem',
                            border: '1px solid var(--outline-color)',
                            cursor: 'pointer',
                            background: showLiveCursors ? 'var(--primary)' : 'transparent',
                            color: showLiveCursors ? '#000' : 'var(--foreground)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {showLiveCursors ? <CheckSquare size={14} color="#000" /> : <Square size={14} />}
                          <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>Show</span>
                        </div>
                      </div>
                    </div>

                    {showLiveCursors && (() => {
                      // Filter out admin's own cursor
                      const filteredEntries = Object.entries(liveCursorUsers).filter(
                        ([, userData]: [string, any]) => userData.uid !== userUid
                      );
                      const totalCount = filteredEntries.length;

                      // Group paired users into blocks
                      const visited = new Set<string>();
                      const pairedBlocks: { a: [string, any]; b: [string, any] }[] = [];
                      const soloUsers: [string, any][] = [];

                      filteredEntries.forEach(([id, userData]) => {
                        if (visited.has(id)) return;
                        if (userData.partnerId && !visited.has(userData.partnerId)) {
                          const partnerEntry = filteredEntries.find(([pid]) => pid === userData.partnerId);
                          if (partnerEntry) {
                            visited.add(id);
                            visited.add(userData.partnerId);
                            pairedBlocks.push({ a: [id, userData], b: partnerEntry });
                            return;
                          }
                        }
                        visited.add(id);
                        soloUsers.push([id, userData]);
                      });

                      const renderUserRow = ([id, userData]: [string, any], showDelete = true) => {
                        const isStale = Date.now() - (userData.lastActive || 0) > 10000;
                        return (
                          <div key={id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.7rem', 
                            opacity: isStale ? 0.4 : 1,
                            transition: 'opacity 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ 
                                width: 8, height: 8, 
                                background: isStale ? '#666' : (userData.color || '#4ade80'), 
                                boxShadow: isStale ? 'none' : `0 0 6px ${userData.color || '#4ade80'}`,
                                flexShrink: 0 
                              }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{userData.name || 'Ghost'}</div>
                                <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                  x:{userData.x?.toFixed(0)}% y:{userData.y?.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {userData.message && (
                                <div style={{ 
                                  fontSize: '0.65rem', padding: '0.2rem 0.5rem', 
                                  background: userData.color || 'var(--primary)', color: '#000', fontWeight: 700,
                                  maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                  {userData.message}
                                </div>
                              )}
                              {showDelete && (
                                <button
                                  onClick={() => handleDeletePresenceEntry(id)}
                                  style={{ background: 'none', border: '1px solid var(--outline-color)', color: '#ff4d4d', cursor: 'pointer', padding: '3px 6px', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <X size={10} /> DEL
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            {/* Action Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                              <button
                                className="btnOutline"
                                onClick={handlePurgeAllStale}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.6rem', transform: 'none', color: '#f59e0b', borderColor: '#f59e0b' }}
                              >
                                <Clock size={10} /> Purge Stale
                              </button>
                              <button
                                className="btnOutline"
                                onClick={handleDeleteAllPresence}
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.6rem', transform: 'none', color: '#ff4d4d', borderColor: '#ff4d4d' }}
                              >
                                <X size={10} /> Clear All
                              </button>
                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  onClick={() => setAutoCleanupEnabled(!autoCleanupEnabled)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    padding: '0.3rem 0.6rem', border: '1px solid var(--outline-color)',
                                    cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
                                    background: autoCleanupEnabled ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                                    color: autoCleanupEnabled ? '#4ade80' : 'var(--foreground)',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {autoCleanupEnabled ? <CheckSquare size={11} /> : <Square size={11} />}
                                  Auto-Clean
                                </div>
                                {autoCleanupEnabled && (
                                  <select
                                    value={autoCleanupInterval}
                                    onChange={(e) => setAutoCleanupInterval(Number(e.target.value))}
                                    style={{ 
                                      background: 'transparent', border: '1px solid var(--outline-color)', 
                                      color: 'var(--foreground)', fontSize: '0.6rem', padding: '0.25rem 0.4rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value={10}>10s</option>
                                    <option value={30}>30s</option>
                                    <option value={60}>1m</option>
                                    <option value={120}>2m</option>
                                    <option value={300}>5m</option>
                                  </select>
                                )}
                              </div>
                            </div>

                            {totalCount === 0 ? (
                              <div style={{ fontSize: '0.78rem', opacity: 0.6, textAlign: 'center', padding: '1rem' }}>
                                No active cursor users right now.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {/* Paired Blocks */}
                                {pairedBlocks.map(({ a, b }) => (
                                  <div key={`pair-${a[0]}-${b[0]}`} style={{ 
                                    border: '1px solid var(--primary)',
                                    background: 'transparent',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{ 
                                      padding: '0.3rem 0.7rem', 
                                      background: 'transparent', 
                                      borderBottom: '1px solid var(--primary)',
                                      fontSize: '0.6rem', fontWeight: 800, 
                                      textTransform: 'uppercase', letterSpacing: '0.06em',
                                      color: 'var(--primary)',
                                      display: 'flex', alignItems: 'center', gap: '0.4rem'
                                    }}>
                                      <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--primary)' }} />
                                      Connected Pair
                                    </div>
                                    {renderUserRow(a, true)}
                                    <div style={{ height: '1px', background: 'var(--outline-color)', margin: '0 0.7rem' }} />
                                    {renderUserRow(b, true)}
                                  </div>
                                ))}

                                {/* Solo Users */}
                                {soloUsers.map((entry) => (
                                  <div key={entry[0]} style={{ border: '1px solid var(--outline-color)' }}>
                                    {renderUserRow(entry, true)}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.5rem', textAlign: 'center' }}>
                              {totalCount} user{totalCount !== 1 ? 's' : ''} online{autoCleanupEnabled ? ` • Auto-clean every ${autoCleanupInterval}s` : ''}
                            </div>
                          </div>

                          {/* Chat Sidebar */}
                          {showChatSidebar && (
                            <div style={{ 
                              width: '280px', border: '1px solid var(--outline-color)', 
                              display: 'flex', flexDirection: 'column', overflow: 'hidden'
                            }}>
                              <div style={{ 
                                padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--outline-color)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'transparent'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
                                  <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Chat</span>
                                </div>
                                <button 
                                  onClick={() => setShowChatSidebar(false)} 
                                  style={{ background: 'none', border: 'none', color: 'var(--foreground)', opacity: 0.6, cursor: 'pointer', padding: '2px' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div style={{ 
                                flex: 1, overflowY: 'auto', padding: '0.6rem', 
                                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                                maxHeight: '260px', minHeight: '120px'
                              }}>
                                {chatMessages.length === 0 ? (
                                  <div style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'center', padding: '2rem 0.5rem' }}>
                                    No messages yet. Users can press / to chat.
                                  </div>
                                ) : (
                                  chatMessages.map((msg, idx) => (
                                    <div key={`${msg.id}-${idx}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                      <div style={{ width: 6, height: 6, background: msg.color, marginTop: '0.35rem', flexShrink: 0 }} />
                                      <div style={{ minWidth: 0 }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.65rem', color: msg.color }}>{msg.name}</span>
                                        <div style={{ fontSize: '0.72rem', opacity: 0.85, wordBreak: 'break-word' }}>{msg.message}</div>
                                      </div>
                                    </div>
                                  ))
                                )}
                                <div ref={chatEndRef} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Items List Rendering */}
              {activeTab !== 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {activeTab === 'blogs' && (
                     <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.7, letterSpacing: '0.1em' }}>Total Active Dispatches</div>
                         <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{blogData.length} POSTS</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.7, letterSpacing: '0.1em' }}>Total Engagements</div>
                         <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.9 }}>
                           {(blogData.reduce((acc, b) => acc + (b.views || 0), 0)).toLocaleString()} VIEWS / {(blogData.reduce((acc, b) => acc + (b.likes || 0), 0)).toLocaleString()} LIKES
                         </div>
                       </div>
                     </div>
                   )}
                   {activeTab === 'users' && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                       {[
                         { id: 'all', label: 'All Users' },
                         { id: 'google', label: 'Google Logins' },
                         { id: 'anonymous', label: 'Anonymous' }
                       ].map(v => (
                         <button
                           key={v.id}
                           onClick={() => setUserView(v.id as any)}
                           className={userView === v.id ? "btnSolid" : "btnOutline"}
                           style={{
                             padding: '0.45rem 0.8rem',
                             borderColor: userView === v.id ? 'var(--primary)' : 'var(--foreground)',
                             color: userView === v.id ? '#000' : 'var(--foreground)',
                             background: userView === v.id ? 'var(--primary)' : 'transparent',
                             transform: 'none'
                           }}
                         >
                           {v.label}
                         </button>
                       ))}
                       {userView === 'anonymous' && (
                         <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem' }}>
                            <button 
                              onClick={() => setBulkCleanupConfirm({ open: true, type: 'deactivated' })}
                              className="btnOutline" 
                              style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', borderColor: '#ff4d4d', color: '#ff4d4d' }}
                            >
                              <Trash2 size={13} /> Remove Deactivated
                            </button>
                         </div>
                       )}
                     </div>
                   )}
                   {activeTab === 'payments' && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                       <button
                         className="btnOutline"
                         onClick={() => { setPaymentView('payments'); setOnlyKeyNotSet(false); }}
                         style={{
                           padding: '0.45rem 0.8rem',
                           borderColor: paymentView === 'payments' ? 'var(--primary)' : 'var(--foreground)',
                           color: paymentView === 'payments' ? '#000' : 'var(--foreground)',
                           background: paymentView === 'payments' ? 'var(--primary)' : 'transparent',
                           transform: 'none'
                         }}
                       >
                         Payments
                       </button>
                       <button
                         className="btnOutline"
                         onClick={() => setPaymentView('offerPayments')}
                         style={{
                           padding: '0.45rem 0.8rem',
                           borderColor: paymentView === 'offerPayments' ? 'var(--primary)' : 'var(--foreground)',
                           color: paymentView === 'offerPayments' ? '#000' : 'var(--foreground)',
                           background: paymentView === 'offerPayments' ? 'var(--primary)' : 'transparent',
                           transform: 'none'
                         }}
                       >
                         Offer Payments
                       </button>
                       {paymentView === 'offerPayments' && (
                         <div
                           onClick={() => setOnlyKeyNotSet(!onlyKeyNotSet)}
                           style={{
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.45rem',
                             padding: '0.45rem 0.75rem',
                             border: '1px solid var(--outline-color)',
                             cursor: 'pointer',
                             background: onlyKeyNotSet ? 'var(--primary)' : 'transparent',
                             color: onlyKeyNotSet ? '#000' : 'var(--foreground)',
                           }}
                         >
                           {onlyKeyNotSet ? <CheckSquare size={16} color="#000" /> : <Square size={16} />}
                           <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>Key Not Set Only</span>
                         </div>
                       )}
                     </div>
                   )}

                   {/* Local Search Bar */}
                   <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                      <input 
                        type="text" 
                        placeholder={`Search ${activeTab}...`} 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ 
                          width: '100%',
                          padding: '0.8rem 1rem 0.8rem 2.8rem',
                          background: 'transparent',
                          border: '1px solid var(--outline-color)',
                          borderRadius: '12px',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem'
                        }} 
                      />
                   </div>

                   <div style={{ border: '1px solid var(--outline-color)', background: 'transparent', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                             <tr style={{ borderBottom: '1px solid var(--outline-color)', background: 'transparent' }}>
                                <th style={{ textAlign: 'left', padding: '1rem', width: '30%' }}>Record</th>
                                <th style={{ textAlign: 'left', padding: '1rem', width: '30%' }}>Details</th>
                                <th style={{ textAlign: 'left', padding: '1rem', width: '20%' }}>Status/Tags</th>
                                <th style={{ textAlign: 'left', padding: '1rem', width: '20%' }}>Actions</th>
                             </tr>
                          </thead>
                          <tbody>
                            {/* User Rendering */}
                            {activeTab === 'users' && filteredUsers.map((u: any) => (
                              <React.Fragment key={u.uid}>
                               <tr style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                  <td style={{ padding: '1rem' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        {u.photoURL ? (
                                          <img
                                            src={u.photoURL}
                                            alt="avatar"
                                            width={32}
                                            height={32}
                                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--outline-color)' }} />
                                        )}
                                        <div>
                                           <div style={{ fontWeight: 700 }}>{u.name || 'Anonymous'}</div>
                                           <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{u.email}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                     <div>{u.country || 'Unknown'}</div>
                                     <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>UID: {u.uid.substring(0, 8)}...</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                     {u.isOwner ? <span style={{ color: 'var(--primary)', fontWeight: 800 }}>OWNER</span> : <span style={{ opacity: 0.75 }}>USER</span>}
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                     <button
                                       onClick={() => setRoleConfirm({ open: true, targetUid: u.uid, nextOwner: !u.isOwner, name: u.name || u.email || u.uid })}
                                       className="btnOutline"
                                       style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                                     >
                                        Role
                                     </button>
                                     <button
                                       onClick={() => setUserDeleteConfirm({ open: true, uid: u.uid, name: u.name || u.email || 'Anonymous' })}
                                       className="btnOutline"
                                       style={{ padding: '0.4rem 0.55rem', fontSize: '0.7rem', marginLeft: '0.5rem', color: '#ff4d4d', borderColor: '#ff4d4d' }}
                                     >
                                        <Trash2 size={13} />
                                     </button>
                                     <button onClick={() => setExpandedUsers(prev => ({ ...prev, [u.uid]: !prev[u.uid] }))} className="btnOutline" style={{ padding: '0.4rem 0.55rem', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                                       {expandedUsers[u.uid] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                     </button>
                                  </td>
                               </tr>
                               {expandedUsers[u.uid] && (
                                 <tr style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                   <td colSpan={4} style={{ padding: '0.85rem 1rem' }}>
                                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', fontSize: '0.78rem' }}>
                                       <div><strong>UID:</strong> {u.uid}</div>
                                       <div><strong>Email:</strong> {u.email || "N/A"}</div>
                                       <div><strong>Name:</strong> {u.name || "Anonymous"}</div>
                                       <div><strong>Country:</strong> {u.country || "Unknown"}</div>
                                       <div><strong>Role:</strong> {u.isOwner ? "OWNER" : "USER"}</div>
                                     </div>
                                   </td>
                                 </tr>
                               )}
                              </React.Fragment>
                            ))}

                            {/* Payment Rendering */}
                            {activeTab === 'payments' && filteredPayments.map((p: any) => (
                              (() => {
                                const paymentKey = `${p.source}-${p.userId}-${p.id}`;
                                return (
                              <React.Fragment key={`${p.source}-${p.userId}-${p.id}`}>
                               <tr style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                  <td style={{ padding: '1rem' }}>
                                     <div style={{ fontWeight: 700 }}>{p.game}</div>
                                     <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Order ID: {p.id.substring(0, 12)}...</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                     <div>{p.payerEmail}</div>
                                     <div style={{ fontWeight: 800, color: 'var(--primary)' }}>${p.amount} USD</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                     <div style={{
                                       display: 'flex',
                                       alignItems: 'center',
                                       gap: '0.4rem',
                                       color: (p.status === 'COMPLETED' || p.status === 'ACTIVATED') ? '#4ade80' : 'var(--foreground)',
                                       opacity: (p.status === 'COMPLETED' || p.status === 'ACTIVATED') ? 1 : 0.75
                                     }}>
                                        {(p.status === 'COMPLETED' || p.status === 'ACTIVATED') ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                        {p.status}
                                     </div>
                                     <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{new Date(p.purchaseDate).toLocaleDateString()}</div>
                                  </td>
                                  <td style={{ padding: '1rem' }}>
                                      {p.source === 'offerPayment' ? (
                                        !p.steamKey ? (
                                           <button onClick={() => setKeyModal({ open: true, targetUid: p.userId, paymentId: p.id, key: "" })} className="btnSolid" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>
                                              <Key size={12} /> Assign Key
                                           </button>
                                        ) : (
                                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 800 }}>
                                              <CheckCircle2 size={14} /> Key Set
                                           </div>
                                        )
                                      ) : (
                                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>N/A</span>
                                      )}
                                     <button onClick={() => setExpandedPayments(prev => ({ ...prev, [paymentKey]: !prev[paymentKey] }))} className="btnOutline" style={{ padding: '0.4rem 0.55rem', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                                       {expandedPayments[paymentKey] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                     </button>
                                  </td>
                               </tr>
                               {expandedPayments[paymentKey] && (
                                 <tr style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                   <td colSpan={4} style={{ padding: '0.85rem 1rem' }}>
                                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', fontSize: '0.78rem' }}>
                                       <div><strong>Record Type:</strong> {p.source === 'offerPayment' ? 'Offer Payment' : 'Payment'}</div>
                                       <div><strong>User UID:</strong> {p.userId}</div>
                                       <div><strong>Order ID:</strong> {p.id}</div>
                                       <div><strong>PayPal Order ID:</strong> {p.paypalOrderId || 'N/A'}</div>
                                       <div><strong>Coupon:</strong> {p.coupon || 'None'}</div>
                                       <div><strong>Steam Key:</strong> {p.steamKey ? 'Set' : 'Not Set'}</div>
                                     </div>
                                   </td>
                                 </tr>
                               )}
                              </React.Fragment>
                                );
                              })()
                            ))}

                            {/* Games Rendering */}
                            {activeTab === 'games' && filteredGames.map((g: any) => (
                              <tr key={g.id} style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontWeight: 700 }}>{g.title || 'Untitled Game'}</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>ID: {g.id}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div>Price: ${g.originalPrice} ({g.discount})</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{g.platform} / {g.operatingSystem}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div>{g.quantity} Left</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Expires: {g.expire ? new Date(g.expire).toLocaleDateString() : 'N/A'}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  {g.gameUrl ? (
                                    <a href={g.gameUrl} target="_blank" className="btnOutline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', textDecoration: 'none' }}>
                                      <ExternalLink size={12} /> Open Store
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>No URL</span>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {/* Blogs Rendering */}
                            {activeTab === 'blogs' && filteredBlogs.map((b: any) => (
                              <tr key={b.slug} style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>Slug: {b.slug}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div>{formatDate(new Date(b.date), 'dd MMM yyyy')}</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.8, color: 'var(--primary)', fontWeight: 700 }}>{b.authorName}</div>
                                  <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{b.readingTime}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                      <TrendingUp size={10} /> {b.views || 0}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                      <CheckCircle2 size={10} /> {b.likes || 0}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {b.tags?.slice(0, 3).map((t: string) => (
                                      <span key={t} style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', border: '1px solid var(--outline-color)', borderRadius: '2px' }}>{t}</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Link href={`/blog/${b.slug}`} target="_blank" className="btnOutline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', textDecoration: 'none' }}>
                                      <ExternalLink size={12} /> View
                                    </Link>
                                    <button 
                                      onClick={() => setBlogDeleteConfirm({ open: true, slug: b.slug, title: b.title })} 
                                      className="btnOutline" 
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#ff4d4d', borderColor: '#ff4d4d' }}
                                    >
                                      <X size={12} /> Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                      </table>
                   </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </Modal>
    <Modal isOpen={roleConfirm.open} onClose={() => setRoleConfirm({ open: false, targetUid: "", nextOwner: false, name: "" })} title="Confirm Role Change">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          Switch <strong>{roleConfirm.name}</strong> to <strong>{roleConfirm.nextOwner ? 'OWNER' : 'USER'}</strong>?
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btnOutline" style={{ flex: 1 }} onClick={() => setRoleConfirm({ open: false, targetUid: "", nextOwner: false, name: "" })}>Cancel</button>
          <button className="btnSolid" style={{ flex: 1 }} onClick={toggleOwner}>Confirm</button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={keyModal.open} onClose={() => setKeyModal({ open: false, targetUid: "", paymentId: "", key: "" })} title="Assign Steam Key">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Steam Key</label>
        <input
          type="text"
          value={keyModal.key}
          onChange={(e) => setKeyModal(prev => ({ ...prev, key: e.target.value }))}
          placeholder="XXXX-XXXX-XXXX"
          style={{ width: '100%', padding: '0.8rem 1rem', background: 'transparent', border: '1px solid var(--outline-color)', color: 'var(--foreground)' }}
        />
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btnOutline" style={{ flex: 1 }} onClick={() => setKeyModal({ open: false, targetUid: "", paymentId: "", key: "" })}>Cancel</button>
          <button className="btnSolid" style={{ flex: 1 }} onClick={handleUpdateKey}><Key size={14} /> Save Key</button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={blogDeleteConfirm.open} onClose={() => setBlogDeleteConfirm({ open: false, slug: "", title: "" })} title="Delete Dispatch">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          Are you sure you want to delete <strong>{blogDeleteConfirm.title}</strong>? This action is permanent and cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btnOutline" style={{ flex: 1 }} onClick={() => setBlogDeleteConfirm({ open: false, slug: "", title: "" })}>Cancel</button>
          <button className="btnSolid" style={{ flex: 1, backgroundColor: '#ff4d4d', borderColor: '#ff4d4d' }} onClick={handleDeleteBlog}>Confirm Delete</button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={userDeleteConfirm.open} onClose={() => setUserDeleteConfirm({ open: false, uid: "", name: "" })} title="Delete User Account">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          Delete everything for <strong>{userDeleteConfirm.name}</strong>? This will remove their record and all purchase history.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btnOutline" style={{ flex: 1 }} onClick={() => setUserDeleteConfirm({ open: false, uid: "", name: "" })}>Cancel</button>
          <button className="btnSolid" style={{ flex: 1, backgroundColor: '#ff4d4d', borderColor: '#ff4d4d' }} onClick={handleDeleteUser}>Delete User</button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={bulkCleanupConfirm.open} onClose={() => setBulkCleanupConfirm({ ...bulkCleanupConfirm, open: false })} title="Bulk Database Cleanup">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          {bulkCleanupConfirm.type === 'anonymous' 
            ? "Delete ALL anonymous accounts (no email) from the database?"
            : "Remove ALL deactivated accounts (no email AND no purchase history)?"}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#ff4d4d', fontWeight: 700 }}>⚠️ This action is permanent and cannot be reversed.</p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btnOutline" style={{ flex: 1 }} onClick={() => setBulkCleanupConfirm({ ...bulkCleanupConfirm, open: false })}>Cancel</button>
          <button className="btnSolid" style={{ flex: 1, backgroundColor: '#ff4d4d', borderColor: '#ff4d4d' }} onClick={handleBulkCleanup}>Confirm Clean</button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={isCleaning} onClose={() => {}} title="Database Optimization">
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ marginBottom: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>Optimizing User Records...</p>
        <div style={{ width: '100%', height: '8px', background: 'var(--outline-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ width: `${cleaningProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #fff)', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 700 }}>
          {cleaningProgress < 100 ? `CLEANING: ${cleaningProgress}%` : 'COMPLETED'}
        </div>
      </div>
    </Modal>

    {/* Creation Modals */}
    <AddOfferModal isOpen={showAddOffer} onClose={() => setShowAddOffer(false)} onSuccess={() => { setShowAddOffer(false); fetchData(); }} />
    <CouponModal isOpen={showAddCoupon} onClose={() => setShowAddCoupon(false)} onSuccess={() => { setShowAddCoupon(false); fetchData(); }} />
    <DispatchModal isOpen={showAddBlog} onClose={() => setShowAddBlog(false)} onSuccess={() => { setShowAddBlog(false); fetchData(); }} />
    <ListGameModal isOpen={showAddGame} onClose={() => setShowAddGame(false)} onSuccess={() => { setShowAddGame(false); fetchData(); }} />
    </>
  );
}

