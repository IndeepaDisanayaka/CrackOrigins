'use client';
import React, { useState } from 'react';
import { AlignLeft, FileText, Globe, Briefcase, Mail, User, Info, Target, Hash, MapPin } from 'lucide-react';
import Modal from '../Modal';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import GlitchLoading from '../ui/GlitchLoading';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Card from '../ui/Card';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole?: string;
}

export default function ApplyModal({ isOpen, onClose, selectedRole = '' }: ApplyModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    role: selectedRole,
    email: '',
    socialUrl: '',
    about: '',
    whyApplying: '',
    age: '',
    country: '',
    experience: '',
    canMakeLowpoly: false,
    tools: [] as string[],
    whyApplyingThis: '',
    agreed: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toolOptions = ['Blender', 'Unity', 'Unreal', 'Maya', 'Adobe'];
  const showSpecifics = formData.role === 'Game Developer' || formData.role === '3D Artist';

  const getWordCount = (str: string) => str.trim() ? str.trim().split(/\s+/).length : 0;

  React.useEffect(() => {
    if (selectedRole) {
      setFormData(prev => ({ ...prev, role: selectedRole }));
    }
  }, [selectedRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleToolToggle = (tool: string) => {
    setFormData(prev => {
      const newTools = prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool];
      return { ...prev, tools: newTools };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      setErrorMsg('You must agree to the final agreement.');
      return;
    }
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 25) {
      setErrorMsg('Age must be between 18 and 25.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          fullName: '', role: selectedRole, email: '', socialUrl: '', about: '',
          whyApplying: '', age: '', country: '', experience: '', canMakeLowpoly: false,
          tools: [], whyApplyingThis: '', agreed: false
        });
      }, 2500);
    } catch (err) {
      setErrorMsg('An error occurred while submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apply for ${formData.role || 'Role'}`} maxWidth="600px">
      {success ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Application Submitted!</h3>
          <p>Thank you for applying. We will get in touch with you soon.</p>
        </div>
      ) : isSubmitting ? (
        <GlitchLoading text="SUBMITTING..." />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input required icon={<User size={14} />} label="Full Name" type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
            <Input required icon={<Mail size={14} />} label="Email" type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input required icon={<Hash size={14} />} label="Age (18 - 25)" type="number" min="18" max="25" name="age" value={formData.age} onChange={handleChange} />
            <Input required icon={<MapPin size={14} />} label="Country" type="text" name="country" value={formData.country} onChange={handleChange} />
          </div>

          <Select 
            icon={<Briefcase size={14} />}            name="role" 
            value={formData.role} 
            onChange={handleChange} 
            label="Applying Role"
            options={[
              { value: 'Game Developer', label: 'Game Developer' },
              { value: 'UI/UX Designer', label: 'UI/UX Designer' },
              { value: 'Community Manager', label: 'Community Manager' },
              { value: '3D Artist', label: '3D Artist' }
            ]}
          />

          <Input icon={<Globe size={14} />} label="LinkedIn or Social URL" type="url" name="socialUrl" value={formData.socialUrl} onChange={handleChange} placeholder="https://..." />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Input 
              required 
              as="textarea" 
              icon={<AlignLeft size={14} />} 
              label="About Yourself" 
              name="about" 
              value={formData.about} 
              onChange={handleChange} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(formData.about)} words</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Input 
              required 
              as="textarea" 
              icon={<FileText size={14} />} 
              label="Experience" 
              name="experience" 
              value={formData.experience} 
              onChange={handleChange} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(formData.experience)} words</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <Input 
              required 
              as="textarea" 
              icon={<Info size={14} />} 
              label="Why are you applying to us?" 
              name="whyApplying" 
              value={formData.whyApplying} 
              onChange={handleChange} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(formData.whyApplying)} words</span>
            </div>
          </div>

          {showSpecifics && (
            <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0, color: 'var(--accent)' }}>Role Specific Questions</h4>
              
              <Checkbox 
                checked={formData.canMakeLowpoly}
                onChange={(checked) => handleCheckboxChange('canMakeLowpoly', checked)}
                label="CAN YOU MAKE LOWPOLY MODELS?"
                description="Required for specific art directions"
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, marginBottom: '0.5rem' }}>Tools Proficiency</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {toolOptions.map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleToolToggle(tool)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        border: `1px solid ${formData.tools.includes(tool) ? 'var(--primary)' : 'var(--outline-color)'}`,
                        background: formData.tools.includes(tool) ? 'var(--primary)' : 'transparent',
                        color: formData.tools.includes(tool) ? '#000' : 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Input 
                  required 
                  as="textarea" 
                  icon={<Target size={14} />} 
                  label="Why are you applying for this specific role?" 
                  name="whyApplyingThis" 
                  value={formData.whyApplyingThis} 
                  onChange={handleChange} 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(formData.whyApplyingThis)} words</span>
                </div>
              </div>
            </Card>
          )}

          <div style={{ marginTop: '0.5rem' }}>
            <Checkbox 
              checked={formData.agreed}
              onChange={(checked) => handleCheckboxChange('agreed', checked)}
              label="FINAL AGREEMENT"
              description="You are working with us part-time. You will receive your money at the end of the project you supported us. It will be divided equally among all team members. Do you agree to that?"
              activeColor="#FEB60C" // using generic accent/primary
            />
          </div>

          {errorMsg && <p style={{ color: '#ff4444', fontSize: '0.9rem' }}>{errorMsg}</p>}

          <Button 
            type="submit" 
            disabled={isSubmitting}
            variant="solid"
            style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
          >
            Apply Now
          </Button>
        </form>
      )}
    </Modal>
  );
}
