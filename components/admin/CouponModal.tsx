'use client';

import React, { useState } from 'react';
import { Tag, Percent, Hash, Calendar, Plus, Copy } from 'lucide-react';
import Modal from '../Modal';
import { createCoupon } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [couponForm, setCouponForm] = useState({
    name: "",
    discount: "",
    expire: "",
    quantity: 100
  });

  const handleGenerateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!couponForm.name || !couponForm.discount || !couponForm.expire) {
      showToast("Please fill all fields.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await createCoupon(user.uid, couponForm);
      if (result.success && result.couponCode) {
        setGeneratedCode(result.couponCode);
        showToast("Coupon generated!", "success");
      } else {
        showToast(result.error || "Failed to create coupon.", "error");
      }
    } catch {
      showToast("Error creating coupon.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Coupon Generator">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        {!generatedCode ? (
          <form onSubmit={handleGenerateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={12} /> Coupon Name
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Sale 2026"
                className={styles.adminInput}
                value={couponForm.name}
                onChange={e => setCouponForm({ ...couponForm, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Percent size={12} /> Discount
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50"
                  className={styles.adminInput}
                  value={couponForm.discount}
                  onChange={e => setCouponForm({ ...couponForm, discount: e.target.value })}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Hash size={12} /> Quantity
                </label>
                <input
                  type="number"
                  className={styles.adminInput}
                  value={couponForm.quantity}
                  onChange={e => setCouponForm({ ...couponForm, quantity: parseInt(e.target.value || "0") })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={12} /> Expiration Date
              </label>
              <input
                type="date"
                className={styles.adminInput}
                value={couponForm.expire}
                onChange={e => setCouponForm({ ...couponForm, expire: e.target.value })}
              />
            </div>

            <button type="submit" className="btnSolid" disabled={isGenerating} style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', gap: '0.5rem' }}>
              {isGenerating ? "..." : <Plus size={16} />} Generate Code
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ border: '1px dashed var(--primary)', padding: '1rem', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 900, letterSpacing: '0.12em' }}>
                COUPON CREATED
              </p>
              <h2 style={{ fontSize: '1.25rem', letterSpacing: '4px', fontFamily: 'monospace', color: 'var(--primary)' }}>{generatedCode}</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btnSolid" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(generatedCode); showToast("Copied!", "success"); }}>
                <Copy size={16} /> Copy
              </button>
              <button className="btnOutline" style={{ flex: 1 }} onClick={() => { setGeneratedCode(""); setCouponForm({ name: "", discount: "", expire: "", quantity: 100 }); }}>
                New
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
