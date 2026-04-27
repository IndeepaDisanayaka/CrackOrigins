'use client';

import React, { useState } from 'react';
import { Hash, Tag, Percent, Calendar, Plus, Users, Gift, CheckSquare, Square } from 'lucide-react';
import Modal from '../Modal';
import { createOffer, updateOffer } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface AddOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editData?: any;
}

export default function AddOfferModal({ isOpen, onClose, onSuccess, editData }: AddOfferModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [offerForm, setOfferForm] = useState({
    id: "",
    title: "",
    originalPrice: "",
    discount: "",
    expire: "",
    quantity: 1,
    operatingSystem: "windows",
    platform: "steam",
    gameUrl: "",
    isGiveaway: false,
    targetAffiliates: "10",
    offerScope: "local",
  });

  React.useEffect(() => {
    if (isOpen && editData) {
      setOfferForm({
        id: editData.id || "",
        title: editData.title || "",
        originalPrice: editData.originalPrice?.toString() || "",
        discount: editData.discount ? editData.discount.replace('%', '') : "",
        expire: editData.expire ? editData.expire.split('T')[0] : "",
        quantity: editData.quantity ?? 1,
        operatingSystem: editData.operatingSystem || "windows",
        platform: editData.platform || "steam",
        gameUrl: editData.gameUrl || "",
        isGiveaway: editData.isGiveaway ?? false,
        targetAffiliates: editData.targetAffiliates?.toString() || "10",
        offerScope: editData.offerScope || "local",
      });
    } else if (isOpen && !editData) {
      setOfferForm({
        id: "", title: "", originalPrice: "", discount: "", expire: "", quantity: 1, 
        operatingSystem: "windows", platform: "steam", gameUrl: "", 
        isGiveaway: false, targetAffiliates: "10", offerScope: "local"
      });
    }
  }, [isOpen, editData]);

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const finalDiscount = offerForm.isGiveaway ? "100" : offerForm.discount;

    if (!offerForm.id || !offerForm.title || !offerForm.originalPrice || !finalDiscount || !offerForm.expire || !offerForm.gameUrl) {
      showToast("Please fill all fields.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        ...offerForm,
        discount: `${finalDiscount}%`,
        originalPrice: Number(offerForm.originalPrice),
        quantity: Number(offerForm.quantity),
        targetAffiliates: Number(offerForm.targetAffiliates),
        offerScope: offerForm.offerScope,
      };

      const result = editData 
        ? await updateOffer(user.uid, editData.id, payload)
        : await createOffer(user.uid, payload);
        
      if (result.success) {
        showToast(editData ? "Offer updated successfully!" : "Offer added successfully!", "success");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(result.error || (editData ? "Failed to update offer." : "Failed to add offer."), "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const getFinalOfferPrice = () => {
    if (offerForm.isGiveaway) return "0.00";
    const base = parseFloat(offerForm.originalPrice) || 0;
    const discount = parseFloat(offerForm.discount) || 0;
    if (!base) return "0.00";
    const final = Math.max(0, base - (base * discount) / 100);
    return final.toFixed(2);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Edit Game Offer" : "Add Game Offer"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <form onSubmit={handleAddOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div 
            onClick={() => setOfferForm({ ...offerForm, isGiveaway: !offerForm.isGiveaway })}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '1rem', 
                background: 'transparent',
                border: `1px solid ${offerForm.isGiveaway ? 'var(--primary)' : 'var(--outline-color)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s'
            }}
          >
            <div style={{ color: offerForm.isGiveaway ? 'var(--primary)' : 'var(--text-muted)' }}>
                {offerForm.isGiveaway ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: offerForm.isGiveaway ? 'var(--primary)' : 'var(--foreground)' }}>
                    LIST AS GIVEAWAY
                </span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Requires affiliate recruitment to claim</span>
            </div>
            <Gift size={20} style={{ marginLeft: 'auto', opacity: 0.3 }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div 
              onClick={() => setOfferForm({ ...offerForm, offerScope: 'local' })}
              style={{ 
                  flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
                  border: `1px solid ${offerForm.offerScope === 'local' ? 'var(--primary)' : 'var(--outline-color)'}`,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s'
              }}
            >
              <div style={{ color: offerForm.offerScope === 'local' ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {offerForm.offerScope === 'local' ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: offerForm.offerScope === 'local' ? 'var(--primary)' : 'var(--foreground)' }}>LOCAL OFFER</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Normal Listing</span>
              </div>
            </div>

            <div 
              onClick={() => setOfferForm({ ...offerForm, offerScope: 'global' })}
              style={{ 
                  flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
                  background: offerForm.offerScope === 'global' ? 'rgba(254, 182, 12, 0.1)' : 'transparent',
                  border: `1px solid ${offerForm.offerScope === 'global' ? 'var(--primary)' : 'var(--outline-color)'}`,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s'
              }}
            >
              <div style={{ color: offerForm.offerScope === 'global' ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {offerForm.offerScope === 'global' ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: offerForm.offerScope === 'global' ? 'var(--primary)' : 'var(--foreground)' }}>GLOBAL OFFER</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Panic Yellow Design</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={12} /> Steam App ID
            </label>
            <input type="text" placeholder="e.g. 1245620" className={styles.adminInput} value={offerForm.id} onChange={e => setOfferForm({ ...offerForm, id: e.target.value })} disabled={!!editData} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={12} /> Game Title
            </label>
            <input type="text" placeholder="e.g. Elden Ring" className={styles.adminInput} value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={12} /> Value (Original Price)
              </label>
              <input style={{ flex: 1 }} type="number" placeholder="e.g. 59.99" className={styles.adminInput} value={offerForm.originalPrice} onChange={e => setOfferForm({ ...offerForm, originalPrice: e.target.value })} />
            </div>
            {!offerForm.isGiveaway && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Percent size={12} /> Discount %
                    </label>
                    <input style={{ flex: 1 }} type="number" placeholder="e.g. 10" className={styles.adminInput} value={offerForm.discount} onChange={e => setOfferForm({ ...offerForm, discount: e.target.value })} />
                </div>
            )}
            {offerForm.isGiveaway && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={12} /> Target Affiliates
                    </label>
                    <input style={{ flex: 1 }} type="number" placeholder="10" className={styles.adminInput} value={offerForm.targetAffiliates} onChange={e => setOfferForm({ ...offerForm, targetAffiliates: e.target.value })} />
                </div>
            )}
          </div>
          
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
            Status: {offerForm.isGiveaway ? "FREE GIVEAWAY" : `PRICE $${getFinalOfferPrice()}`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Tag size={12} /> Steam Store URL
            </label>
            <input type="url" placeholder="https://store.steampowered.com/app/..." className={styles.adminInput} value={offerForm.gameUrl} onChange={e => setOfferForm({ ...offerForm, gameUrl: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={12} /> OS
              </label>
              <input style={{ flex: 1 }} type="text" placeholder="windows" className={styles.adminInput} value={offerForm.operatingSystem} onChange={e => setOfferForm({ ...offerForm, operatingSystem: e.target.value })} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Hash size={12} /> Quantity
              </label>
              <input style={{ flex: 1 }} type="number" placeholder="1" className={styles.adminInput} value={offerForm.quantity} onChange={e => setOfferForm({ ...offerForm, quantity: parseInt(e.target.value || "0") })} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={12} /> Expiration Date
            </label>
            <input type="date" className={styles.adminInput} value={offerForm.expire} onChange={e => setOfferForm({ ...offerForm, expire: e.target.value })} />
          </div>

          <button type="submit" className="btnSolid" disabled={isGenerating} style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', gap: '0.5rem' }}>
            {isGenerating ? "Processing..." : (editData ? "Save Changes" : <><Plus size={16} /> Add Offer</>)}
          </button>
        </form>
      </div>
    </Modal>
  );
}
