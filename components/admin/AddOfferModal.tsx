'use client';

import React, { useState } from 'react';
import { Hash, Tag, Percent, Calendar, Plus } from 'lucide-react';
import Modal from '../Modal';
import { createOffer } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface AddOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddOfferModal({ isOpen, onClose }: AddOfferModalProps) {
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
  });

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!offerForm.id || !offerForm.title || !offerForm.originalPrice || !offerForm.discount || !offerForm.expire || !offerForm.gameUrl) {
      showToast("Please fill all fields.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await createOffer(user.uid, {
        ...offerForm,
        discount: `${offerForm.discount}%`,
        originalPrice: Number(offerForm.originalPrice),
        quantity: Number(offerForm.quantity),
      });
      if (result.success) {
        showToast("Offer added!", "success");
        onClose();
        setOfferForm({ id: "", title: "", originalPrice: "", discount: "", expire: "", quantity: 1, operatingSystem: "windows", platform: "steam", gameUrl: "" });
      } else {
        showToast(result.error || "Failed to add offer.", "error");
      }
    } catch {
      showToast("Error adding offer.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const getFinalOfferPrice = () => {
    const base = parseFloat(offerForm.originalPrice) || 0;
    const discount = parseFloat(offerForm.discount) || 0;
    if (!base) return "0.00";
    const final = Math.max(0, base - (base * discount) / 100);
    return final.toFixed(2);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Game Offer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <form onSubmit={handleAddOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={12} /> Steam App ID
            </label>
            <input type="text" placeholder="e.g. 1245620" className={styles.adminInput} value={offerForm.id} onChange={e => setOfferForm({ ...offerForm, id: e.target.value })} />
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
                <Tag size={12} /> Original Price
              </label>
              <input style={{ flex: 1 }} type="number" placeholder="e.g. 10.00" className={styles.adminInput} value={offerForm.originalPrice} onChange={e => setOfferForm({ ...offerForm, originalPrice: e.target.value })} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Percent size={12} /> Discount %
              </label>
              <input style={{ flex: 1 }} type="number" placeholder="e.g. 10" className={styles.adminInput} value={offerForm.discount} onChange={e => setOfferForm({ ...offerForm, discount: e.target.value })} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
            Final Price: ${getFinalOfferPrice()}
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
            {isGenerating ? "..." : <Plus size={16} />} Add Offer
          </button>
        </form>
      </div>
    </Modal>
  );
}
