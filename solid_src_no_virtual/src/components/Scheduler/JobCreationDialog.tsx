import { Show, type Component } from 'solid-js';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import type { Resource, NewEventData } from './types';

interface JobCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newEventData: NewEventData | null;
  onChange: (data: NewEventData) => void;
  onSave: () => void;
  resources: Resource[];
}

export const JobCreationDialog: Component<JobCreationDialogProps> = (props) => {
  const formatTimeRange = () => {
    const data = props.newEventData;
    if (!data) return '';
    return `${data.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${data.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusOptions = ["New", "Ongoing", "Completed", "Cancelled"];

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <Show when={props.newEventData}>
        <DialogContent class="bg-card text-card-foreground border-border p-6 w-[400px] max-w-full rounded-xl select-none">
          <DialogHeader>
            <DialogTitle class="text-base font-bold text-text-primary mb-2">Create New Job</DialogTitle>
          </DialogHeader>

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Job Title
              </label>
              <Input
                type="text"
                class="w-full bg-background border-border"
                value={props.newEventData!.title}
                onInput={(e) => props.onChange({ ...props.newEventData!, title: e.currentTarget.value })}
                placeholder="e.g. Pipe Burst"
                autofocus
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Location / Address
              </label>
              <Input
                type="text"
                class="w-full bg-background border-border"
                value={props.newEventData!.location}
                onInput={(e) => props.onChange({ ...props.newEventData!, location: e.currentTarget.value })}
                placeholder="e.g. Faulkner Street"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Price ($)
                </label>
                <Input
                  type="number"
                  class="w-full bg-background border-border"
                  value={props.newEventData!.price}
                  onInput={(e) => props.onChange({ ...props.newEventData!, price: Number(e.currentTarget.value) })}
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Status
                </label>
                {/* FIXED: Data-Driven Kobalte Select */}
                <Select<string>
                  value={props.newEventData!.status}
                  options={statusOptions}
                  onChange={(val) => val && props.onChange({ ...props.newEventData!, status: val as NewEventData['status'] })}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {itemProps.item.rawValue}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full bg-background border-border">
                    <SelectValue<string>>
                      {(state) => state.selectedOption() || "Select status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent class="bg-card border-border" />
                </Select>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                Technician
              </label>
              {/* FIXED: Data-Driven Kobalte Select for complex objects */}
              <Select<Resource>
                value={props.resources.find(r => r.id === props.newEventData!.resourceId) || null}
                options={props.resources}
                optionValue="id"
                optionTextValue="name"
                onChange={(resource) => resource && props.onChange({ ...props.newEventData!, resourceId: resource.id })}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue.name}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full bg-background border-border">
                  <SelectValue<Resource>>
                    {(state) => state.selectedOption()?.name || "Select technician"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent class="bg-card border-border" />
              </Select>
            </div>

            <div class="bg-muted/30 rounded-lg p-3 text-xs text-text-secondary space-y-1 mt-3">
              <div>
                <strong>Time Selection:</strong> {formatTimeRange()}
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={props.onClose}
              class="px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted text-text-secondary transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={props.onSave}
              class="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-colors"
            >
              Save Job
            </Button>
          </div>
        </DialogContent>
      </Show>
    </Dialog>
  );
};
