import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDrivers, DriverListItem } from '../api/dispatch';
import { getErrorMessage } from '../api/axios';
import { useRealtime } from '../hooks/useRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Truck, Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const DriversPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: drivers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['drivers', search],
    queryFn: () => getDrivers(search.trim() || undefined),
  });

  // Listen for real-time events to refresh driver status
  useRealtime((event) => {
    if (
      event === 'user.registered' ||
      event === 'vehicle.update' ||
      event === 'dispatch.assigned' ||
      event === 'dispatch.accepted' ||
      event === 'dispatch.declined' ||
      event === 'shipment.assigned' ||
      event === 'shipment.unassigned'
    ) {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-river-600" />
            Drivers
          </h1>
          <p className="text-sm text-ink-600">
            Registered commercial drivers, fleet assets, and active delivery assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search driver or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600 w-64"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 border border-mist-200 rounded-xl hover:bg-mist-100 text-ink-600"
            title="Refresh driver list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-ink-600">Loading registered drivers...</div>
      ) : isError ? (
        <div className="py-16 text-center text-rust-600 space-y-2">
          <p>{getErrorMessage(error)}</p>
          <button onClick={() => refetch()} className="text-xs font-semibold text-river-600 underline">
            Try again
          </button>
        </div>
      ) : !drivers || drivers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-mist-200 text-ink-500">
          <Users className="w-10 h-10 mx-auto text-ink-300 mb-2" />
          <p className="font-medium text-sm">No registered drivers found</p>
          <p className="text-xs text-ink-400 mt-1">
            Drivers who create an account or register a vehicle will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                  <th className="p-4">Driver Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Vehicle(s)</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Active Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {drivers.map((d: DriverListItem) => (
                  <tr key={d.id} className="hover:bg-mist-50 transition-colors">
                    <td className="p-4 font-semibold text-ink-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-river-100 text-river-700 flex items-center justify-center text-xs font-bold">
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      {d.name}
                    </td>
                    <td className="p-4 text-ink-600 font-mono text-xs">{d.email}</td>
                    <td className="p-4">
                      {d.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-tea-100 text-tea-700">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rust-100 text-rust-700">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {d.vehicleRegNos && d.vehicleRegNos.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.vehicleRegNos.map((reg) => (
                            <span
                              key={reg}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-mist-100 text-ink-800 font-mono text-xs font-semibold rounded"
                            >
                              <Truck className="w-3 h-3 text-river-600" />
                              {reg}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400 italic">No vehicle</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-ink-700">
                      {d.vehicleType ? (
                        <span className="px-2 py-0.5 bg-mist-50 border border-mist-200 rounded text-xs">
                          {d.vehicleType.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-medium text-ink-700">
                      {d.vehicleCapacityKg ? `${d.vehicleCapacityKg.toLocaleString()} kg` : '—'}
                    </td>
                    <td className="p-4">
                      {d.currentJob ? (
                        <span className="px-2 py-1 bg-marigold-100 text-marigold-800 font-mono font-semibold text-xs rounded border border-marigold-200">
                          {d.currentJob}
                        </span>
                      ) : (
                        <span className="text-xs text-tea-600 font-medium">Idle (Available)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
