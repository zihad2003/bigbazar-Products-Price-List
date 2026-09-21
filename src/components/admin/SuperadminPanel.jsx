import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';

export default function SuperadminPanel() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState(null); // { type: 'ok' | 'err', text: string }

  const showFlash = (type, text) => {
    setFlash({ type, text });
    window.setTimeout(() => setFlash(null), 4000);
  };

  const fetchManagers = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setManagers(data.data || []);
      } else {
        showFlash('err', data.error || 'Failed to fetch managers');
      }
    } catch (err) {
      showFlash('err', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showFlash('err', 'Fill in all fields');
      return;
    }
    setIsSubmitting(true);

    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('ok', 'Admin created successfully');
        setEmail('');
        setPassword('');
        fetchManagers();
      } else {
        showFlash('err', data.error || 'Failed to create admin');
      }
    } catch (err) {
      showFlash('err', 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this admin? They will instantly lose access.')) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/managers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('ok', 'Admin removed');
        fetchManagers();
      } else {
        showFlash('err', data.error || 'Failed to delete admin');
      }
    } catch (err) {
      showFlash('err', 'Network error');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl pb-20">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-emerald-500" size={18} />
          Superadmin <span className="text-emerald-500">Panel</span>
        </h2>
        <p className="text-zinc-500 text-xs mt-0.5">
          Manage backend administrators. Only you have access to this screen.
        </p>
      </div>

      {flash && (
        <div
          className={`rounded-lg px-3 py-2.5 text-sm font-medium border ${
            flash.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <div className="bg-[#121215] border border-white/10 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Plus size={15} className="text-emerald-500" /> Add Admin
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="Strong password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Create Admin'}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-[#121215] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Active administrators</h3>
            </div>

            {loading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">Loading...</div>
            ) : managers.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No administrators found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {managers.map(m => (
                  <div key={m.id} className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${m.role === 'superadmin' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                        {m.role === 'superadmin' ? <ShieldAlert size={16} /> : <Shield size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{m.email}</p>
                        <p className="text-xs text-zinc-500 capitalize">{m.role}</p>
                      </div>
                    </div>
                    {m.role !== 'superadmin' && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-zinc-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove Admin"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
