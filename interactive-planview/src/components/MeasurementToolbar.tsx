import React from 'react';
import { useMeasurementStore } from '@/store/measurementStore';
import type { Measurement } from '@/types';

interface MeasurementToolbarProps {
  className?: string;
}

export const MeasurementToolbar: React.FC<MeasurementToolbarProps> = ({
  className = '',
}) => {
  const measurementMode = useMeasurementStore((state) => state.measurementMode);
  const activeMeasurement = useMeasurementStore((state) => state.activeMeasurement);
  const measurements = useMeasurementStore((state) => state.measurements);
  const nextMeasurementType = useMeasurementStore((state) => state.nextMeasurementType);
  const enableMeasurementMode = useMeasurementStore((state) => state.enableMeasurementMode);
  const disableMeasurementMode = useMeasurementStore((state) => state.disableMeasurementMode);
  const setNextMeasurementType = useMeasurementStore((state) => state.setNextMeasurementType);
  const finishMeasurement = useMeasurementStore((state) => state.finishMeasurement);
  const cancelActiveMeasurement = useMeasurementStore((state) => state.cancelActiveMeasurement);
  const deleteMeasurement = useMeasurementStore((state) => state.deleteMeasurement);
  const clearAllMeasurements = useMeasurementStore((state) => state.clearAllMeasurements);
  const toggleMeasurementVisibility = useMeasurementStore((state) => state.toggleMeasurementVisibility);

  const handleToggleMeasurementMode = () => {
    if (measurementMode) {
      disableMeasurementMode();
    } else {
      enableMeasurementMode();
    }
  };

  const handleStartDistanceMeasurement = () => {
    setNextMeasurementType('distance');
    if (!measurementMode) {
      enableMeasurementMode();
    }
  };

  const handleStartAreaMeasurement = () => {
    setNextMeasurementType('area');
    if (!measurementMode) {
      enableMeasurementMode();
    }
  };

  const handleCancelMeasurement = () => {
    if (activeMeasurement) {
      cancelActiveMeasurement();
    }
  };

  const handleDeleteMeasurement = (id: string) => {
    deleteMeasurement(id);
  };

  const handleToggleVisibility = (id: string) => {
    toggleMeasurementVisibility(id);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all measurements?')) {
      clearAllMeasurements();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Measurement Tools</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${measurementMode ? 'text-green-600' : 'text-gray-500'}`}>
            {measurementMode ? 'Active' : 'Inactive'}
          </span>
          <div
            className={`w-3 h-3 rounded-full ${
              measurementMode ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Measurement Mode Controls */}
      <div className="space-y-3 mb-4">
        <button
          onClick={handleToggleMeasurementMode}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
            measurementMode
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {measurementMode ? 'Exit Measurement Mode' : 'Enter Measurement Mode'}
        </button>

        {measurementMode && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleStartDistanceMeasurement}
                disabled={!!activeMeasurement}
                className={`px-3 py-2 text-white rounded-md text-sm transition-colors ${
                  nextMeasurementType === 'distance' && !activeMeasurement
                    ? 'bg-orange-600 ring-2 ring-orange-300'
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                Distance
              </button>
              <button
                onClick={handleStartAreaMeasurement}
                disabled={!!activeMeasurement}
                className={`px-3 py-2 text-white rounded-md text-sm transition-colors ${
                  nextMeasurementType === 'area' && !activeMeasurement
                    ? 'bg-purple-600 ring-2 ring-purple-300'
                    : 'bg-purple-500 hover:bg-purple-600'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                Area
              </button>
            </div>
            
            {activeMeasurement && activeMeasurement.type === 'area' && activeMeasurement.points.length >= 3 && (
              <button
                onClick={() => finishMeasurement()}
                className="w-full px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                Finish Area Measurement
              </button>
            )}
          </div>
        )}

        {activeMeasurement && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                {activeMeasurement.type === 'distance' ? 'Distance' : 'Area'} measurement in progress...
              </span>
              <button
                onClick={handleCancelMeasurement}
                className="text-yellow-600 hover:text-yellow-800 text-sm"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              Points: {activeMeasurement?.points?.length || 0}
              {activeMeasurement?.type === 'distance' && (activeMeasurement?.points?.length || 0) === 1 && ' (need 1 more)'}
              {activeMeasurement?.type === 'area' && (activeMeasurement?.points?.length || 0) < 3 && ` (need ${3 - (activeMeasurement?.points?.length || 0)} more)`}
              {activeMeasurement?.type === 'area' && (activeMeasurement?.points?.length || 0) >= 3 && ' (ready to finish)'}
            </div>
            {activeMeasurement && activeMeasurement.value > 0 && (
              <div className="text-xs text-yellow-700 mt-1 font-medium">
                Current: {activeMeasurement.value.toFixed(2)} {activeMeasurement.unit}{activeMeasurement.type === 'area' ? '²' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {measurementMode && !activeMeasurement && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Instructions:</div>
            <ul className="text-xs space-y-1">
              <li>• Click "Distance" or "Area" to select measurement type</li>
              <li>• Click on the planview to place measurement points</li>
              <li>• Distance: 2 points (auto-finish)</li>
              <li>• Area: 3+ points (double-click or use "Finish" button)</li>
              <li>• Press ESC to cancel active measurement</li>
            </ul>
          </div>
        </div>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Measurements ({measurements.length})
            </h4>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {measurements.map((measurement: Measurement) => (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      measurement.type === 'distance' ? 'bg-orange-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {measurement.type === 'distance' ? 'Distance' : 'Area'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {measurement.value.toFixed(2)} {measurement.unit}{measurement.type === 'area' ? '²' : ''}
                    {measurement.label && ` - ${measurement.label}`}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleVisibility(measurement.id)}
                    className={`p-1 rounded text-xs ${
                      measurement.visible
                        ? 'text-blue-600 hover:text-blue-800'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={measurement.visible ? 'Hide' : 'Show'}
                  >
                    {measurement.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <button
                    onClick={() => handleDeleteMeasurement(measurement.id)}
                    className="p-1 text-red-600 hover:text-red-800 text-xs"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {measurements.length === 0 && !measurementMode && (
        <div className="text-center py-4">
          <div className="text-gray-400 text-sm">No measurements yet</div>
          <div className="text-xs text-gray-500 mt-1">
            Enable measurement mode to start measuring
          </div>
        </div>
      )}
    </div>
  );
};

export default MeasurementToolbar;