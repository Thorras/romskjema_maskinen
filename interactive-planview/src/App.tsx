import { useState } from 'react';
import { PlanviewLoader } from './components/PlanviewLoader';
import { EventMonitor } from './components/EventMonitor';
import { useKiroHooks } from './hooks/useKiroHooks';

function App() {
  const [svgElement, setSvgElement] = useState<SVGElement | null>(null);
  const hooks = useKiroHooks();

  const handleSvgLoaded = (svg: SVGElement) => {
    setSvgElement(svg);
    
    // Simulate some user interactions for demo
    setTimeout(() => {
      hooks.onElementSelected('wall-123', 'IfcWall');
    }, 1000);
    
    setTimeout(() => {
      hooks.onLayerToggled('Walls', false);
    }, 2000);
    
    setTimeout(() => {
      hooks.onZoomChanged(1.5);
    }, 3000);
  };

  const simulateSlowOperation = () => {
    const start = performance.now();
    hooks.onRenderStart(1000);
    
    // Simulate slow rendering
    setTimeout(() => {
      const duration = performance.now() - start + 2500; // Force it to be slow
      hooks.onRenderComplete(1000, duration);
    }, 100);
  };

  const simulateExport = () => {
    hooks.onExportStart('PNG');
    
    setTimeout(() => {
      if (Math.random() > 0.7) {
        hooks.onExportError('PNG', new Error('Export failed due to memory limit'));
      } else {
        hooks.onExportComplete('PNG', 1024 * 1024); // 1MB
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interactive Planview Application
          </h1>
          <p className="text-gray-600">
            Med Kiro Agent Hooks for observability og monitoring
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <PlanviewLoader onSvgLoaded={handleSvgLoaded} />
            
            {svgElement && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">SVG Planview</h3>
                <div 
                  className="border border-gray-200 rounded p-4 max-h-64 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: svgElement.outerHTML }}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Demo Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={simulateSlowOperation}
                  className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                >
                  Simulate Slow Rendering (Performance Hook)
                </button>
                
                <button
                  onClick={simulateExport}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Simulate Export (Success/Error Hook)
                </button>
                
                <button
                  onClick={() => hooks.onMeasurementCompleted('distance', 5.2, 'm')}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Simulate Measurement Completed
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Kiro Hooks Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Event-driven architecture</li>
                <li>✅ Performance monitoring</li>
                <li>✅ Error tracking</li>
                <li>✅ User interaction logging</li>
                <li>✅ Automatic timing</li>
                <li>✅ Plugin-based extensibility</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <EventMonitor />
    </div>
  );
}

export default App;