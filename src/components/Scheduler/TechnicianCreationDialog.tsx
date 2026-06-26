import React from 'react';
import { SUILayoutModal, SUICoreInput, SUICoreSelect, SUICoreButton } from '@/components/sui';
import type { Resource } from './types';

const ROLES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'ROOFING', 'PAINTING', 'CLEANING', 'UNASSIGNED'];

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface TechnicianCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resource: Resource) => void;
}

export const TechnicianCreationDialog: React.FC<TechnicianCreationDialogProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('UNASSIGNED');

  const reset = () => {
    setName('');
    setRole('UNASSIGNED');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const trimmed = name.trim();
    onSave({
      id: `resource-${Date.now()}`,
      name: trimmed,
      avatar: initials(trimmed),
      metadata: { role, jobsCount: 0 },
    });
    reset();
  };

  return (
    <SUILayoutModal
      open={isOpen}
      onClose={handleClose}
      size="sm"
      title="Add Technician"
      footer={
        <>
          <SUICoreButton variant="outline" text="Cancel" onClick={handleClose} />
          <SUICoreButton variant="primary" text="Add Technician" disabled={!canSave} onClick={handleSave} />
        </>
      }
    >
      <div className="space-y-4">
        <SUICoreInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Lee"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <SUICoreSelect
          label="Role"
          value={role}
          onChange={setRole}
          options={ROLES.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))}
        />
      </div>
    </SUILayoutModal>
  );
};
