import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/axios';
import { getMyVehicles, registerMyVehicle, deleteMyVehicle, Vehicle } from '../api/vehicles';
import { Lock, Globe, ShieldAlert, Truck, Plus, Trash2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

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

  // Add Vehicle modal/inline
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newRegNo, setNewRegNo] = useState('');
  const [newType, setNewType] = useState('LIGHT_TRUCK');
  const [newCapacity, setNewCapacity] = useState('3000');

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

  // My Vehicles query
  const { data: myVehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ['myVehicles'],
    queryFn: getMyVehicles,
  });

  const addVehicleMutation = useMutation({
    mutationFn: registerMyVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowAddVehicle(false);
      setNewRegNo('');
      setNewCapacity('3000');
      success('Vehicle registered successfully');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Failed to register vehicle');
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: deleteMyVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      success('Vehicle removed');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Failed to delete vehicle');
    },
  });

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

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNo.trim()) return;
    addVehicleMutation.mutate({
      regNo: newRegNo.trim().toUpperCase(),
      type: newType,
      capacityKg: parseFloat(newCapacity) || 2000,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Account & System Settings</h1>
        <p className="text-sm text-ink-600">Manage your profile, vehicles, security, and operational status</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">System Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="as">Assamese (অসমীয়া)</option>
                <option value="bn">Bengali (বাংলা)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* My Vehicles Card */}
      <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-mist-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-river-600" />
            <h2 className="text-lg font-bold text-ink-900 font-heading">My Registered Vehicles</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddVehicle(!showAddVehicle)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddVehicle ? 'Cancel' : 'Register Vehicle'}</span>
          </button>
        </div>

        {showAddVehicle && (
          <form onSubmit={handleAddVehicleSubmit} className="p-4 bg-mist-50 rounded-xl border border-mist-200 space-y-3">
            <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wide">Register a Commercial Vehicle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink-600 mb-1">Registration No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AS-01-AX-9922"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-xs uppercase font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-600 mb-1">Vehicle Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
                >
                  <option value="LIGHT_TRUCK">Light Commercial Truck</option>
                  <option value="HEAVY_TRUCK">Heavy Multi-Axle Truck</option>
                  <option value="MINIVAN">Cargo Minivan</option>
                  <option value="TANKER">Fuel / Liquid Tanker</option>
                  <option value="REFRIGERATED">Refrigerated (Cold Chain)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-600 mb-1">Payload Capacity (kg)</label>
                <input
                  type="number"
                  required
                  min="100"
                  max="50000"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={addVehicleMutation.isPending}
                className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {addVehicleMutation.isPending ? 'Registering...' : 'Register Vehicle'}
              </button>
            </div>
          </form>
        )}

        {isLoadingVehicles ? (
          <div className="text-center py-6 text-xs text-ink-400">Loading registered vehicles...</div>
        ) : myVehicles.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-mist-300 rounded-xl text-xs text-ink-500">
            <Truck className="w-8 h-8 text-mist-400 mx-auto mb-2" />
            <p className="font-semibold text-ink-700">No vehicles registered yet</p>
            <p className="mt-0.5">Register your vehicle to accept cargo dispatches across North Eastern corridors.</p>
          </div>
        ) : (
          <div className="divide-y divide-mist-100">
            {myVehicles.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-ink-900 tracking-wide">{v.regNo}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.status === 'ON_TRIP'
                        ? 'bg-river-100 text-river-800'
                        : v.status === 'IDLE'
                        ? 'bg-tea-100 text-tea-800'
                        : 'bg-mist-200 text-ink-600'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-xs text-ink-500">
                    Type: <span className="font-medium text-ink-700">{v.type.replace('_', ' ')}</span> • Capacity: <span className="font-medium text-ink-700">{v.capacityKg} kg</span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Remove vehicle"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to remove vehicle ${v.regNo}?`)) {
                      deleteVehicleMutation.mutate(v.id);
                    }
                  }}
                  disabled={v.status === 'ON_TRIP'}
                  className="p-2 text-rust-500 hover:text-rust-700 hover:bg-rust-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Change Card */}
      <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-mist-100 pb-3">
          <Lock className="w-5 h-5 text-river-600" />
          <h2 className="text-lg font-bold text-ink-900 font-heading">Security & Password</h2>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-lg text-xs font-medium ${passwordMsg.type === 'success' ? 'bg-tea-100 text-tea-600' : 'bg-rust-100 text-rust-600'}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                minLength={8}
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
