import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDistrictWeatherList, logWeather, triggerDemoRain } from '../api/weather';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CloudRain, CloudLightning, Sun, Cloud, AlertCircle, Plus, Zap, CheckCircle2, MapPin } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const WeatherPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterState, setFilterState] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [expandedMapDistrictId, setExpandedMapDistrictId] = useState<number | null>(null);
  const [condition, setCondition] = useState<'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME'>('MODERATE');
  const [rainMm, setRainMm] = useState<string>('25');
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Admin Demo Rain Tool state
  const [demoDistrictId, setDemoDistrictId] = useState<number | null>(null);
  const [demoCondition, setDemoCondition] = useState<'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME'>('EXTREME');
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);

  const { data: weatherList = [], isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['weatherList'],
    queryFn: getDistrictWeatherList
  });

  const logMutation = useMutation({
    mutationFn: logWeather,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weatherList'] });
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      setIsLogModalOpen(false);
      setNote('');
      setSubmitError(null);
    },
    onError: (err: unknown) => {
      setSubmitError(getErrorMessage(err));
    }
  });

  const demoMutation = useMutation({
    mutationFn: triggerDemoRain,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['weatherList'] });
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      queryClient.invalidateQueries({ queryKey: ['roads'] });
      setDemoSuccess(`Triggered ${data.condition} rain on ${data.districtName}. Segment risk scores recomputed.`);
      setTimeout(() => setDemoSuccess(null), 15000);
    },
    onError: (err: unknown) => {
      setDemoSuccess(`Simulation failed: ${getErrorMessage(err)}`);
    }
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrictId) {
      setSubmitError('Please select a district');
      return;
    }
    logMutation.mutate({
      districtId: selectedDistrictId,
      condition,
      rainMm: rainMm ? parseFloat(rainMm) : undefined,
      note: note.trim()
    });
  };

  React.useEffect(() => {
    if (weatherList.length > 0 && !demoDistrictId) {
      setDemoDistrictId(weatherList[0].districtId);
    }
  }, [weatherList, demoDistrictId]);

  const handleDemoSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const targetDistrictId = demoDistrictId || (weatherList.length > 0 ? weatherList[0].districtId : null);
    if (!targetDistrictId) return;
    demoMutation.mutate({ districtId: targetDistrictId, condition: demoCondition });
  };

  const uniqueStates = Array.from(new Set(weatherList.map((w) => w.state))).filter(Boolean);
  const filteredList = filterState ? weatherList.filter((w) => w.state === filterState) : weatherList;

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'EXTREME':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rust-100 text-rust-600">
            <CloudLightning className="w-3.5 h-3.5" /> EXTREME
          </span>
        );
      case 'HEAVY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-marigold-100 text-marigold-500">
            <CloudRain className="w-3.5 h-3.5" /> HEAVY
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-600">
            <CloudRain className="w-3.5 h-3.5" /> MODERATE
          </span>
        );
      case 'LIGHT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-tea-100 text-tea-500">
            <Cloud className="w-3.5 h-3.5" /> LIGHT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-mist-100 text-ink-600">
            <Sun className="w-3.5 h-3.5 text-marigold-500" /> CLEAR / NONE
          </span>
        );
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink-900">District Weather & Condition Logs</h1>
          <p className="text-sm text-ink-600">
            Real-time weather monitoring across North Eastern districts driving rule-based corridor risk scores.
          </p>
        </div>

        <button
          onClick={() => {
            setIsLogModalOpen(true);
            if (weatherList.length > 0) setSelectedDistrictId(weatherList[0].districtId);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" /> Log Field Weather
        </button>
      </div>

      {/* Admin Demo Rain Tool Banner */}
      {isAdmin && (
        <div className="bg-river-100 border border-river-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-river-700 font-bold text-sm">
              <Zap className="w-4 h-4 text-river-600" />
              <span>Admin Demo Rain Tool (Rule Engine Simulation)</span>
            </div>
            {demoSuccess && (
              <span data-testid="demo-success" className="text-xs text-tea-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {demoSuccess}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={demoDistrictId || ''}
              onChange={(e) => setDemoDistrictId(Number(e.target.value))}
              className="text-xs p-2 rounded-lg border border-mist-200 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="">Select District to Rain On...</option>
              {weatherList.map((w) => (
                <option key={w.districtId} value={w.districtId}>
                  {w.districtName} ({w.state})
                </option>
              ))}
            </select>

            <select
              value={demoCondition}
              onChange={(e) => setDemoCondition(e.target.value as 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME')}
              className="text-xs p-2 rounded-lg border border-mist-200 bg-white text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="EXTREME">EXTREME (120mm / +30 risk pts)</option>
              <option value="HEAVY">HEAVY (75mm / +22 risk pts)</option>
              <option value="MODERATE">MODERATE (35mm / +12 risk pts)</option>
              <option value="LIGHT">LIGHT (10mm / +5 risk pts)</option>
              <option value="NONE">NONE (Clear)</option>
            </select>

            <button
              type="button"
              onClick={handleDemoSubmit}
              disabled={!demoDistrictId || demoMutation.isPending}
              className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {demoMutation.isPending ? 'Simulating...' : 'Trigger Rain Simulation'}
            </button>
          </div>
        </div>
      )}

      {/* State Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterState('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !filterState ? 'bg-river-600 text-white' : 'bg-white border border-mist-200 text-ink-600 hover:bg-mist-50'
          }`}
        >
          All States ({weatherList.length})
        </button>
        {uniqueStates.map((st) => (
          <button
            key={st}
            onClick={() => setFilterState(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterState === st ? 'bg-river-600 text-white' : 'bg-white border border-mist-200 text-ink-600 hover:bg-mist-50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Weather Cards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-ink-600">Loading district weather conditions...</div>
      ) : isError ? (
        <div className="p-8 text-center text-rust-600 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8" />
          <p>{getErrorMessage(queryError)}</p>
          <button onClick={() => refetch()} className="px-4 py-1.5 bg-river-600 text-white rounded-lg text-xs font-medium">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredList.map((w) => (
            <div key={w.districtId} className="bg-white border border-mist-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink-900 font-heading text-base">{w.districtName}</h3>
                  <p className="text-xs text-ink-400 font-mono">{w.state}</p>
                </div>
                {getConditionBadge(w.condition)}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-mist-200">
                <span className="text-ink-600">Rainfall (24h):</span>
                <span className="font-mono font-bold text-ink-900">{w.rainMm != null ? `${w.rainMm} mm` : '0 mm'}</span>
              </div>

              {w.note && <p className="text-xs text-ink-600 italic bg-mist-50 p-2 rounded border border-mist-200">"{w.note}"</p>}

              <div className="flex items-center justify-between text-[11px] text-ink-400 border-t border-mist-100 pt-2">
                <span className="bg-mist-100 px-1.5 py-0.5 rounded font-mono text-[10px] uppercase">{w.source}</span>
                <button
                  onClick={() => setExpandedMapDistrictId(expandedMapDistrictId === w.districtId ? null : w.districtId)}
                  className="text-river-600 hover:text-river-800 font-medium flex items-center gap-1 text-xs"
                >
                  <MapPin className="w-3 h-3" />
                  {expandedMapDistrictId === w.districtId ? 'Hide Map' : 'Google Maps'}
                </button>
                <span>{new Date(w.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {expandedMapDistrictId === w.districtId && (
                <div className="pt-2">
                  <GoogleMapEmbed
                    query={`${w.districtName}, ${w.state}, India`}
                    zoom={10}
                    height="160px"
                    title={`Google Maps - ${w.districtName}, ${w.state}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual Log Weather Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-mist-200 shadow-xl animate-in fade-in zoom-in duration-150">
            <h2 className="text-xl font-bold text-ink-900 font-heading">Log Weather Condition</h2>
            <p className="text-xs text-ink-600">
              Submit ground weather reports for your district. Works offline when network is disconnected.
            </p>

            {submitError && (
              <div className="p-3 bg-rust-100 text-rust-600 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">District</label>
                <select
                  value={selectedDistrictId || ''}
                  onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-mist-200 bg-mist-50 text-ink-900"
                >
                  {weatherList.map((w) => (
                    <option key={w.districtId} value={w.districtId}>
                      {w.districtName} ({w.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Condition</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NONE', 'LIGHT', 'MODERATE', 'HEAVY', 'EXTREME'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(c)}
                      className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                        condition === c
                          ? 'bg-river-600 text-white border-river-600 shadow-xs'
                          : 'border-mist-200 text-ink-600 hover:bg-mist-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Rainfall (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={rainMm}
                  onChange={(e) => setRainMm(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full text-xs p-2.5 rounded-lg border border-mist-200 bg-mist-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Notes / Observation</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Local observations (e.g. continuous rainfall over 4h, river level rising)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-mist-200 bg-mist-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-600 hover:bg-mist-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-river-600 hover:bg-river-700 text-white rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {logMutation.isPending ? 'Submitting...' : 'Submit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WeatherPage;
