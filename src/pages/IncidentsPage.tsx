import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIncidents, resolveIncident, getIncidentEvents, getIncidentHistoryTimeline, Incident, IncidentEvent } from '../api/incidents';
import { getFieldReports, verifyFieldReport, rejectFieldReport, FieldReport } from '../api/fieldReports';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, RefreshCw, CheckCircle2, XCircle, FileText, Image as ImageIcon, History, MapPin } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'FIELD_REPORTS' | 'TIMELINE'>('INCIDENTS');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIncidentEvents, setSelectedIncidentEvents] = useState<{ incident: Incident; events: IncidentEvent[] } | null>(null);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  // Queries
  const { data: incidentsData, isLoading: loadingIncidents, refetch: refetchIncidents } = useQuery({
    queryKey: ['incidents', statusFilter, typeFilter, search],
    queryFn: () => getIncidents({ status: statusFilter, type: typeFilter, q: search }),
  });

  const { data: reportsData, isLoading: loadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['field-reports'],
    queryFn: () => getFieldReports({ size: 50 }),
  });

  const { data: timelineData, isLoading: loadingTimeline, refetch: refetchTimeline } = useQuery({
    queryKey: ['incident-timeline'],
    queryFn: () => getIncidentHistoryTimeline({ size: 50 }),
  });

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: (vars: { id: number; note?: string }) => verifyFieldReport(vars.id, vars.note),
    onSuccess: () => {
      success('Field report verified and incident created');
      queryClient.invalidateQueries({ queryKey: ['field-reports'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { id: number; note?: string }) => rejectFieldReport(vars.id, vars.note),
    onSuccess: () => {
      success('Field report rejected');
      queryClient.invalidateQueries({ queryKey: ['field-reports'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: (vars: { id: number; note?: string }) => resolveIncident(vars.id, vars.note),
    onSuccess: () => {
      success('Incident resolved');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-timeline'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const handleViewEvents = async (inc: Incident) => {
    try {
      const events = await getIncidentEvents(inc.id);
      setSelectedIncidentEvents({ incident: inc, events });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Incidents & Incident History Logs</h1>
          <p className="text-sm text-ink-600">Audit trail of disruptions, field report verifications, and route status history</p>
        </div>
        <button
          onClick={() => {
            refetchIncidents();
            refetchReports();
            refetchTimeline();
          }}
          className="p-2 border border-mist-200 rounded-lg hover:bg-mist-100 text-ink-600 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mist-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'INCIDENTS' ? 'border-river-600 text-river-600 font-bold' : 'border-transparent text-ink-600 hover:text-ink-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Active Incidents
        </button>
        <button
          onClick={() => setActiveTab('FIELD_REPORTS')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'FIELD_REPORTS' ? 'border-river-600 text-river-600 font-bold' : 'border-transparent text-ink-600 hover:text-ink-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Field Reports Queue
        </button>
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'TIMELINE' ? 'border-river-600 text-river-600 font-bold' : 'border-transparent text-ink-600 hover:text-ink-900'
          }`}
        >
          <History className="w-4 h-4" />
          Incident History Logs
        </button>
      </div>

      {/* Tab 1: Incidents */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-mist-200 flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search incident description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-river-600 w-60"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="REPORTED">REPORTED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
            >
              <option value="">All Incident Types</option>
              <option value="LANDSLIDE">LANDSLIDE</option>
              <option value="FLOOD">FLOOD</option>
              <option value="ROAD_DAMAGE">ROAD DAMAGE</option>
              <option value="BRIDGE_DAMAGE">BRIDGE DAMAGE</option>
              <option value="CONGESTION">CONGESTION</option>
              <option value="ACCIDENT">ACCIDENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          {/* Active Incident Hotspot Google Maps Overview */}
          <div className="mb-4">
            <GoogleMapEmbed
              query="Nagaon, Assam, India"
              zoom={9}
              height="220px"
              title="Corridor Incident Hotspot Overview (Google Maps View)"
            />
          </div>

          {loadingIncidents ? (
            <div className="text-center py-12 text-ink-600">Loading incidents...</div>
          ) : incidentsData?.content.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No incidents found.</div>
          ) : (
            <div className="space-y-4">
              {incidentsData?.content.map((inc) => (
                <div key={inc.id} className="bg-white p-5 rounded-xl border border-mist-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-river-700">INC-{inc.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        inc.status === 'VERIFIED' ? 'bg-rust-100 text-rust-600' :
                        inc.status === 'RESOLVED' ? 'bg-tea-100 text-tea-500' :
                        'bg-marigold-100 text-marigold-500'
                      }`}>
                        {inc.status}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-mist-100 text-ink-600 font-bold text-xs">
                        Severity {inc.severity}
                      </span>
                      <span className="text-xs text-ink-400 font-mono">Source: {inc.source}</span>
                    </div>
                    <span className="text-xs text-ink-400 font-mono">
                      {new Date(inc.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-ink-900 font-medium">{inc.description}</p>
                  <div className="text-xs text-ink-600 flex gap-4 font-mono">
                    <span>Segment: {inc.segmentName || 'N/A'}</span>
                    <span>District: {inc.districtName || 'N/A'}</span>
                    <span>Coords: {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-mist-100">
                    <button
                      onClick={() => setExpandedMapId(expandedMapId === `inc-${inc.id}` ? null : `inc-${inc.id}`)}
                      className="px-3 py-1 border border-mist-200 rounded text-xs font-medium text-ink-700 hover:bg-mist-100 flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-river-600" />
                      {expandedMapId === `inc-${inc.id}` ? 'Hide Map' : 'Google Maps View'}
                    </button>
                    <button
                      onClick={() => handleViewEvents(inc)}
                      className="px-3 py-1 border border-mist-200 rounded text-xs font-medium text-river-700 hover:bg-mist-100"
                    >
                      View Event Log
                    </button>
                    {isModeratorOrAdmin && inc.status !== 'RESOLVED' && (
                      <button
                        onClick={() => resolveMutation.mutate({ id: inc.id, note: 'Resolved by moderator' })}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1 bg-tea-500 hover:bg-tea-600 text-white rounded text-xs font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Incident
                      </button>
                    )}
                  </div>

                  {expandedMapId === `inc-${inc.id}` && (
                    <div className="pt-2">
                      <GoogleMapEmbed
                        lat={inc.lat}
                        lng={inc.lng}
                        zoom={14}
                        height="200px"
                        title={`Google Maps Location - INC-${inc.id} (${inc.type})`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Field Reports Queue */}
      {activeTab === 'FIELD_REPORTS' && (
        <div>
          {loadingReports ? (
            <div className="text-center py-12 text-ink-600">Loading field reports queue...</div>
          ) : reportsData?.content.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No field reports submitted.</div>
          ) : (
            <div className="space-y-4">
              {reportsData?.content.map((fr: FieldReport) => (
                <div key={fr.id} className="bg-white p-5 rounded-xl border border-mist-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-ink-600">REPORT-{fr.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        fr.status === 'VERIFIED' ? 'bg-tea-100 text-tea-500' :
                        fr.status === 'REJECTED' ? 'bg-rust-100 text-rust-600' :
                        'bg-marigold-100 text-marigold-500'
                      }`}>
                        {fr.status}
                      </span>
                      <span className="font-bold text-xs text-ink-900">{fr.type} (Sev {fr.severity})</span>
                    </div>
                    <span className="text-xs text-ink-400 font-mono">
                      {new Date(fr.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm text-ink-900">{fr.note || 'No description note provided.'}</p>
                  <div className="text-xs text-ink-600 font-mono">
                    Submitted by: {fr.user?.name || 'User'} | Coords: {fr.lat.toFixed(4)}, {fr.lng.toFixed(4)}
                  </div>

                  {fr.imageUrls && fr.imageUrls.length > 0 && (
                    <div className="flex gap-3 pt-2">
                      {fr.imageUrls.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(url)}
                          className="relative group rounded-lg overflow-hidden border border-mist-200"
                        >
                          <img src={url} alt="Field capture" className="w-20 h-20 object-cover" />
                          <div className="absolute inset-0 bg-ink-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isModeratorOrAdmin && fr.status === 'PENDING' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-mist-100">
                      <button
                        onClick={() => rejectMutation.mutate({ id: fr.id, note: 'Rejected by moderator' })}
                        className="px-3 py-1 border border-rust-100 text-rust-600 hover:bg-rust-100 rounded text-xs font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => verifyMutation.mutate({ id: fr.id, note: 'Verified by moderator' })}
                        className="px-3 py-1 bg-river-600 hover:bg-river-700 text-white rounded text-xs font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify & Create Incident
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Timeline History Logs */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white rounded-xl border border-mist-200 p-6">
          <h2 className="text-lg font-bold text-ink-900 mb-4 font-heading">Audit Log Timeline</h2>
          {loadingTimeline ? (
            <div className="text-center py-12 text-ink-600">Loading timeline history...</div>
          ) : timelineData?.content.length === 0 ? (
            <div className="text-center py-12 text-ink-400">No events logged yet.</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-mist-200 space-y-6">
              {timelineData?.content.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-river-600 border-2 border-white" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-river-700 font-mono">INC-{ev.incidentId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mist-100 text-ink-900">{ev.action}</span>
                      <span className="text-xs text-ink-400 font-mono">{new Date(ev.at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-ink-900">{ev.note}</p>
                    <div className="text-xs text-ink-400 font-mono">By: {ev.byUser?.name || 'System'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="max-w-2xl max-h-[85vh] p-2">
            <img src={selectedImage} alt="Full view" className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}

      {/* Incident Event Log Modal */}
      {selectedIncidentEvents && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-mist-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">
                Event History - INC-{selectedIncidentEvents.incident.id}
              </h2>
              <button onClick={() => setSelectedIncidentEvents(null)} className="text-ink-400 hover:text-ink-900 text-sm font-bold">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-mist-200 text-xs space-y-2">
              {selectedIncidentEvents.events.length === 0 ? (
                <div className="py-8 text-center text-ink-400">No events recorded.</div>
              ) : (
                selectedIncidentEvents.events.map((ev) => (
                  <div key={ev.id} className="py-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-river-700">{ev.action}</span>
                      <span className="text-ink-400 text-[10px]">{new Date(ev.at).toLocaleString()}</span>
                    </div>
                    <p className="text-ink-900 font-sans">{ev.note}</p>
                    <div className="text-ink-400 text-[10px]">By: {ev.byUser?.name || 'System'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
