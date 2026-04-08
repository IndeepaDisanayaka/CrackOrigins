'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  Users, CreditCard, TrendingUp, Gamepad2,
  Search, Shield, Key, ChevronDown, ChevronUp, ExternalLink,
  RefreshCw, CheckCircle2, AlertCircle, DollarSign, CheckSquare, Square
} from 'lucide-react';
import { 
  getAdminDashboardData,
  updateUserOwnerStatus,
  updateUserKey
} from '@/lib/admin-actions';
import { getPayPalBalance } from '@/lib/paypal-actions';
import { useToast } from './Toast';

interface AdminPanelProps {
  userUid: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type Tab = 'overview' | 'users' | 'payments' | 'games';
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
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [paypalBalance, setPayPalBalance] = useState<string | null>(null);
  const [showPayPalBalance, setShowPayPalBalance] = useState(false);
  const [isPayPalLoading, setIsPayPalLoading] = useState(false);

  const [roleConfirm, setRoleConfirm] = useState<{ open: boolean; targetUid: string; nextOwner: boolean; name: string }>({
    open: false, targetUid: "", nextOwner: false, name: ""
  });
  const [keyModal, setKeyModal] = useState<{ open: boolean; targetUid: string; paymentId: string; key: string }>({
    open: false, targetUid: "", paymentId: "", key: ""
  });

  const fetchData = async () => {
    setLoading(true);
    const res = await getAdminDashboardData(userUid);
    if (res.success) {
      setData(res.data);
    } else {
      showToast(res.error || "Failed to load dashboard.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleTogglePayPalBalance = async () => {
    if (showPayPalBalance) {
      setShowPayPalBalance(false);
      return;
    }

    setShowPayPalBalance(true);
    if (paypalBalance || isPayPalLoading) return;

    setIsPayPalLoading(true);
    const res = await getPayPalBalance(userUid);
    if (res.success) {
      setPayPalBalance(`${res.currency} ${res.amount}`);
    } else {
      showToast(res.error || "Failed to load PayPal balance.", "error");
    }
    setIsPayPalLoading(false);
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

  // Filter Logic
  const filteredUsers = data?.users?.filter((u: any) => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.uid?.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
             ].map(item => (
               <button
                 key={item.id}
                 onClick={() => { setActiveTab(item.id as Tab); setSearch(""); }}
                 className="btnOutline"
                 style={{
                   width: '100%',
                   justifyContent: 'flex-start',
                   padding: '0.65rem 0.9rem',
                   borderColor: activeTab === item.id ? 'var(--primary)' : 'var(--foreground)',
                   color: activeTab === item.id ? 'var(--primary)' : 'var(--foreground)',
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
                <div className="modalLoader"></div>
                <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Loading records...</p>
             </div>
          ) : (
            <>
              {/* Top Header Content Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                   <p style={{ fontSize: '0.8rem', opacity: 0.75 }}>Manage your studio's ecosystem records.</p>
                </div>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <Users size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{data?.users?.length || 0}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase' }}>Total Users</div>
                  </div>
                  <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <CreditCard size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{data?.payments?.length || 0}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase' }}>Total Orders</div>
                  </div>
                  <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <DollarSign size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>${data?.payments?.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase' }}>Total Revenue (EST)</div>
                  </div>
                  <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
                    <DollarSign size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>
                      {showPayPalBalance ? (paypalBalance || (isPayPalLoading ? 'Loading...' : 'N/A')) : '••••••'}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase', marginBottom: '0.8rem' }}>PayPal Balance</div>
                    <button className="btnOutline" onClick={handleTogglePayPalBalance} style={{ padding: '0.35rem 0.65rem', fontSize: '0.65rem', transform: 'none' }}>
                      {showPayPalBalance ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              {/* Items List Rendering */}
              {activeTab !== 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                   <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                         <thead>
                            <tr style={{ borderBottom: '1px solid var(--outline-color)', opacity: 0.75 }}>
                               <th style={{ padding: '1rem' }}>Record</th>
                               <th style={{ padding: '1rem' }}>Details</th>
                               <th style={{ padding: '1rem' }}>Status</th>
                               <th style={{ padding: '1rem' }}>Actions</th>
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
                                          // Avoid next/image remote host config runtime failures for Google avatars
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
                                        Switch Role
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
                                     {!p.steamKey ? (
                                        <button onClick={() => setKeyModal({ open: true, targetUid: p.userId, paymentId: p.id, key: "" })} className="btnSolid" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>
                                           <Key size={12} /> Assign Key
                                        </button>
                                     ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 800 }}>
                                           <CheckCircle2 size={14} /> Key Set
                                        </div>
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
                                       <div><strong>PayPal ID:</strong> {p.paypalOrderId || 'N/A'}</div>
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
    </>
  );
}

