'use client';

import React, { useState } from 'react';
import { BadgeCheck, Hash, Type, FileText, Plus, Calendar, ShieldCheck, Tag } from 'lucide-react';
import Modal from '../Modal';
import { createLicense } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface AddLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddLicenseModal({ isOpen, onClose, onSuccess }: AddLicenseModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licenseForm, setLicenseForm] = useState({
    code: "",
    name: "",
    description: "",
    terms: "General creative commons under Crack Origins studio rules.",
  });

  const handleAddLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!licenseForm.code || !licenseForm.name || !licenseForm.description) {
      showToast("Please fill the core license details.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createLicense(user.uid, licenseForm);
      if (result.success) {
        showToast("License generated and saved in the vault.", "success");
        setLicenseForm({
          code: "", name: "", description: "", terms: "General creative commons under Crack Origins studio rules."
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(result.error || "Failed to generate license.", "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Chronicle License">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary)', borderRadius: '8px', fontSize: '0.75rem', opacity: 0.9 }}>
          <ShieldCheck size={16} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
          You are creating an official <strong>Crack Origins</strong> license. This certificate allows users to legally use studio-verified lore and ideas in their own chronicles.
        </div>

        <form onSubmit={handleAddLicense} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={12} /> License Code
            </label>
            <input 
              type="text" 
              placeholder="e.g. CO-LORE-2026-001" 
              className={styles.adminInput} 
              value={licenseForm.code} 
              onChange={e => setLicenseForm({ ...licenseForm, code: e.target.value.toUpperCase() })} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Type size={12} /> License Name (Holder/Project)
            </label>
            <input 
              type="text" 
              placeholder="e.g. Cyber-Chronicles Rights" 
              className={styles.adminInput} 
              value={licenseForm.name} 
              onChange={e => setLicenseForm({ ...licenseForm, name: e.target.value })} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={12} /> Detailed Description
            </label>
            <textarea 
              placeholder="Outline what this license covers..." 
              className={styles.adminInput} 
              style={{ minHeight: '120px', padding: '12px' }}
              value={licenseForm.description} 
              onChange={e => setLicenseForm({ ...licenseForm, description: e.target.value })} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Legal Terms & Limitations
            </label>
            <textarea 
              placeholder="Specify the legal constraints and usage rights..." 
              className={styles.adminInput} 
              style={{ minHeight: '80px', padding: '12px' }}
              value={licenseForm.terms} 
              onChange={e => setLicenseForm({ ...licenseForm, terms: e.target.value })} 
            />
          </div>

          <button type="submit" className="btnSolid" disabled={isSubmitting} style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', gap: '0.6rem' }}>
            {isSubmitting ? "Generating Certificate..." : <><BadgeCheck size={18} /> Seal License & Save to DB</>}
          </button>
        </form>
      </div>
    </Modal>
  );
}
