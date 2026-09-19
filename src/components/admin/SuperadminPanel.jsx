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
    <div className="space-y-6 max-w-4xl pb-20">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="text-emerald-500" size={24} />
          Superadmin <span className="text-emerald-500">Panel</span>
        </h2>
        <p className="text-zinc-500 text-xs mt-1 font-medium">
          Manage backend administrators. Only you have access to this screen.
        </p>
      </div>

      {flash && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            flash.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Plus size={16} className="text-emerald-500" /> Add Admin
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 mb-1 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="Strong password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Create Admin'}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Administrators</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-zinc-500">Loading...</div>
            ) : managers.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No administrators found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {managers.map(m => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${m.role === 'superadmin' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                        {m.role === 'superadmin' ? <ShieldAlert size={18} /> : <Shield size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{m.email}</p>
                        <p className="text-xs text-zinc-500 capitalize">{m.role}</p>
                      </div>
                    </div>
                    {m.role !== 'superadmin' && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-zinc-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove Admin"
                      >
                        <Trash2 size={16} />
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
