import { createSignal, Show, type Component } from 'solid-js';
import { NavigationHeader } from './components/NavigationHeader';
import { ResourceScheduler } from './components/Scheduler/ResourceScheduler';
import { generateStressTestData } from './lib/stressMockData';
import { fetchSchedulerDataByDate, saveEventToDatabase } from './lib/schedulerService';
import { Toaster } from './components/ui/sonner';

export const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal('Scheduler');

  // Because the App component only executes ONCE in SolidJS, 
  // we do not need createMemo here. These will run once on mount and persist.

  // Generate default scheduler data with 8 resources.
  const { resources: schedulerResources, events: schedulerEvents } = generateStressTestData(8);

  // Generate stress test data with 400 resources.
  const { resources: stressResources, events: stressEvents } = generateStressTestData(400);

  console.log('Scheduler Mock Data:', { resources: schedulerResources, events: schedulerEvents });
  console.log('Stress Test Mock Data:', { resources: stressResources, events: stressEvents });

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Toaster position="bottom-right" />

      {/* Navigation Header */}
      <NavigationHeader activeTab={activeTab()} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main class="flex-1 flex flex-col overflow-hidden w-full">

        {/* Scheduler View */}
        <Show when={activeTab() === 'Scheduler'}>
          <ResourceScheduler
            resources={schedulerResources}
            events={schedulerEvents}
            dayStartHour={6}
            dayEndHour={20}
            canChangeRows={true}
            fetchEventsForDate={fetchSchedulerDataByDate}
            onSaveEvent={saveEventToDatabase}
          />
        </Show>

        {/* Stress Test View */}
        <Show when={activeTab() === 'Stress Test'}>
          <div class="flex-1 flex flex-col overflow-hidden relative">
            <div class="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 px-6 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between z-10 shrink-0">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span><strong>Stress Test Mode:</strong> Rendering <strong>{stressResources.length}</strong> virtualized resources and <strong>{stressEvents.length}</strong> events smoothly.</span>
              </div>
              <span class="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                Solid-Virtual Enabled
              </span>
            </div>
            <div class="flex-1 overflow-hidden flex flex-col">
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
        </Show>

        {/* Placeholder View for all other tabs */}
        <Show when={activeTab() !== 'Scheduler' && activeTab() !== 'Stress Test'}>
          <div class="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-white m-6 p-8 text-center shadow-sm">
            <h3 class="text-lg font-semibold text-text-primary">{activeTab()} View</h3>
            <p class="text-sm text-text-secondary mt-1">This section is currently under development.</p>
          </div>
        </Show>

      </main>
    </div>
  );
};

export default App;
