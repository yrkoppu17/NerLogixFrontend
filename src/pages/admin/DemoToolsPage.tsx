import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { triggerDemoRain, resetDemoData } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { getMapDistricts, MapDistrictDto } from '../../api/map';
import { CloudRain, RefreshCw, Wrench } from 'lucide-react';

export const DemoToolsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(1);
  const [condition, setCondition] = useState<string>('HEAVY');

  const { data: districts } = useQuery({
    queryKey: ['demo-districts'],
    queryFn: () => getMapDistricts(),
  });

  const rainMutation = useMutation({
    mutationFn: () => triggerDemoRain(selectedDistrictId, condition),
    onSuccess: () => {
      success(`Demo rain log injected for district! Risk engine recomputed.`);
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const resetMutation = useMutation({
    mutationFn: resetDemoData,
    onSuccess: () => {
      success(`Demo dataset reset to initial seed values!`);
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Interactive Demo & Simulation Tools</h1>
        <p className="text-sm text-ink-600">Simulate severe weather events and reset state for live evaluations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inject Heavy Rain Card */}
        <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <CloudRain className="w-6 h-6 text-river-600" />
            <div>
              <h3 className="font-bold text-sm text-ink-900">Simulate Heavy Rainfall Event</h3>
              <p className="text-xs text-ink-500">Injects a weather condition log, immediately recomputing corridor risk scores</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Target District</label>
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-mist-200 rounded-xl text-sm bg-white"
              >
                {districts?.map((d: MapDistrictDto) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Weather Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-xl text-sm bg-white"
              >
                <option value="LIGHT">LIGHT (Mild risk increase)</option>
                <option value="MODERATE">MODERATE (Moderate risk increase)</option>
                <option value="HEAVY">HEAVY (Landslide & flood risks)</option>
                <option value="EXTREME">EXTREME (High risk corridor & alerts)</option>
              </select>
            </div>

            <button
              onClick={() => rainMutation.mutate()}
              disabled={rainMutation.isPending}
              className="w-full py-2.5 bg-river-600 hover:bg-river-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              <CloudRain className="w-4 h-4" /> Trigger Rain Simulation
            </button>
          </div>
        </div>

        {/* Reset Demo Data Card */}
        <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-marigold-600" />
              <div>
                <h3 className="font-bold text-sm text-ink-900">Reset Demo Operational Data</h3>
                <p className="text-xs text-ink-500">Restores all seeded road segments, stock levels, vehicles, and demo shipments</p>
              </div>
            </div>
            <p className="text-xs text-ink-600">
              Useful for re-testing the operational pipeline from clean initial state.
            </p>
          </div>

          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="w-full py-2.5 bg-marigold-500 hover:bg-marigold-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" /> Reset Demo State
          </button>
        </div>
      </div>
    </div>
  );
};
