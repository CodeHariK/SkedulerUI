import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  // Reset the form whenever the dialog closes.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
      setRole('UNASSIGNED');
      onClose();
    }
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
    setName('');
    setRole('UNASSIGNED');
  };

  // The role dropdown is rendered in a portal outside the dialog, so clicking it
  // looks like an "outside" interaction and would otherwise dismiss the dialog.
  const keepDialogOpenForSelect = (e: { detail: { originalEvent: Event }; preventDefault: () => void }) => {
    const target = e.detail.originalEvent.target as Element | null;
    if (target?.closest('[data-slot="select-content"]')) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-card text-card-foreground border-border p-6 w-[400px] max-w-full rounded-xl select-none"
        onPointerDownOutside={keepDialogOpenForSelect}
        onInteractOutside={keepDialogOpenForSelect}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-text-primary mb-2">Add Technician</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Name
            </label>
            <Input
              type="text"
              className="w-full bg-background border-border"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted text-text-secondary transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-colors"
          >
            Add Technician
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
