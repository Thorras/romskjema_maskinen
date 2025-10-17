import React, { useState } from 'react';
import { useKiroHooks, useKiroTiming } from '../hooks/useKiroHooks';

interface PlanviewLoaderProps {
  onSvgLoaded?: (svgElement: SVGElement) => void;
}

export function PlanviewLoader({ onSvgLoaded }: PlanviewLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hooks = useKiroHooks();
  const timing = useKiroTiming('planview.load');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    // Start timing and emit load start event
    timing.start({ fileName: file.name, fileSize: file.size });
    hooks.onLoadStart(file.name);

    try {
      const svgText = await file.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      
      if (svgDoc.documentElement.tagName === 'parsererror') {
        throw new Error('Invalid SVG format');
      }

      const svgElement = svgDoc.documentElement as unknown as SVGElement;
      const elementCount = svgElement.querySelectorAll('*').length;
      
      // Complete timing and emit success event
      timing.complete({ elementCount, fileName: file.name });
      hooks.onLoadComplete(elementCount, file.name);
      
      onSvgLoaded?.(svgElement);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      
      // Emit error events
      timing.error(error, { fileName: file.name });
      hooks.onLoadError(error, file.name);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Last opp SVG planview
        </h3>
        
        <input
          type="file"
          accept=".svg"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50"
        />
        
        {isLoading && (
          <div className="mt-4 text-blue-600">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
            Laster SVG...
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">Feil: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}