import { For, Show, type Component, type JSX } from 'solid-js';
import type { Resource } from './types';
import { cn } from '../../lib/utils';
import { Calendar, GripVertical } from 'lucide-solid';

interface ResourceSidebarProps {
  resources: Resource[];
  rowDrag: { resourceId: string; currentIndex: number } | null;
  rowDropIndicator: number | null;
  draggedSidebarRowRef: (el: HTMLDivElement) => void;
  startRowDrag: (e: PointerEvent, resourceId: string) => void;
  renderResource?: (resource: Resource, onGripMouseDown?: (e: PointerEvent) => void) => JSX.Element;
  layoutEngine: () => any;
}

export const ResourceSidebar: Component<ResourceSidebarProps> = (props) => {
  const defaultRenderResource = (resource: Resource, onGripMouseDown?: (e: PointerEvent) => void) => {
    const role = resource.metadata?.role || '';
    const jobsCount = resource.metadata?.jobsCount || 0;

    return (
      <>
        <div
          class="text-muted-foreground/40 cursor-grab touch-none hover:text-text-primary rounded hover:bg-muted/50 transition-all duration-200 ease-in-out w-0 opacity-0 overflow-hidden group-hover:w-7 group-hover:opacity-100 flex items-center justify-center shrink-0"
          onPointerDown={onGripMouseDown}
        >
          <GripVertical class="size-4" />
        </div>
        <div class={cn(
          "flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm border shrink-0",
          role === 'ELECTRICAL' && "bg-[#FEF6F5] text-[#CF4523] border-[#FCDFD4]",
          role === 'PLUMBING' && "bg-[#F3F8FF] text-[#1D4ED8] border-[#DBEAFE]",
          role === 'HVAC' && "bg-[#EEFAFC] text-[#1E7BAF] border-[#C1E7EF]",
          role === 'UNASSIGNED' && "bg-[#F3F4F6] text-[#6A7282] border-[#E5E7EB]",
          !['ELECTRICAL', 'PLUMBING', 'HVAC', 'UNASSIGNED'].includes(role) && "bg-secondary text-secondary-foreground border-transparent"
        )}>
          {resource.avatar || resource.name.slice(0, 2).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-text-primary text-sm truncate">{resource.name}</h3>
          <div class="flex items-center gap-1.5 mt-1 flex-nowrap overflow-hidden">
            <Show when={role}>
              <span class="text-[12px] tracking-wider text-text-tertiary uppercase shrink-0">{role}</span>
            </Show>
            <Show when={jobsCount > 0}>
              <span class="flex items-center gap-1 text-[10px] text-text-secondary font-medium shrink-0">
                <Calendar class="w-3 h-3" />
                {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
              </span>
            </Show>
          </div>
        </div>
      </>
    );
  };

  // Pure Component to hold reactive tracking scope
  const SidebarRow = (rowProps: { resource: Resource; index: () => number }) => {
    const res = () => rowProps.resource;

    // Reactively binds to layoutEngine. When events drop, this instantly recalculates.
    const height = () => props.layoutEngine().rowHeights[res().id] || 140;
    const isDraggingRow = () => props.rowDrag?.resourceId === res().id;
    const bgEvenOdd = () => rowProps.index() % 2 === 0 ? 'var(--row-bg-even)' : 'var(--row-bg-odd)';

    return (
      <div
        class="relative w-full transition-[height] duration-200"
        style={{
          height: `${height()}px`,
          "z-index": (isDraggingRow() ? 50 : 1).toString()
        }}
      >
        <div
          class={cn(
            "absolute inset-0 flex items-center gap-3 px-4 border-b border-border select-none",
            isDraggingRow() ? "opacity-30 bg-muted grayscale" : "hover:bg-muted/10 transition-colors group"
          )}
          style={{ "background-color": isDraggingRow() ? undefined : bgEvenOdd() }}
        >
          {props.renderResource
            ? props.renderResource(res(), (e) => props.startRowDrag(e, res().id))
            : defaultRenderResource(res(), (e) => props.startRowDrag(e, res().id))}
        </div>

        <Show when={isDraggingRow()}>
          <div
            ref={props.draggedSidebarRowRef}
            class="absolute inset-0 flex items-center gap-3 px-4 border-b border-border select-none opacity-100 border-primary/40 bg-primary/5 shadow-2xl !transition-none cursor-grabbing"
            style={{ "background-color": bgEvenOdd() }}
          >
            {props.renderResource
              ? props.renderResource(res(), () => { })
              : defaultRenderResource(res(), () => { })}
          </div>
        </Show>

        <Show when={props.rowDropIndicator === rowProps.index() && !isDraggingRow() && props.rowDrag}>
          <div
            class="absolute left-0 right-0 h-0.5 bg-primary z-40 pointer-events-none"
            style={{ top: props.rowDropIndicator! > props.rowDrag!.currentIndex ? '100%' : '0px' }}
          />
        </Show>
      </div>
    );
  };

  return (
    <div class="w-[240px] flex-shrink-0 border-r border-border bg-card z-10 select-none">
      <div class="h-14 flex items-center px-6 border-b border-border bg-card sticky top-0 z-30">
        <span class="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">TECHNICIANS</span>
      </div>

      {/* Native Browser Stacking (No manual yPos math needed) */}
      <div class="flex flex-col relative w-full">
        <For each={props.resources}>
          {(resource, index) => <SidebarRow resource={resource} index={index} />}
        </For>
      </div>
    </div>
  );
};
