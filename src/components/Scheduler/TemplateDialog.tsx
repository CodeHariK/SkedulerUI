import React from 'react';
import {
  SUILayoutModal,
  SUICoreButton,
  SUICoreInput,
  SUICoreSelect,
  SUICoreBodyText,
  SUICoreBadge,
  SUICoreIcon,
  SUICoreTabs,
  SUICoreTabsList,
  SUICoreTabsTrigger,
  SUICoreTabsContent,
  SUICoreCheckbox,
  SUICoreSwitch,
} from '@/components/sui';
import { cn } from '@/lib/cn';
import { DEFAULT_CARD_ROWS } from './constants';
import { CardLayoutEditor } from './CardLayoutEditor';
import type { Resource, SchedulerTemplate, CardFieldKey } from './types';

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

type Tab = 'time' | 'technicians' | 'card' | 'more';

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
  const techs =
    t.visibleResourceIds === null
      ? 'All technicians'
      : `${t.visibleResourceIds.length} of ${total} technicians`;
  return `${time} · ${techs}`;
};

export const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open, onOpenChange, templates, activeTemplateId, allResources, onApply, onSave, onDelete,
}) => {
  const [view, setView] = React.useState<'list' | 'editor'>('list');
  const [tab, setTab] = React.useState<Tab>('time');

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [startHour, setStartHour] = React.useState(6);
  const [endHour, setEndHour] = React.useState(20);
  const [snapMinutes, setSnapMinutes] = React.useState(15);
  const [themeDraft, setThemeDraft] = React.useState<'light' | 'dark'>('light');
  const [detailTriggerDraft, setDetailTriggerDraft] = React.useState<'hover' | 'click'>('hover');
  const [cardRowsDraft, setCardRowsDraft] = React.useState<CardFieldKey[][]>([]);
  const [allMode, setAllMode] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const handleClose = () => {
    setView('list');
    onOpenChange(false);
  };

  const openEditor = (template?: SchedulerTemplate) => {
    if (template) {
      setEditingId(template.id);
      setName(template.name);
      setStartHour(template.dayStartHour);
      setEndHour(template.dayEndHour);
      setSnapMinutes(template.snapMinutes);
      setThemeDraft(template.theme);
      setDetailTriggerDraft(template.detailTrigger);
      setCardRowsDraft(template.cardRows || DEFAULT_CARD_ROWS);
      setAllMode(template.visibleResourceIds === null);
      setSelectedIds(template.visibleResourceIds ?? allResources.map((r) => r.id));
    } else {
      setEditingId(null);
      setName('');
      setStartHour(6);
      setEndHour(20);
      setSnapMinutes(15);
      setThemeDraft('light');
      setDetailTriggerDraft('hover');
      setCardRowsDraft(DEFAULT_CARD_ROWS);
      setAllMode(true);
      setSelectedIds(allResources.map((r) => r.id));
    }
    setTab('time');
    setView('editor');
  };

  const toggleTechnician = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
      theme: themeDraft,
      detailTrigger: detailTriggerDraft,
      cardRows: cardRowsDraft,
      visibleResourceIds: allMode ? null : selectedIds,
    });
    handleClose();
  };

  const startOptions = Array.from({ length: 24 }, (_, i) => i); // 0..23
  const endOptions = Array.from({ length: 24 }, (_, i) => i + 1).filter((h) => h > startHour);

  const title = view === 'list' ? 'Templates' : editingId ? 'Edit Template' : 'New Template';

  const footer =
    view === 'editor' ? (
      <>
        {editingId && (
          <SUICoreButton variant="ghost" icon="trash2" text="Delete" className="text-danger-500 mr-auto" onClick={handleDelete} />
        )}
        <SUICoreButton variant="outline" text="Cancel" onClick={() => setView('list')} />
        {editingId && <SUICoreButton variant="secondary" text="Apply" onClick={() => onApply(editingId)} />}
        <SUICoreButton variant="primary" text={editingId ? 'Save & apply' : 'Create & apply'} disabled={!canSave} onClick={handleSave} />
      </>
    ) : undefined;

  return (
    <SUILayoutModal open={open} onClose={handleClose} size="lg" title={title} footer={footer}>
      {view === 'list' ? (
        <div className="flex flex-col">
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
                    'w-full text-left flex items-center gap-2 rounded-lg border p-3 transition-colors cursor-pointer',
                    isActive ? 'border-primary-600/50 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <SUICoreBodyText as="span" size="sm" weight="bold" className="truncate">{t.name}</SUICoreBodyText>
                      {isActive && <SUICoreBadge variant="primary" text="Active" />}
                    </div>
                    <SUICoreBodyText size="xs" tone="secondary" className="mt-0.5 truncate">
                      {templateSummary(t, allResources.length)}
                    </SUICoreBodyText>
                  </div>
                  {!isActive && (
                    <SUICoreButton
                      size="sm"
                      variant="outline"
                      text="Apply"
                      className="shrink-0"
                      onClick={(e) => { e.stopPropagation(); onApply(t.id); }}
                    />
                  )}
                  <SUICoreIcon name="chevronRight" size="sm" className="text-fg-tertiary shrink-0" />
                </div>
              );
            })}
          </div>
          <SUICoreButton variant="primary" width="full" icon="plus" text="Create new template" className="mt-4" onClick={() => openEditor()} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SUICoreInput label="Template name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning shift – Electrical" />

          <SUICoreTabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <SUICoreTabsList>
              <SUICoreTabsTrigger value="time" icon="clock">Time</SUICoreTabsTrigger>
              <SUICoreTabsTrigger value="technicians" icon="users">Technicians</SUICoreTabsTrigger>
              <SUICoreTabsTrigger value="card" icon="clipboardList">Card</SUICoreTabsTrigger>
              <SUICoreTabsTrigger value="more" icon="sparkles">More</SUICoreTabsTrigger>
            </SUICoreTabsList>

            <div className="min-h-[220px] pt-4">
              <SUICoreTabsContent value="time" className="flex flex-col gap-4">
                <SUICoreBodyText size="xs" tone="secondary">Choose the time window shown on the timeline.</SUICoreBodyText>
                <div className="flex items-start gap-3">
                  <SUICoreSelect
                    label="Start"
                    value={String(startHour)}
                    onChange={(v) => setStartHour(Number(v))}
                    options={startOptions.map((h) => ({ value: String(h), label: formatHour(h) }))}
                  />
                  <SUICoreSelect
                    label="End"
                    value={String(endHour)}
                    onChange={(v) => setEndHour(Number(v))}
                    options={endOptions.map((h) => ({ value: String(h), label: formatHour(h) }))}
                  />
                </div>
                {!timeValid && <SUICoreBodyText size="xs" tone="danger">End time must be after the start time.</SUICoreBodyText>}

                <div>
                  <SUICoreSelect
                    label="Snap interval"
                    value={String(snapMinutes)}
                    onChange={(v) => setSnapMinutes(Number(v))}
                    options={SNAP_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                  />
                  <SUICoreBodyText size="2xs" tone="muted" className="mt-1">Jobs snap to this grid when created, dragged, or resized.</SUICoreBodyText>
                </div>
              </SUICoreTabsContent>

              <SUICoreTabsContent value="technicians" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <SUICoreBodyText size="xs" tone="secondary">Which technicians appear in the sidebar and timeline.</SUICoreBodyText>
                  <SUICoreSwitch label="Show all" checked={allMode} onCheckedChange={setAllMode} />
                </div>
                <div className={cn('flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1', allMode && 'opacity-50 pointer-events-none')}>
                  {allResources.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-50">
                      <SUICoreCheckbox
                        checked={allMode || selectedIds.includes(r.id)}
                        disabled={allMode}
                        onCheckedChange={() => toggleTechnician(r.id)}
                        label={r.name}
                      />
                      {r.metadata?.role && (
                        <span className="text-body-2xs uppercase tracking-wider text-fg-tertiary ml-auto shrink-0">{r.metadata.role}</span>
                      )}
                    </div>
                  ))}
                </div>
                {!techValid && <SUICoreBodyText size="xs" tone="danger">Select at least one technician.</SUICoreBodyText>}
              </SUICoreTabsContent>

              <SUICoreTabsContent value="card">
                <CardLayoutEditor rows={cardRowsDraft} onChange={setCardRowsDraft} />
              </SUICoreTabsContent>

              <SUICoreTabsContent value="more" className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <SUICoreBodyText size="xs" tone="secondary">Appearance applied when this template is active.</SUICoreBodyText>
                  <div className="flex items-center gap-2">
                    <SUICoreButton variant={themeDraft === 'light' ? 'primary' : 'outline'} icon="sun" text="Light" onClick={() => setThemeDraft('light')} />
                    <SUICoreButton variant={themeDraft === 'dark' ? 'primary' : 'outline'} icon="moon" text="Dark" onClick={() => setThemeDraft('dark')} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <SUICoreBodyText size="xs" tone="secondary">When to open an event's detail card.</SUICoreBodyText>
                  <div className="flex items-center gap-2">
                    <SUICoreButton variant={detailTriggerDraft === 'hover' ? 'primary' : 'outline'} icon="eye" text="On hover" onClick={() => setDetailTriggerDraft('hover')} />
                    <SUICoreButton variant={detailTriggerDraft === 'click' ? 'primary' : 'outline'} icon="clipboardList" text="On click" onClick={() => setDetailTriggerDraft('click')} />
                  </div>
                </div>
              </SUICoreTabsContent>
            </div>
          </SUICoreTabs>
        </div>
      )}
    </SUILayoutModal>
  );
};
