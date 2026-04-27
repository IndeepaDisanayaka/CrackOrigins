'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { Shield, Plus, Trash2, X } from 'lucide-react';
import { getAccountRules, upsertAccountRule, deleteAccountRule } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import CheckCircle from '../CheckCircle';

interface RolesModalProps {
    isOpen: boolean;
    onClose: () => void;
    adminUid: string;
}

const COLLECTIONS = ['account', 'payments', 'games', 'offers', 'blogs', 'coupons'];
const ACTIONS = ['READ', 'WRITE', 'UPDATE', 'DELETE'];

export default function RolesModal({ isOpen, onClose, adminUid }: RolesModalProps) {
    const { showToast } = useToast();
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: string }>({ open: false, id: "" });

    const fetchRules = async () => {
        setLoading(true);
        const res = await getAccountRules(adminUid);
        if (res.success) {
            setRules(res.rules || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) fetchRules();
    }, [isOpen]);

    const handleSave = async () => {
        if (!editingRule.title) return showToast("Title is required", "error");
        setIsSaving(true);
        const res = await upsertAccountRule(adminUid, editingRule);
        if (res.success) {
            showToast("Rule saved successfully", "success");
            setEditingRule(null);
            fetchRules();
        } else {
            showToast(res.error || "Failed to save rule", "error");
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        const id = deleteConfirm.id;
        if (!id) return;
        const res = await deleteAccountRule(adminUid, id);
        if (res.success) {
            showToast("Rule deleted", "success");
            setDeleteConfirm({ open: false, id: "" });
            fetchRules();
        } else {
            showToast(res.error || "Failed to delete", "error");
        }
    };

    const togglePermission = (collection: string, action: string) => {
        const currentRules = editingRule.rules || {};
        const currentPerms = currentRules[collection] || [];
        
        let newPerms;
        if (currentPerms.includes(action)) {
            newPerms = currentPerms.filter((a: string) => a !== action);
        } else {
            newPerms = [...currentPerms, action];
        }

        setEditingRule({
            ...editingRule,
            rules: {
                ...currentRules,
                [collection]: newPerms
            }
        });
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="800px">
            <div style={{ padding: '2rem', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Shield size={24} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>MANAGE ACCESS RULES</h2>
                    </div>
                    {!editingRule && (
                        <button 
                            className="btnSolid" 
                            onClick={() => setEditingRule({ title: '', description: '', rules: {} })}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            <Plus size={18} /> Create New Rule
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Loading rules...</div>
                ) : editingRule ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem' }}>RULE TITLE</label>
                                <input 
                                    type="text" 
                                    value={editingRule.title} 
                                    onChange={e => setEditingRule({...editingRule, title: e.target.value})}
                                    style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--outline-color)', borderRadius: '8px', color: 'var(--foreground)' }}
                                    placeholder="e.g. Moderator, Support Agent"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem' }}>DESCRIPTION</label>
                                <input 
                                    type="text" 
                                    value={editingRule.description} 
                                    onChange={e => setEditingRule({...editingRule, description: e.target.value})}
                                    style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--outline-color)', borderRadius: '8px', color: 'var(--foreground)' }}
                                    placeholder="Short description of this role"
                                />
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--outline-color)', borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '1rem' }}>Collection</th>
                                        {ACTIONS.map(action => <th key={action} style={{ padding: '1rem' }}>{action}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {COLLECTIONS.map(col => (
                                        <tr key={col} style={{ borderBottom: '1px solid var(--outline-color)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 700, textTransform: 'capitalize' }}>{col}</td>
                                            {ACTIONS.map(action => (
                                                <td key={action} style={{ textAlign: 'center', padding: '1rem' }}>
                                                    <CheckCircle 
                                                        checked={editingRule.rules[col]?.includes(action)} 
                                                        onChange={() => togglePermission(col, action)}
                                                        size={20}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btnOutline" onClick={() => setEditingRule(null)}>Cancel</button>
                            <button className="btnSolid" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Access Rule"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {rules.map(rule => (
                            <div key={rule.id} style={{ padding: '1.5rem', border: '1px solid var(--outline-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>{rule.title}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => setEditingRule(rule)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Plus size={16} /></button>
                                        <button onClick={() => setDeleteConfirm({ open: true, id: rule.id })} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1rem' }}>{rule.description || "No description"}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {Object.keys(rule.rules).map(col => (
                                        <span key={col} style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--outline-color)' }}>
                                            {col}: {rule.rules[col].length}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {rules.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No rules created yet.</div>}
                    </div>
                )}
            </div>
        </Modal>

        <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: "" })} maxWidth="400px">
            <div style={{ padding: '1.5rem', background: 'var(--background)', color: 'var(--foreground)', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 77, 77, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Trash2 size={30} color="#ff4d4d" />
                </div>
                <h3 style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Delete Rule?</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem' }}>
                    Are you sure you want to delete this access rule? Users assigned to this rule will lose their administrative permissions.
                </p>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button className="btnOutline" style={{ width: '100%', padding: '0.6rem' }} onClick={() => setDeleteConfirm({ open: false, id: "" })}>Cancel</button>
                    <button 
                        className="btnSolid" 
                        style={{ width: '100%', padding: '0.6rem', background: '#ff4d4d', color: '#fff', border: 'none' }} 
                        onClick={handleDelete}
                    >
                        Delete Rule
                    </button>
                </div>
            </div>
        </Modal>
        </>
    );
}
