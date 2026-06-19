import { useState } from 'react';
import { NavigationHeader } from './components/NavigationHeader';
import { ResourceScheduler } from './components/Scheduler/ResourceScheduler';
import { mockResources, mockEvents } from './components/Scheduler/mockData';

function App() {
  const [activeTab, setActiveTab] = useState('Scheduler');

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
