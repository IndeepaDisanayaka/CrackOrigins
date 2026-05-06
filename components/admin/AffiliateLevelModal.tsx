'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit3, Save, X, Info, TrendingUp, DollarSign, Clock } from 'lucide-react';
import Modal from '../Modal';
import { getRewardLevels, saveRewardLevel, deleteRewardLevel } from '@/lib/admin-actions';

import { useToast } from '../Toast';
import styles from '../../app/page.module.css';

interface AffiliateLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUid: string;
}

export default function AffiliateLevelModal({ isOpen, onClose, adminUid }: AffiliateLevelModalProps) {
  const { showToast } = useToast();
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    onetime_reward_xp: 0,
    payment_commision: 0,
    min_xp: 0,
    max_xp: 100,
  });


  const fetchLevels = async () => {
    setLoading(true);
    const res = await getRewardLevels();
    if (Array.isArray(res)) {
      setLevels(res);
    } else {
      showToast("Failed to load levels.", "error");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLevels();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await saveRewardLevel(adminUid, { ...form, id: editingId });

    if (res.success) {
      showToast("Level saved successfully!", "success");
      setEditingId(null);
      setForm({ title: '', description: '', onetime_reward_xp: 0, payment_commision: 0, min_xp: 0, max_xp: 100 });
      fetchLevels();

    } else {
      showToast(res.error || "Failed to save level.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this level?")) return;
    const res = await deleteRewardLevel(adminUid, id);

    if (res.success) {
      showToast("Level deleted.", "success");
      fetchLevels();
    } else {
      showToast(res.error || "Failed to delete level.", "error");
    }
  };

  const startEdit = (level: any) => {
    setEditingId(level.id);
    setForm({
      title: level.title || '',
      description: level.description || '',
      onetime_reward_xp: level.onetime_reward_xp || 0,
      payment_commision: level.payment_commision || 0,
      min_xp: level.min_xp || 0,
      max_xp: level.max_xp || 0,
    });

  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reward Level System (XP)" maxWidth="800px">

      <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Form Section */}
        <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
            {editingId ? 'Edit Level' : 'Create New Level'}
          </h3>
          
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>Level Title (e.g. starter, grower, cracker)</label>
              <input 
                type="text" 
                className={styles.adminInput} 
                value={form.title || ''} 
                onChange={e => setForm({...form, title: e.target.value.toLowerCase()})} 
                placeholder="starter"
                required
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>One-time Reward (XP)</label>
              <input 
                type="number" 
                className={styles.adminInput} 
                value={form.onetime_reward_xp ?? 0} 
                onChange={e => setForm({...form, onetime_reward_xp: Number(e.target.value)})} 
                placeholder="50"
              />
            </div>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>Payment Commission (%)</label>
              <input 
                type="number" 
                className={styles.adminInput} 
                value={form.payment_commision ?? 0} 
                onChange={e => setForm({...form, payment_commision: Number(e.target.value)})} 
                placeholder="2"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>XP Range (Min - Max)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  className={styles.adminInput} 
                  value={form.min_xp ?? 0} 
                  onChange={e => setForm({...form, min_xp: Number(e.target.value)})} 
                  placeholder="0"
                />
                <input 
                  type="number" 
                  className={styles.adminInput} 
                  value={form.max_xp ?? 0} 
                  onChange={e => setForm({...form, max_xp: Number(e.target.value)})} 
                  placeholder="100"
                />
              </div>
            </div>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>Description</label>
              <textarea 
                className={styles.adminInput} 
                value={form.description || ''} 
                onChange={e => setForm({...form, description: e.target.value})} 
                placeholder="Description of this level..."
                rows={2}
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btnSolid" style={{ flex: 2 }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingId ? 'Update Level' : 'Create Level')}
              </button>
              {editingId && (
                <button type="button" className="btnOutline" style={{ flex: 1 }} onClick={() => {
                  setEditingId(null);
                  setForm({ title: '', description: '', onetime_reward_xp: 0, payment_commision: 0, min_xp: 0, max_xp: 100 });
                }}>

                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Section */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={18} />
            Existing Levels
          </h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading levels...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {levels.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem', border: '1px dashed var(--outline-color)' }}>
                  No affiliate levels configured yet.
                </div>
              ) : (
                levels.map((level) => (
                  <div key={level.id} style={{ 
                    border: '1px solid var(--outline-color)', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: level.id === editingId ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent'
                  }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '8px', 
                        background: 'var(--primary)', color: '#000', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase'
                      }}>
                        {level.title.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>{level.title}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{level.description}</div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <TrendingUp size={10} /> {level.min_xp} - {level.max_xp} XP
                          </span>

                          <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <DollarSign size={10} /> {level.onetime_reward_xp} XP Reward
                          </span>

                          <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Info size={10} /> {level.payment_commision}% Comm.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btnOutline" style={{ padding: '0.4rem' }} onClick={() => startEdit(level)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btnOutline" style={{ padding: '0.4rem', color: '#ff4d4d', borderColor: '#ff4d4d' }} onClick={() => handleDelete(level.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
