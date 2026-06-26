import { useState, useMemo } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { ResourceScheduler } from './components/Scheduler/ResourceScheduler';
import { TemplateDialog } from './components/Scheduler/TemplateDialog';
import type { Resource, SchedulerTemplate } from './components/Scheduler/types';
import { generateStressTestData } from '@/lib/stressMockData';
import { fetchSchedulerDataByDate, saveEventToDatabase } from '@/lib/schedulerService';
import { Toaster } from '@/components/ui/sonner';

// Fallback view used only when no template is active (e.g. all templates
// deleted): show every technician across the full default window.
const FALLBACK_VIEW = { dayStartHour: 6, dayEndHour: 20, visibleResourceIds: null as string[] | null, snapMinutes: 15 };

// Two seeded dummy templates for testing — different technicians, hours, snap.
const DUMMY_TEMPLATES: SchedulerTemplate[] = [
  {
    id: 'tpl-morning',
    name: 'Morning Shift',
    dayStartHour: 6,
    dayEndHour: 12,
    visibleResourceIds: ['resource-1', 'resource-2', 'resource-3'],
    snapMinutes: 15,
  },
  {
    id: 'tpl-evening',
    name: 'Evening Crew',
    dayStartHour: 13,
    dayEndHour: 20,
    visibleResourceIds: ['resource-4', 'resource-5', 'resource-6', 'resource-7'],
    snapMinutes: 30,
  },
];

function App() {
  // Read initial states from URL query parameters
  const { initialTab, initialStressRowCount } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'Scheduler';
    const rows = params.get('rows');
    let parsedRows = 50;
    if (rows) {
      const parsed = parseInt(rows, 10);
      if (!isNaN(parsed)) parsedRows = parsed;
    }
    return { initialTab: tab, initialStressRowCount: parsedRows };
  }, []);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [stressRowCount, setStressRowCount] = useState(initialStressRowCount);

  // Generate default scheduler data with 8 resources (between 5 and 10).
  const { schedulerResources: baseSchedulerResources, schedulerEvents } = useMemo(() => {
    const { resources, events } = generateStressTestData(8);
    return { schedulerResources: resources, schedulerEvents: events };
  }, []);

  // Technicians added at runtime via the Add Technician button (session-only).
  const [addedResources, setAddedResources] = useState<Resource[]>([]);
  const schedulerResources = useMemo(
    () => [...baseSchedulerResources, ...addedResources],
    [baseSchedulerResources, addedResources]
  );
  const handleAddResource = (resource: Resource) => setAddedResources(prev => [...prev, resource]);

  // Session-only template state (resets on reload, per product decision).
  const [templates, setTemplates] = useState<SchedulerTemplate[]>(DUMMY_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DUMMY_TEMPLATES[0].id);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Active template's settings, falling back to the full view when none is set.
  const activeView = useMemo(
    () => templates.find(t => t.id === activeTemplateId) ?? FALLBACK_VIEW,
    [templates, activeTemplateId]
  );

  // Resources/events the Scheduler tab actually shows, filtered by the template.
  const visibleSchedulerResources = useMemo(() => {
    if (activeView.visibleResourceIds === null) return schedulerResources;
    const ids = new Set(activeView.visibleResourceIds);
    return schedulerResources.filter(r => ids.has(r.id));
  }, [schedulerResources, activeView]);

  const visibleSchedulerEvents = useMemo(() => {
    if (activeView.visibleResourceIds === null) return schedulerEvents;
    const ids = new Set(activeView.visibleResourceIds);
    return schedulerEvents.filter(e => ids.has(e.resourceId));
  }, [schedulerEvents, activeView]);

  const handleApplyTemplate = (id: string) => {
    setActiveTemplateId(id);
    setTemplatesOpen(false);
  };

  const handleSaveTemplate = (template: SchedulerTemplate) => {
    setTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      return exists ? prev.map(t => (t.id === template.id ? template : t)) : [...prev, template];
    });
    setActiveTemplateId(template.id); // applying the just-saved template is the common intent
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setActiveTemplateId(prev => {
      if (prev !== id) return prev;
      const remaining = templates.filter(t => t.id !== id);
      return remaining[0]?.id ?? '';
    });
  };

  // Update URL search parameters when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    if (tab === 'Stress Test') {
      params.set('rows', stressRowCount.toString());
    } else {
      params.delete('rows');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  };

  // Update URL search parameters when row count changes
  const handleStressRowCountChange = (count: number) => {
    setStressRowCount(count);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'Stress Test');
    params.set('rows', count.toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', newUrl);
  };

  // Generate stress test data with dynamic resources and associated events.
  // Memoized so it doesn't regenerate on every render unless stressRowCount changes.
  const { stressResources, stressEvents } = useMemo(() => {
    const { resources, events } = generateStressTestData(stressRowCount);
    return { stressResources: resources, stressEvents: events };
  }, [stressRowCount]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Toaster position="bottom-right" />
      {/* Navigation Header */}
      <NavigationHeader activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {activeTab === 'Scheduler' ? (
          <ResourceScheduler
            resources={visibleSchedulerResources}
            events={visibleSchedulerEvents}
            dayStartHour={activeView.dayStartHour}
            dayEndHour={activeView.dayEndHour}
            snapMinutes={activeView.snapMinutes}
            canChangeRows={true}
            fetchEventsForDate={fetchSchedulerDataByDate}
            onSaveEvent={saveEventToDatabase}
            onOpenTemplates={() => setTemplatesOpen(true)}
            onResourceAdd={handleAddResource}
          />
        ) : activeTab === 'Stress Test' ? (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 px-6 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span><strong>Stress Test Mode:</strong> Rendering <strong>{stressResources.length}</strong> resources and <strong>{stressEvents.length}</strong> events smoothly.</span>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <label htmlFor="stress-rows-select" className="font-semibold text-amber-950 dark:text-amber-200">Resources:</label>
                  <select
                    id="stress-rows-select"
                    value={stressRowCount}
                    onChange={(e) => handleStressRowCountChange(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                  >
                    {[50, 200, 400, 800, 1000, 1200, 1500, 2000].map(count => (
                      <option key={count} value={count}>{count} Rows</option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                React-Virtual Enabled
              </span>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResourceScheduler
                resources={stressResources}
                events={stressEvents}
                dayStartHour={6}
                dayEndHour={20}
                canChangeRows={true}
                fetchEventsForDate={fetchSchedulerDataByDate}
                onSaveEvent={saveEventToDatabase}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-white m-6 p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-text-primary">{activeTab} View</h3>
            <p className="text-sm text-text-secondary mt-1">This section is currently under development.</p>
          </div>
        )}
      </main>

      <TemplateDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        templates={templates}
        activeTemplateId={activeTemplateId}
        allResources={schedulerResources}
        onApply={handleApplyTemplate}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplate}
      />
    </div>
  );
}

export default App;
