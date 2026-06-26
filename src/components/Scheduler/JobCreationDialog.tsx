import React from 'react';
import { SUILayoutModal, SUICoreInput, SUICoreSelect, SUICoreButton, SUICoreBodyText } from '@/components/sui';
import type { Resource, NewEventData } from './types';

interface JobCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newEventData: NewEventData | null;
  onChange: (data: NewEventData) => void;
  onSave: () => void;
  resources: Resource[];
}

const STATUS_OPTIONS: { value: NewEventData['status']; label: string }[] = [
  { value: 'New', label: 'New' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const JobCreationDialog: React.FC<JobCreationDialogProps> = ({
  isOpen,
  onClose,
  newEventData,
  onChange,
  onSave,
  resources,
}) => {
  if (!newEventData) return null;

  const formatTimeRange = () =>
    `${newEventData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${newEventData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <SUILayoutModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="Create New Job"
      footer={
        <>
          <SUICoreButton variant="outline" text="Cancel" onClick={onClose} />
          <SUICoreButton variant="primary" text="Save Job" onClick={onSave} />
        </>
      }
    >
      <div className="space-y-4">
        <SUICoreInput
          label="Job Title"
          value={newEventData.title}
          onChange={(e) => onChange({ ...newEventData, title: e.target.value })}
          placeholder="e.g. Pipe Burst"
          autoFocus
        />

        <SUICoreInput
          label="Location / Address"
          value={newEventData.location}
          onChange={(e) => onChange({ ...newEventData, location: e.target.value })}
          placeholder="e.g. Faulkner Street"
        />

        <div className="grid grid-cols-2 gap-4">
          <SUICoreInput
            label="Price ($)"
            type="number"
            value={String(newEventData.price)}
            onChange={(e) => onChange({ ...newEventData, price: Number(e.target.value) })}
          />
          <SUICoreSelect
            label="Status"
            value={newEventData.status}
            onChange={(v) => onChange({ ...newEventData, status: v as NewEventData['status'] })}
            options={STATUS_OPTIONS}
          />
        </div>

        <SUICoreSelect
          label="Technician"
          placeholder="Select technician"
          value={newEventData.resourceId}
          onChange={(v) => onChange({ ...newEventData, resourceId: v })}
          options={resources.map((r) => ({ value: r.id, label: r.name }))}
        />

        <div className="bg-neutral-100 rounded-lg p-3">
          <SUICoreBodyText size="xs" tone="secondary">
            Time Selection: {formatTimeRange()}
          </SUICoreBodyText>
        </div>
      </div>
    </SUILayoutModal>
  );
};
