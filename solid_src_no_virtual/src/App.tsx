import { createSignal, Show, type Component, createMemo, For } from 'solid-js';
import { NavigationHeader } from './components/NavigationHeader';
import { ResourceScheduler } from './components/Scheduler/ResourceScheduler';
import { generateStressTestData } from './lib/stressMockData';
import { fetchSchedulerDataByDate, saveEventToDatabase } from './lib/schedulerService';
import { Toaster } from './components/ui/sonner';

export const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal('Scheduler');

  // Generate default scheduler data with 8 resources.
  const { resources: schedulerResources, events: schedulerEvents } = generateStressTestData(8);

  // Generate stress test data reactively based on selected row count
  const [stressRowCount, setStressRowCount] = createSignal(800);
  const stressData = createMemo(() => generateStressTestData(stressRowCount()));

  console.log('Scheduler Mock Data:', { resources: schedulerResources, events: schedulerEvents });

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
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span><strong>Stress Test Mode:</strong> Rendering <strong>{stressData().resources.length}</strong> resources and <strong>{stressData().events.length}</strong> events smoothly.</span>
                </div>
                <div class="flex items-center gap-1.5 ml-4">
                  <label for="stress-rows-select" class="font-semibold text-amber-950 dark:text-amber-200">Resources:</label>
                  <select
                    id="stress-rows-select"
                    value={stressRowCount()}
                    onChange={(e) => setStressRowCount(Number(e.currentTarget.value))}
                    class="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                  >
                    <For each={[200, 400, 800, 1000, 1200, 1500, 2000]}>
                      {(count) => (
                        <option value={count}>{count} Rows</option>
                      )}
                    </For>
                  </select>
                </div>
              </div>
              <span class="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                Solid-Virtual Enabled
              </span>
            </div>
            <div class="flex-1 overflow-hidden flex flex-col">
              <ResourceScheduler
                resources={stressData().resources}
                events={stressData().events}
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
