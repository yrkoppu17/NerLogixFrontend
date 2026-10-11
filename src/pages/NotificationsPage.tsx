import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead, broadcastNotification, NotificationItem } from '../api/notifications';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bell, CheckCheck, RefreshCw, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [bEnTitle, setBEnTitle] = useState('');
  const [bEnMsg, setBEnMsg] = useState('');
  const [bHiTitle, setBHiTitle] = useState('');
  const [bHiMsg, setBHiMsg] = useState('');
  const [bAsTitle, setBAsTitle] = useState('');
  const [bAsMsg, setBAsMsg] = useState('');
  const [bBnTitle, setBBnTitle] = useState('');
  const [bBnMsg, setBBnMsg] = useState('');

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ size: 50 }),
  });

  const parseJsonText = (json: string): string => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (typeof parsed === 'object' && parsed !== null) {
        const lang = user?.language || 'en';
        return parsed[lang] || parsed.en || Object.values(parsed)[0] || String(json);
      }
      return String(parsed);
    } catch {
      return json;
    }
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const broadcastMutation = useMutation({
    mutationFn: (vars: { titles: Record<string, string>; messages: Record<string, string> }) =>
      broadcastNotification(vars.titles, vars.messages),
    onSuccess: () => {
      success('Notification broadcasted');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowBroadcastModal(false);
      resetBroadcastForm();
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const resetBroadcastForm = () => {
    setBEnTitle('');
    setBEnMsg('');
    setBHiTitle('');
    setBHiMsg('');
    setBAsTitle('');
    setBAsMsg('');
    setBBnTitle('');
    setBBnMsg('');
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    broadcastMutation.mutate({
      titles: {
        en: bEnTitle,
        hi: bHiTitle || bEnTitle,
        as: bAsTitle || bEnTitle,
        bn: bBnTitle || bEnTitle,
      },
      messages: {
        en: bEnMsg,
        hi: bHiMsg || bEnMsg,
        as: bAsMsg || bEnMsg,
        bn: bBnMsg || bEnMsg,
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">{t('notifications')}</h1>
          <p className="text-sm text-ink-600">Personalized logistical updates and system alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 border border-mist-200 rounded-lg hover:bg-mist-100 text-ink-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-3 py-2 border border-mist-200 hover:bg-mist-100 text-ink-900 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <CheckCheck className="w-4 h-4 text-tea-500" />
            {t('markAllRead')}
          </button>
          {isModeratorOrAdmin && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Send className="w-4 h-4" />
              Broadcast Notification
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-ink-600">Loading notifications...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rust-600">
          {getErrorMessage(queryError)} <button onClick={() => refetch()} className="underline ml-2">Retry</button>
        </div>
      ) : data?.content.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No notifications.</div>
      ) : (
        <div className="space-y-3">
          {data?.content.map((n: NotificationItem) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex items-start gap-4 ${
                n.readAt ? 'bg-white border-mist-200 opacity-80' : 'bg-river-100/30 border-river-600/30'
              }`}
            >
              <Bell className={`w-5 h-5 shrink-0 mt-0.5 ${n.readAt ? 'text-ink-400' : 'text-river-600'}`} />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-ink-900">{parseJsonText(n.title)}</h3>
                  <span className="text-xs text-ink-400 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-ink-600">{parseJsonText(n.message)}</p>
              </div>
              {!n.readAt && (
                <button
                  onClick={() => markReadMutation.mutate(n.id)}
                  className="px-2.5 py-1 text-[11px] font-medium border border-mist-200 hover:bg-mist-100 rounded text-river-700 shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mist-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">Broadcast Multilingual Notification</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcastSubmit} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">English Title & Message (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical weather advisory for NH-27"
                  value={bEnTitle}
                  onChange={(e) => setBEnTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm mb-2"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Heavy rainfall expected over next 24 hours."
                  value={bEnMsg}
                  onChange={(e) => setBEnMsg(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Hindi Variant (Optional - falls back to EN)</label>
                <input
                  type="text"
                  placeholder="शीर्षक (Hindi Title)"
                  value={bHiTitle}
                  onChange={(e) => setBHiTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm mb-2"
                />
                <textarea
                  rows={2}
                  placeholder="संदेश (Hindi Message)"
                  value={bHiMsg}
                  onChange={(e) => setBHiMsg(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Assamese Variant (Optional)</label>
                <input
                  type="text"
                  placeholder="শীৰ্ষক (Assamese Title)"
                  value={bAsTitle}
                  onChange={(e) => setBAsTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm mb-2"
                />
                <textarea
                  rows={2}
                  placeholder="বাৰ্তা (Assamese Message)"
                  value={bAsMsg}
                  onChange={(e) => setBAsMsg(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Bengali Variant (Optional)</label>
                <input
                  type="text"
                  placeholder="শিরোনাম (Bengali Title)"
                  value={bBnTitle}
                  onChange={(e) => setBBnTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm mb-2"
                />
                <textarea
                  rows={2}
                  placeholder="বার্তা (Bengali Message)"
                  value={bBnMsg}
                  onChange={(e) => setBBnMsg(e.target.value)}
                  className="w-full px-3 py-1.5 border border-mist-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-mist-200">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 border border-mist-200 rounded-lg text-sm font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
