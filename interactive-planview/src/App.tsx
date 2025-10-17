import { useState, useEffect } from 'react';
import { PlanviewLoader } from './components/PlanviewLoader';
import { EventMonitor } from './components/EventMonitor';
import { StylingPanel } from './components/StylingPanel';
import { ElementInfoManager } from './components/ElementInfoManager';
import { SVGRenderer } from './components/SVGRenderer';
import { LayerControlPanel } from './components/LayerControlPanel';
import { useKiroHooks } from './hooks/useKiroHooks';
import { useViewerStore } from './store/viewerStore';
import { extractIFCClasses } from './utils/ifcClasses';
import type { IFCElement } from './types';

function App() {
  const [svgElement, setSvgElement] = useState<SVGElement | null>(null);
  const [demoElements] = useState<IFCElement[]>([
    {
      guid: 'wall-001',
      ifcClass: 'IfcWall',
      geometry: {
        type: 'rect',
        data: { x: 50, y: 50, width: 200, height: 20 },
        bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 }
      },
      properties: {
        Name: 'Exterior Wall',
        Material: 'Concrete',
        Thickness: '200mm',
        FireRating: '2 hours',
        LoadBearing: true
      },
      bounds: { minX: 50, minY: 50, maxX: 250, maxY: 70 },
      visible: true,
      style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 2 }
    },
    {
      guid: 'door-001',
      ifcClass: 'IfcDoor',
      geometry: {
        type: 'rect',
        data: { x: 120, y: 50, width: 30, height: 20 },
        bounds: { minX: 120, minY: 50, maxX: 150, maxY: 70 }
      },
      properties: {
        Name: 'Main Entrance',
        Width: '900mm',
        Height: '2100mm',
        Material: 'Wood',
        FireRating: '30 minutes'
      },
      bounds: { minX: 120, minY: 50, maxX: 150, maxY: 70 },
      visible: true,
      style: { fill: '#8B4513', stroke: '#654321', strokeWidth: 1 }
    },
    {
      guid: 'window-001',
      ifcClass: 'IfcWindow',
      geometry: {
        type: 'rect',
        data: { x: 180, y: 50, width: 40, height: 20 },
        bounds: { minX: 180, minY: 50, maxX: 220, maxY: 70 }
      },
      properties: {
        Name: 'Living Room Window',
        Width: '1200mm',
        Height: '1500mm',
        GlazingType: 'Double Glazed',
        UValue: '1.2 W/m²K'
      },
      bounds: { minX: 180, minY: 50, maxX: 220, maxY: 70 },
      visible: true,
      style: { fill: '#87CEEB', stroke: '#4682B4', strokeWidth: 1 }
    },
    {
      guid: 'slab-001',
      ifcClass: 'IfcSlab',
      geometry: {
        type: 'rect',
        data: { x: 30, y: 30, width: 240, height: 140 },
        bounds: { minX: 30, minY: 30, maxX: 270, maxY: 170 }
      },
      properties: {
        Name: 'Ground Floor Slab',
        Thickness: '150mm',
        Material: 'Reinforced Concrete',
        LoadCapacity: '5 kN/m²'
      },
      bounds: { minX: 30, minY: 30, maxX: 270, maxY: 170 },
      visible: true,
      style: { fill: '#D3D3D3', stroke: '#A9A9A9', strokeWidth: 1, fillOpacity: 0.3 }
    }
  ]);
  
  const hooks = useKiroHooks();
  const loadElements = useViewerStore((state) => state.loadElements);
  const setAvailableLayers = useViewerStore((state) => state.setAvailableLayers);
  const showAllLayers = useViewerStore((state) => state.showAllLayers);

  // Load demo elements into the store
  useEffect(() => {
    loadElements(demoElements);
    const ifcClasses = extractIFCClasses(demoElements);
    setAvailableLayers(ifcClasses);
    showAllLayers();
  }, [demoElements, loadElements, setAvailableLayers, showAllLayers]);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PlanviewLoader onSvgLoaded={handleSvgLoaded} />
            
            {/* Interactive Demo Viewer */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Interactive Planview Demo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click on elements to see their information popup. Try the wall, door, window, or floor slab.
              </p>
              <ElementInfoManager className="border border-gray-200 rounded">
                <SVGRenderer
                  elements={demoElements}
                  width={400}
                  height={300}
                  className="w-full"
                />
              </ElementInfoManager>
            </div>
            
            {svgElement && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Uploaded SVG Planview</h3>
                <div 
                  className="border border-gray-200 rounded p-4 max-h-64 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: svgElement.outerHTML }}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <LayerControlPanel />
            
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

            <StylingPanel className="mb-6" />
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Element Selection Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✅ Click detection with spatial indexing</li>
                <li>✅ Information popup with auto-positioning</li>
                <li>✅ Element properties display</li>
                <li>✅ Geometry information</li>
                <li>✅ Visual selection feedback</li>
                <li>✅ Keyboard navigation (ESC to close)</li>
              </ul>
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