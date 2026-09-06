import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Mail, Phone, Calendar } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          res.status === 404
            ? 'Users API not deployed yet. Push/redeploy the latest backend, then refresh.'
            : `Invalid server response (${res.status}).`
        );
      }
      if (!res.ok) throw new Error(data.error || `Failed to load users (${res.status})`);
      setUsers(data.data || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Users className="text-[#ce112d]" size={24} />
            Signed-in <span className="text-[#ce112d]">Users</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">
            Google account customers. In-app product alerts go to these users.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-[11px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#ce112d]/20 to-transparent border border-[#ce112d]/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Google Users</p>
          <p className="text-4xl font-black text-white mt-2 tabular-nums">{count}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Shown</p>
          <p className="text-4xl font-black text-zinc-200 mt-2 tabular-nums">{users.length}</p>
          <p className="text-[10px] text-zinc-600 mt-1">Max 500 most recent</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#ce112d] rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          No Google users yet. They appear here after signing in on /account.
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 overflow-hidden bg-[#0d0d10]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#ce112d]/20 text-[#ce112d] flex items-center justify-center text-xs font-black shrink-0">
                            {(u.name || '?')[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{u.name || '—'}</p>
                          <p className="text-[10px] text-zinc-600 truncate font-mono">{u.id?.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-300 flex items-center gap-1.5 truncate">
                          <Mail size={12} className="text-zinc-600 shrink-0" />
                          {u.email || '—'}
                        </p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                          <Phone size={12} className="text-zinc-600 shrink-0" />
                          {u.phone || 'No phone'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={12} className="text-zinc-600" />
                        {formatDate(u.created_at)}
                      </p>
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
}
