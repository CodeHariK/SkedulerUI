import React from 'react';
import type { Resource } from './types';
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

interface JobCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newEventData: {
    resourceId: string;
    startTime: Date;
    endTime: Date;
    title: string;
    location: string;
    price: number;
    status: 'Ongoing' | 'New' | 'Completed' | 'Cancelled';
  } | null;
  onChange: (data: any) => void;
  onSave: () => void;
  resources: Resource[];
}

export const JobCreationDialog: React.FC<JobCreationDialogProps> = ({
  isOpen,
  onClose,
  newEventData,
  onChange,
  onSave,
  resources,
}) => {
  if (!newEventData) return null;

  const formatTimeRange = () => {
    return `${newEventData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${newEventData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card text-card-foreground border-border p-6 w-[400px] max-w-full rounded-xl select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-text-primary mb-2">Create New Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Job Title
            </label>
            <Input
              type="text"
              className="w-full bg-background border-border"
              value={newEventData.title}
              onChange={(e) => onChange({ ...newEventData, title: e.target.value })}
              placeholder="e.g. Pipe Burst"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Location / Address
            </label>
            <Input
              type="text"
              className="w-full bg-background border-border"
              value={newEventData.location}
              onChange={(e) => onChange({ ...newEventData, location: e.target.value })}
              placeholder="e.g. Faulkner Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Price ($)
              </label>
              <Input
                type="number"
                className="w-full bg-background border-border"
                value={newEventData.price}
                onChange={(e) => onChange({ ...newEventData, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Status
              </label>
              <Select
                value={newEventData.status}
                onValueChange={(val) => onChange({ ...newEventData, status: val })}
              >
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Ongoing">Ongoing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
              Technician
            </label>
            <Select
              value={newEventData.resourceId}
              onValueChange={(val) => onChange({ ...newEventData, resourceId: val })}
            >
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs text-text-secondary space-y-1 mt-3">
            <div>
              <strong>Time Selection:</strong> {formatTimeRange()}
            </div>
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
            onClick={onSave}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-colors"
          >
            Save Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
