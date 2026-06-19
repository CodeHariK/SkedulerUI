import { useState, useMemo } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { ResourceScheduler } from './components/Scheduler/ResourceScheduler';
import { mockResources, mockEvents } from './components/Scheduler/mockData';
import { generateStressTestData } from './components/Scheduler/stressMockData';

function App() {
  const [activeTab, setActiveTab] = useState('Scheduler');

  // Generate stress test data with 1000 resources and associated events.
  // Memoized so it doesn't regenerate on every render.
  const { stressResources, stressEvents } = useMemo(() => {
    const { resources, events } = generateStressTestData(100);
    return { stressResources: resources, stressEvents: events };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation Header */}
      <NavigationHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {activeTab === 'Scheduler' ? (
          <ResourceScheduler
            resources={mockResources}
            events={mockEvents}
            dayStartHour={6}
            dayEndHour={20}
            canChangeRows={true}
          />
        ) : activeTab === 'Stress Test' ? (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 px-6 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span><strong>Stress Test Mode:</strong> Rendering <strong>{stressResources.length}</strong> virtualized resources and <strong>{stressEvents.length}</strong> events smoothly.</span>
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
    </div>
  );
}

export default App;
