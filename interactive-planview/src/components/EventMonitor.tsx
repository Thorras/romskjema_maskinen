import { useState } from 'react';
import { useKiroEventListener } from '../hooks/useKiroHooks';

interface EventLog {
  id: string;
  name: string;
  timestamp: number;
  data?: any;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function EventMonitor() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Listen to all events (in a real implementation, you'd be more selective)
  useKiroEventListener('kiro.planview.load.before', (event) => {
    addEvent(event.name, event.data, 'info');
  });

  useKiroEventListener('kiro.planview.load.after', (event) => {
    addEvent(event.name, event.data, 'success');
  });

  useKiroEventListener('kiro.planview.load.error', (event) => {
    addEvent(event.name, event.data, 'error');
  });

  useKiroEventListener('kiro.planview.performance.slow', (event) => {
    addEvent(event.name, event.data, 'warning');
  });

  useKiroEventListener('kiro.ui.element.selected', (event) => {
    addEvent(event.name, event.data, 'info');
  });

  const addEvent = (name: string, data: any, type: EventLog['type']) => {
    const newEvent: EventLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: Date.now(),
      data,
      type
    };

    setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getEventTypeColor = (type: EventLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const formatEventName = (name: string) => {
    return name.replace('kiro.', '').replace(/\./g, ' › ');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        Event Monitor ({events.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium text-gray-900">Kiro Event Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={clearEvents}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Hide
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-80">
        {events.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No events yet. Interact with the planview to see events.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                      {formatEventName(event.name)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    {event.data && (
                      <div className="text-xs text-gray-600 mt-1 font-mono">
                        {JSON.stringify(event.data, null, 2).slice(0, 100)}
                        {JSON.stringify(event.data).length > 100 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}