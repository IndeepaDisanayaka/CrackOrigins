'use client';

import React, { useState } from 'react';
import { Hash, Tag, Percent, Calendar, Plus, Trophy, Gift } from 'lucide-react';
import Modal from '../Modal';
import { createOffer, updateOffer } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import GlitchLoading from '../ui/GlitchLoading';
import Button from '../ui/Button';

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
    image: "",
    isGiveaway: false,
    targetXP: "10",
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
        image: editData.image || "",
        isGiveaway: editData.isGiveaway ?? false,
        targetXP: editData.targetXP?.toString() || editData.targetAffiliates?.toString() || "10",
        offerScope: editData.offerScope || "local",
      });

    } else if (isOpen && !editData) {
      setOfferForm({
        id: "", title: "", originalPrice: "", discount: "", expire: "", quantity: 1, 
        operatingSystem: "windows", platform: "steam", gameUrl: "", image: "",
        isGiveaway: false, targetXP: "10", offerScope: "local"
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
        targetXP: Number(offerForm.targetXP),
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
        {isGenerating ? (
          <GlitchLoading text="PROCESSING..." />
        ) : (
          <form onSubmit={handleAddOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <Checkbox 
              checked={offerForm.isGiveaway}
              onChange={(c) => setOfferForm({ ...offerForm, isGiveaway: c })}
              label="LIST AS GIVEAWAY"
              description="Requires XP investment to claim"
              icon={<Gift size={20} />}
            />

            {offerForm.isGiveaway && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Checkbox 
                  checked={offerForm.offerScope === 'local'}
                  onChange={() => setOfferForm({ ...offerForm, offerScope: 'local' })}
                  label="LOCAL OFFER"
                  description="Normal Listing"
                  className="flex-1"
                />
                
                <Checkbox 
                  checked={offerForm.offerScope === 'global'}
                  onChange={() => setOfferForm({ ...offerForm, offerScope: 'global' })}
                  label="GLOBAL OFFER"
                  description="Panic Yellow Design"
                  className="flex-1"
                  style={{ background: offerForm.offerScope === 'global' ? 'rgba(254, 182, 12, 0.1)' : 'transparent' }}
                />
              </div>
            )}

            <Input 
              icon={<Hash size={12} />} 
              label="Steam App ID" 
              type="text" 
              placeholder="e.g. 1245620" 
              value={offerForm.id} 
              onChange={e => setOfferForm({ ...offerForm, id: e.target.value })} 
              disabled={!!editData} 
            />

            <Input 
              icon={<Tag size={12} />} 
              label="Game Title" 
              type="text" 
              placeholder="e.g. Elden Ring" 
              value={offerForm.title} 
              onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} 
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                icon={<Tag size={12} />} 
                label="Value (Original Price)" 
                type="number" 
                placeholder="e.g. 59.99" 
                value={offerForm.originalPrice} 
                onChange={e => setOfferForm({ ...offerForm, originalPrice: e.target.value })} 
                containerStyle={{ flex: 1 }}
              />
              {!offerForm.isGiveaway && (
                <Input 
                  icon={<Percent size={12} />} 
                  label="Discount %" 
                  type="number" 
                  placeholder="e.g. 10" 
                  value={offerForm.discount} 
                  onChange={e => setOfferForm({ ...offerForm, discount: e.target.value })} 
                  containerStyle={{ flex: 1 }}
                />
              )}
              {offerForm.isGiveaway && (
                <Input 
                  icon={<Trophy size={12} />} 
                  label="Target XP" 
                  type="number" 
                  placeholder="50" 
                  value={offerForm.targetXP} 
                  onChange={e => setOfferForm({ ...offerForm, targetXP: e.target.value })} 
                  containerStyle={{ flex: 1 }}
                />
              )}
            </div>
            
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
              Status: {offerForm.isGiveaway ? "FREE GIVEAWAY" : `PRICE $${getFinalOfferPrice()}`}
            </div>

            <Input 
              icon={<Tag size={12} />} 
              label="Steam Store URL" 
              type="url" 
              placeholder="https://store.steampowered.com/app/..." 
              value={offerForm.gameUrl} 
              onChange={e => setOfferForm({ ...offerForm, gameUrl: e.target.value })} 
            />

            <Input 
              icon={<Tag size={12} />} 
              label="Custom Image URL (Optional)" 
              type="url" 
              placeholder="https://example.com/image.jpg" 
              value={offerForm.image} 
              onChange={e => setOfferForm({ ...offerForm, image: e.target.value })} 
              description="Leave empty to use Steam header image"
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                icon={<Tag size={12} />} 
                label="OS" 
                type="text" 
                placeholder="windows" 
                value={offerForm.operatingSystem} 
                onChange={e => setOfferForm({ ...offerForm, operatingSystem: e.target.value })} 
                containerStyle={{ flex: 1 }}
              />
              <Input 
                icon={<Hash size={12} />} 
                label="Quantity" 
                type="number" 
                placeholder="1" 
                value={offerForm.quantity} 
                onChange={e => setOfferForm({ ...offerForm, quantity: parseInt(e.target.value || "0") })} 
                containerStyle={{ flex: 1 }}
              />
            </div>

            <Input 
              icon={<Calendar size={12} />} 
              label="Expiration Date" 
              type="date" 
              value={offerForm.expire} 
              onChange={e => setOfferForm({ ...offerForm, expire: e.target.value })} 
            />

            <Button type="submit" variant="solid" style={{ marginTop: '0.5rem', width: '100%', padding: '1rem', gap: '0.5rem' }}>
              {editData ? "Save Changes" : <><Plus size={16} /> Add Offer</>}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
