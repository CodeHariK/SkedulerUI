import React from 'react';
import { SUICoreBodyText, SUICoreButton, SUICoreIcon, SUICoreBadge } from '@/components/sui';
import { cn } from '@/lib/cn';
import { CARD_FIELDS, MAX_CARD_ROWS } from './constants';
import type { CardFieldKey } from './types';

interface CardLayoutEditorProps {
  /** Current layout: rows of field keys, in render order. */
  rows: CardFieldKey[][];
  onChange: (rows: CardFieldKey[][]) => void;
}

type DragSource = 'hidden' | number;

const labelFor = (key: CardFieldKey) => CARD_FIELDS.find((f) => f.key === key)?.label ?? key;

/**
 * Drag-and-drop builder for the event-card layout. Fields are dragged between a
 * "Hidden" bin and up to {MAX_CARD_ROWS} rows; order within a row is set by
 * dropping onto a chip. Drag a chip back to Hidden to remove it from the card.
 * Self-contained: owns only drag state, lifts the layout via `onChange`.
 * (Native HTML5 DnD — pointer/mouse; not touch.)
 */
export const CardLayoutEditor: React.FC<CardLayoutEditorProps> = ({ rows, onChange }) => {
  const [dragging, setDragging] = React.useState<{ key: CardFieldKey; source: DragSource } | null>(null);

  const hiddenFields = React.useMemo(() => {
    const assigned = new Set(rows.flat());
    return CARD_FIELDS.filter((f) => !assigned.has(f.key));
  }, [rows]);

  // Move a field from its source to a target row (or back to Hidden), optionally
  // at a specific index within the target row.
  const move = (key: CardFieldKey, source: DragSource, target: DragSource, targetIndex?: number) => {
    const next = rows.map((r) => [...r]);
    let index = targetIndex;

    if (source !== 'hidden') {
      const from = next[source].indexOf(key);
      if (from !== -1) next[source].splice(from, 1);
      // Removing an earlier item in the same row shifts the insertion point left.
      if (source === target && index !== undefined && from < index) index -= 1;
    }

    if (target !== 'hidden') {
      while (next.length <= target) next.push([]);
      if (index === undefined) next[target].push(key);
      else next[target].splice(index, 0, key);
    }

    onChange(next);
  };

  const onDragStart = (e: React.DragEvent, key: CardFieldKey, source: DragSource) => {
    setDragging({ key, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();
  const endDrop = (target: DragSource, targetIndex?: number) => {
    if (dragging) move(dragging.key, dragging.source, target, targetIndex);
    setDragging(null);
  };

  // Plain render function (NOT a component) so re-rendering on drag start doesn't
  // remount and abort the in-flight drag.
  const renderChip = (key: CardFieldKey, source: DragSource, index?: number) => (
    <div
      key={key}
      draggable
      onDragStart={(e) => onDragStart(e, key, source)}
      onDragEnd={() => setDragging(null)}
      onDragOver={source !== 'hidden' ? allowDrop : undefined}
      onDrop={
        source !== 'hidden'
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              endDrop(source, index);
            }
          : undefined
      }
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-body-xs font-medium shadow-xs select-none transition-colors cursor-grab active:cursor-grabbing hover:border-primary-300 dark:bg-neutral-800 dark:border-border/30',
        dragging?.key === key && 'opacity-40',
      )}
    >
      <SUICoreIcon name="gripVertical" size="xs" className="text-fg-tertiary shrink-0" />
      <span>{labelFor(key)}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SUICoreBodyText size="xs" tone="secondary">Drag fields into rows to lay out the card; drop onto a chip to reorder.</SUICoreBodyText>
        <SUICoreBodyText size="2xs" tone="muted">Drag a field back to “Hidden” to remove it from the card.</SUICoreBodyText>
      </div>

      {/* Live preview */}
      <div className="rounded-card border border-neutral-200 dark:border-border/30 bg-neutral-50/60 dark:bg-neutral-900/30 px-3 py-2">
        <SUICoreBodyText size="2xs" tone="muted" className="mb-1.5 uppercase tracking-wider">Preview</SUICoreBodyText>
        <div className="rounded-xl border-l-4 border-l-primary-600 border border-neutral-100 dark:border-border/30 bg-white dark:bg-[#1a1a24] px-3 py-2 flex flex-col gap-1 shadow-sm">
          {rows.flat().length === 0 && <SUICoreBodyText size="2xs" tone="muted">No fields visible</SUICoreBodyText>}
          {rows.map((row, i) =>
            row.length ? (
              <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {row.map((key) =>
                  key === 'status' ? (
                    <SUICoreBadge key={key} variant="neutral" text="Status" className="uppercase tracking-wider" />
                  ) : (
                    <span key={key} className={cn('text-body-xs', key === 'title' ? 'font-bold text-fg-primary' : 'text-fg-tertiary')}>
                      {labelFor(key)}
                    </span>
                  ),
                )}
              </div>
            ) : null,
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hidden bin */}
        <div
          onDragOver={allowDrop}
          onDrop={(e) => { e.preventDefault(); endDrop('hidden'); }}
          className={cn(
            'rounded-xl border border-dashed p-3 flex flex-col gap-2 min-h-[180px] transition-colors',
            dragging && dragging.source !== 'hidden'
              ? 'border-primary-400 bg-primary-50/30'
              : 'border-neutral-300 bg-neutral-50/50 dark:border-border/40 dark:bg-neutral-900/30',
          )}
        >
          <SUICoreBodyText size="2xs" weight="bold" tone="secondary" className="uppercase tracking-wider">Hidden</SUICoreBodyText>
          <div className="flex flex-wrap md:flex-col gap-1.5 content-start">
            {hiddenFields.map((f) => renderChip(f.key, 'hidden'))}
            {hiddenFields.length === 0 && (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-neutral-200 dark:border-border/20 py-6">
                <SUICoreBodyText size="2xs" tone="muted">All fields shown</SUICoreBodyText>
              </div>
            )}
          </div>
        </div>

        {/* Rows */}
        <div className="md:col-span-2 flex flex-col gap-2.5">
          {Array.from({ length: MAX_CARD_ROWS }).map((_, rowIdx) => {
            const rowFields = rows[rowIdx] ?? [];
            const isDropTarget = !!dragging && dragging.source !== rowIdx;
            return (
              <div
                key={rowIdx}
                onDragOver={allowDrop}
                onDrop={(e) => { e.preventDefault(); endDrop(rowIdx); }}
                className={cn(
                  'rounded-xl border p-2.5 flex flex-col gap-1.5 transition-colors',
                  isDropTarget ? 'border-dashed border-primary-400 bg-primary-50/20' : 'border-neutral-200 dark:border-border/30 bg-white dark:bg-[#1a1a24]',
                )}
              >
                <div className="flex items-center justify-between">
                  <SUICoreBodyText as="span" size="2xs" weight="bold" className="text-primary-600 uppercase tracking-wider">Row {rowIdx + 1}</SUICoreBodyText>
                  {rowFields.length > 0 && (
                    <SUICoreButton
                      variant="textLink"
                      size="sm"
                      text="Clear"
                      className="text-fg-tertiary hover:text-danger-500"
                      onClick={() => onChange(rows.map((r, i) => (i === rowIdx ? [] : r)))}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 min-h-[34px]">
                  {rowFields.map((key, itemIdx) => renderChip(key, rowIdx, itemIdx))}
                  {rowFields.length === 0 && (
                    <div className="flex-1 rounded-lg border border-dashed border-neutral-200 dark:border-border/20 py-2 text-center">
                      <SUICoreBodyText size="2xs" tone="muted">Drag fields here</SUICoreBodyText>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
