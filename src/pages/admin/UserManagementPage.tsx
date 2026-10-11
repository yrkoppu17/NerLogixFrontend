import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUserRole, updateUserActive, resetUserPassword, UserItem } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Users, Key, RefreshCw } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getUsers(),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) => updateUserRole(userId, role),
    onSuccess: () => {
      success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const activeMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) => updateUserActive(userId, active),
    onSuccess: () => {
      success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const resetPassMutation = useMutation({
    mutationFn: ({ userId, pass }: { userId: number; pass: string }) => resetUserPassword(userId, pass),
    onSuccess: () => {
      success('Password reset successfully!');
      setSelectedUserId(null);
      setNewPassword('');
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">User & Access Management</h1>
          <p className="text-sm text-ink-600">Assign roles, manage active status, and reset credentials</p>
        </div>
        <button onClick={() => refetch()} className="p-2 border border-mist-200 rounded-xl hover:bg-mist-100 text-ink-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-ink-600">Loading user list...</div>
      ) : isError ? (
        <div className="py-12 text-center text-rust-600">
          {getErrorMessage(queryError)} <button onClick={() => refetch()} className="underline ml-2">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                  <th className="p-4">User Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {data?.content.map((u: UserItem) => (
                  <tr key={u.id} className="hover:bg-mist-50">
                    <td className="p-4 font-semibold text-ink-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-river-600" /> {u.name}
                    </td>
                    <td className="p-4 text-ink-600 font-mono text-xs">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        className="px-2 py-1 border border-mist-200 rounded text-xs bg-white text-ink-900 font-bold"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => activeMutation.mutate({ userId: u.id, active: !u.active })}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.active ? 'bg-tea-100 text-tea-600' : 'bg-rust-100 text-rust-600'
                        }`}
                      >
                        {u.active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                        className="px-3 py-1 border border-mist-200 hover:bg-mist-100 text-ink-700 rounded-lg text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Key className="w-3 h-3" /> Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reset Password Modal / Form */}
          {selectedUserId && (
            <div className="p-4 bg-mist-50 border-t border-mist-200 flex items-center gap-4">
              <span className="text-xs font-semibold text-ink-700">Set New Password:</span>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm bg-white"
              />
              <button
                onClick={() => resetPassMutation.mutate({ userId: selectedUserId, pass: newPassword })}
                disabled={!newPassword || resetPassMutation.isPending}
                className="px-4 py-1.5 bg-river-600 text-white font-bold rounded-lg text-xs hover:bg-river-700"
              >
                Save
              </button>
              <button
                onClick={() => setSelectedUserId(null)}
                className="px-3 py-1.5 border border-mist-300 text-ink-600 rounded-lg text-xs hover:bg-mist-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
