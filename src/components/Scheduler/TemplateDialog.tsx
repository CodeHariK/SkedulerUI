import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, Clock, Users, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Resource, SchedulerTemplate } from './types';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SchedulerTemplate[];
  activeTemplateId: string;
  allResources: Resource[];
  onApply: (id: string) => void;
  onSave: (template: SchedulerTemplate) => void;
  onDelete: (id: string) => void;
}

type Tab = 'time' | 'technicians' | 'more';

const SNAP_OPTIONS = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

const formatHour = (h: number) => {
  if (h === 24) return '12 AM (next day)';
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
};

const templateSummary = (t: SchedulerTemplate, total: number) => {
  const time = `${formatHour(t.dayStartHour)} – ${formatHour(t.dayEndHour)}`;
  const techs = t.visibleResourceIds === null
    ? 'All technicians'
    : `${t.visibleResourceIds.length} of ${total} technicians`;
  return `${time} · ${techs}`;
};

export const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open, onOpenChange, templates, activeTemplateId, allResources, onApply, onSave, onDelete,
}) => {
  const [view, setView] = React.useState<'list' | 'editor'>('list');
  const [tab, setTab] = React.useState<Tab>('time');

  // Editor draft state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [startHour, setStartHour] = React.useState(6);
  const [endHour, setEndHour] = React.useState(20);
  const [snapMinutes, setSnapMinutes] = React.useState(15);
  const [allMode, setAllMode] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Reset back to the list view on close, so the next open starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) setView('list');
    onOpenChange(next);
  };

  const openEditor = (template?: SchedulerTemplate) => {
    if (template) {
      setEditingId(template.id);
      setName(template.name);
      setStartHour(template.dayStartHour);
      setEndHour(template.dayEndHour);
      setSnapMinutes(template.snapMinutes);
      setAllMode(template.visibleResourceIds === null);
      setSelectedIds(template.visibleResourceIds ?? allResources.map(r => r.id));
    } else {
      setEditingId(null);
      setName('');
      setStartHour(6);
      setEndHour(20);
      setSnapMinutes(15);
      setAllMode(true);
      setSelectedIds(allResources.map(r => r.id));
    }
    setTab('time');
    setView('editor');
  };

  const toggleTechnician = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Clicking a row: built-in templates can only be applied; custom ones open
  // the editor (which is where delete now lives).
  const handleRowClick = (t: SchedulerTemplate) => {
    if (t.isBuiltIn) onApply(t.id);
    else openEditor(t);
  };

  const handleDelete = () => {
    if (editingId) {
      onDelete(editingId);
      setView('list');
    }
  };

  const nameTrimmed = name.trim();
  const timeValid = endHour > startHour;
  const techValid = allMode || selectedIds.length > 0;
  const canSave = nameTrimmed.length > 0 && timeValid && techValid;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: editingId ?? `tpl-${Date.now()}`,
      name: nameTrimmed,
      dayStartHour: startHour,
      dayEndHour: endHour,
      snapMinutes,
      visibleResourceIds: allMode ? null : selectedIds,
    });
    // onSave also marks the template active; close so the change is visible.
    handleOpenChange(false);
  };

  const startOptions = Array.from({ length: 24 }, (_, i) => i); // 0..23
  const endOptions = Array.from({ length: 24 }, (_, i) => i + 1).filter(h => h > startHour); // start+1..24

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'time', label: 'Time', icon: <Clock className="size-4" /> },
    { id: 'technicians', label: 'Technicians', icon: <Users className="size-4" /> },
    { id: 'more', label: 'More', icon: <Sparkles className="size-4" /> },
  ];

  // The Time-tab dropdowns are portaled outside the dialog; keep the dialog open
  // when an open select is what's being clicked.
  const keepDialogOpenForSelect = (e: { detail: { originalEvent: Event }; preventDefault: () => void }) => {
    const target = e.detail.originalEvent.target as Element | null;
    if (target?.closest('[data-slot="select-content"]')) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-card text-card-foreground border-border p-0 w-[520px] max-w-full rounded-xl select-none overflow-hidden"
        onPointerDownOutside={keepDialogOpenForSelect}
        onInteractOutside={keepDialogOpenForSelect}
      >
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold text-text-primary flex items-center gap-2">
            {view === 'editor' && (
              <button
                onClick={() => setView('list')}
                className="text-text-tertiary hover:text-text-primary transition-colors -ml-1"
                aria-label="Back to templates"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            {view === 'list' ? 'Templates' : editingId ? 'Edit Template' : 'New Template'}
          </DialogTitle>
        </DialogHeader>

        {view === 'list' ? (
          <div className="px-6 py-4">
            <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
              {templates.map((t) => {
                const isActive = t.id === activeTemplateId;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(t)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(t); }}
                    className={cn(
                      "w-full text-left flex items-center gap-2 rounded-lg border p-3 transition-colors cursor-pointer",
                      isActive ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-text-primary truncate">{t.name}</h4>
                        {isActive && (
                          <span className="text-[10px] uppercase tracking-wider text-primary border border-primary/40 rounded px-1.5 py-0.5">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{templateSummary(t, allResources.length)}</p>
                    </div>
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-7 px-3 text-xs shrink-0"
                        onClick={(e) => { e.stopPropagation(); onApply(t.id); }}
                      >
                        Apply
                      </Button>
                    )}
                    <ChevronRight className="size-4 text-text-tertiary shrink-0" />
                  </div>
                );
              })}
            </div>
            <Button className="w-full mt-4 rounded-full gap-1.5" onClick={() => openEditor()}>
              <Plus className="size-4" /> Create new template
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Name */}
            <div className="px-6 pt-4">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Template name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning shift – Electrical"
                className="mt-1.5 bg-background border-border"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 mt-4 border-b border-border">
              {tabs.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    tab === tb.id
                      ? "border-primary text-text-primary"
                      : "border-transparent text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {tb.icon} {tb.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-6 py-4 min-h-[220px]">
              {tab === 'time' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-text-secondary">Choose the time window shown on the timeline.</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-text-secondary">Start</label>
                      <Select value={String(startHour)} onValueChange={(v) => setStartHour(Number(v))}>
                        <SelectTrigger className="w-full bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-[260px]">
                          {startOptions.map(h => <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-text-secondary">End</label>
                      <Select value={String(endHour)} onValueChange={(v) => setEndHour(Number(v))}>
                        <SelectTrigger className="w-full bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-[260px]">
                          {endOptions.map(h => <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!timeValid && <p className="text-xs text-red-500">End time must be after the start time.</p>}

                  <div>
                    <label className="text-xs font-semibold text-text-secondary">Snap interval</label>
                    <Select value={String(snapMinutes)} onValueChange={(v) => setSnapMinutes(Number(v))}>
                      <SelectTrigger className="w-full bg-background border-border mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {SNAP_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-text-tertiary mt-1">Jobs snap to this grid when created, dragged, or resized.</p>
                  </div>
                </div>
              )}

              {tab === 'technicians' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-secondary">Which technicians appear in the sidebar and timeline.</p>
                    <button
                      onClick={() => setAllMode(v => !v)}
                      className={cn(
                        "text-xs font-medium rounded-full px-2.5 py-1 border transition-colors",
                        allMode ? "border-primary/40 text-primary bg-primary/5" : "border-border text-text-secondary hover:bg-muted/30"
                      )}
                    >
                      {allMode ? 'Showing all' : 'Custom selection'}
                    </button>
                  </div>
                  <div className={cn("flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1", allMode && "opacity-50 pointer-events-none")}>
                    {allResources.map((r) => {
                      const checked = allMode || selectedIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleTechnician(r.id)}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/30 text-left transition-colors"
                        >
                          <span className={cn(
                            "flex items-center justify-center size-4 rounded border shrink-0",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          )}>
                            {checked && <Check className="size-3" />}
                          </span>
                          <span className="text-sm text-text-primary truncate">{r.name}</span>
                          {r.metadata?.role && (
                            <span className="text-[10px] uppercase tracking-wider text-text-tertiary ml-auto shrink-0">{r.metadata.role}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!techValid && <p className="text-xs text-red-500">Select at least one technician.</p>}
                </div>
              )}

              {tab === 'more' && (
                <div className="flex flex-col items-center justify-center text-center h-[200px] gap-2">
                  <Sparkles className="size-6 text-text-tertiary" />
                  <p className="text-sm font-medium text-text-secondary">More settings coming soon</p>
                  <p className="text-xs text-text-tertiary">This tab is reserved for the next set of template options.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border">
              <div>
                {editingId && (
                  <Button
                    variant="ghost"
                    className="rounded-full gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="size-4" /> Delete template
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setView('list')}>Cancel</Button>
                {editingId && (
                  <Button variant="outline" className="rounded-full" onClick={() => onApply(editingId)}>
                    Apply
                  </Button>
                )}
                <Button className="rounded-full" disabled={!canSave} onClick={handleSave}>
                  {editingId ? 'Save & apply' : 'Create & apply'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
