import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/axios';
import { Lock, Globe, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Emergency Mode form (Moderator/Admin)
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false);
  const [emergencyMsg, setEmergencyMsg] = useState<string | null>(null);

  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLanguage(user.language);
    }
  }, [user]);

  useEffect(() => {
    if (isModeratorOrAdmin) {
      api.get<{ emergencyMode: boolean }>('/settings/emergency')
        .then((res) => setEmergencyMode(res.data.emergencyMode))
        .catch((err) => console.error(err));
    }
  }, [isModeratorOrAdmin]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile({ name, language });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to change password.';
      setPasswordMsg({ type: 'error', text: msg || 'Failed to change password.' });
    }
  };

  const handleEmergencyToggle = async () => {
    setEmergencyMsg(null);
    const nextState = !emergencyMode;
    try {
      const res = await api.post('/settings/emergency', { enabled: nextState });
      setEmergencyMode(res.data.emergencyMode);
      setEmergencyMsg(`Emergency Mode ${nextState ? 'ENABLED' : 'DISABLED'}`);
    } catch {
      setEmergencyMsg('Failed to update Emergency Mode');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Account & System Settings</h1>
        <p className="text-sm text-ink-600">Manage your language preferences, password, and operational status</p>
      </div>

      {/* User Preferences Card */}
      <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
          <Globe className="w-5 h-5 text-river-600" />
          <h2 className="text-lg font-bold text-ink-900 font-heading">User Profile & Language</h2>
        </div>

        {profileMsg && (
          <div className={`p-3 rounded-lg text-xs font-medium ${profileMsg.type === 'success' ? 'bg-tea-100 text-tea-600' : 'bg-rust-100 text-rust-600'}`}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Preferred Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
              >
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="as">Assamese (as)</option>
                <option value="bn">Bengali (bn)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
            >
              Save Profile Settings
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
          <Lock className="w-5 h-5 text-river-600" />
          <h2 className="text-lg font-bold text-ink-900 font-heading">Change Password</h2>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-lg text-xs font-medium ${passwordMsg.type === 'success' ? 'bg-tea-100 text-tea-600' : 'bg-rust-100 text-rust-600'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Emergency Mode Settings (Moderators & Admins) */}
      {isModeratorOrAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
            <ShieldAlert className="w-5 h-5 text-rust-600" />
            <h2 className="text-lg font-bold text-ink-900 font-heading">System Emergency Mode</h2>
          </div>

          <p className="text-xs text-ink-600">
            Emergency mode forces route planner to use ONLY open segments, weights risk factors 4x higher, and prioritizes hospital / depot logistics across all dashboards.
          </p>

          {emergencyMsg && (
            <div className="p-3 bg-marigold-100 text-marigold-700 rounded-lg text-xs font-semibold">
              {emergencyMsg}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-mist-50 rounded-xl border border-mist-200">
            <div>
              <span className="text-sm font-bold text-ink-900">Emergency Protocol Status</span>
              <span className={`block text-xs font-semibold ${emergencyMode ? 'text-rust-600' : 'text-tea-600'}`}>
                {emergencyMode ? 'ACTIVE - High Risk Disaster Protocol' : 'Normal Operational Mode'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleEmergencyToggle}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                emergencyMode
                  ? 'bg-rust-600 hover:bg-rust-700 text-white'
                  : 'bg-river-600 hover:bg-river-700 text-white'
              }`}
            >
              {emergencyMode ? 'Disable Emergency Mode' : 'Enable Emergency Mode'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
