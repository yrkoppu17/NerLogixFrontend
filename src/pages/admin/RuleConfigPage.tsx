import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuleConfigs, updateRuleConfig, RuleConfigItem } from '../../api/admin';
import { Sliders, RefreshCw, Save } from 'lucide-react';

export const RuleConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const { data: rules, isLoading, refetch } = useQuery({
    queryKey: ['admin-rules'],
    queryFn: getRuleConfigs,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateRuleConfig(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-rules'] }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Rule Engine Threshold Config</h1>
          <p className="text-sm text-ink-600">Admin-editable thresholds for automated status and risk calculations</p>
        </div>
        <button onClick={() => refetch()} className="p-2 border border-mist-200 rounded-xl hover:bg-mist-100 text-ink-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-ink-600">Loading rule configurations...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-mist-200 divide-y divide-mist-100 shadow-sm">
          {rules?.map((rule: RuleConfigItem) => (
            <div key={rule.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-river-600" />
                  <span className="font-bold text-sm font-mono text-ink-900">{rule.configKey}</span>
                </div>
                <p className="text-xs text-ink-600">{rule.description}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={editingValues[rule.configKey] ?? rule.configValue}
                  onChange={(e) => setEditingValues({ ...editingValues, [rule.configKey]: e.target.value })}
                  className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm bg-white font-mono text-ink-900 w-full sm:w-48"
                />
                <button
                  onClick={() => updateMutation.mutate({ key: rule.configKey, value: editingValues[rule.configKey] ?? rule.configValue })}
                  disabled={updateMutation.isPending}
                  className="px-3 py-1.5 bg-tea-500 hover:bg-tea-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
