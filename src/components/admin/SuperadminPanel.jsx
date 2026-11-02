import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, ShieldAlert, Mail, Bell } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';

export default function SuperadminPanel() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState(null); // { type: 'ok' | 'err', text: string }

  const [notifyEmails, setNotifyEmails] = useState([]);
  const [notifyLoading, setNotifyLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLabel, setNotifyLabel] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);

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

  const fetchNotifyEmails = async () => {
    setNotifyLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/order-notify-emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyEmails(data.data || []);
      } else {
        showFlash('err', data.error || 'Failed to load order notify list');
      }
    } catch (_) {
      showFlash('err', 'Network error loading order notify list');
    } finally {
      setNotifyLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchNotifyEmails();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showFlash('err', 'Google email and password are required');
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
        showFlash('ok', 'Admin invited. They must sign in with Google once to verify this email before password login works.');
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

  const handleAddNotifyEmail = async (e) => {
    e.preventDefault();
    if (!notifyEmail.trim()) {
      showFlash('err', 'Enter an email for order alerts');
      return;
    }
    setNotifySubmitting(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/order-notify-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: notifyEmail, label: notifyLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('ok', `Order alerts will go to ${data.data?.email || notifyEmail}`);
        setNotifyEmail('');
        setNotifyLabel('');
        fetchNotifyEmails();
      } else {
        showFlash('err', data.error || 'Failed to add email');
      }
    } catch (_) {
      showFlash('err', 'Network error');
    } finally {
      setNotifySubmitting(false);
    }
  };

  const handleRemoveNotifyEmail = async (id, address) => {
    if (!window.confirm(`Stop sending new-order emails to ${address}?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/order-notify-emails/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('ok', 'Removed from order alerts');
        fetchNotifyEmails();
      } else {
        showFlash('err', data.error || 'Failed to remove');
      }
    } catch (_) {
      showFlash('err', 'Network error');
    }
  };

  const addManagerToNotify = async (managerEmail) => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/order-notify-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: managerEmail, label: 'Admin' }),
      });
      const data = await res.json();
      if (res.ok) {
        showFlash('ok', `${managerEmail} will get order emails`);
        fetchNotifyEmails();
      } else {
        showFlash('err', data.error || 'Could not add');
      }
    } catch (_) {
      showFlash('err', 'Network error');
    }
  };

  const notifySet = new Set(notifyEmails.map((r) => String(r.email || '').toLowerCase()));

  return (
    <div className="space-y-5 max-w-4xl pb-20">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-emerald-500" size={18} />
          Superadmin <span className="text-emerald-500">Panel</span>
        </h2>
        <p className="text-zinc-500 text-xs mt-0.5">
          Add administrators by their <strong className="text-zinc-300">Google email</strong> and a backup password.
          A new admin stays <strong className="text-amber-400">Pending</strong> until they sign in with that exact
          Google account once. Password login only works after that.
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

      {/* Order place email recipients */}
      <div className="bg-[#121215] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-start gap-2.5">
          <Bell size={16} className="text-[#ce112d] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-white">Order place email alerts</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              When a customer places an order, SMTP alerts go only to emails on this list.
              Add any admin (or staff) email you want notified.
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <form onSubmit={handleAddNotifyEmail} className="md:col-span-1 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Email</label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50"
                placeholder="admin@gmail.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Label (optional)</label>
              <input
                type="text"
                value={notifyLabel}
                onChange={(e) => setNotifyLabel(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50"
                placeholder="Ops / Manager"
              />
            </div>
            <button
              type="submit"
              disabled={notifySubmitting}
              className="w-full h-9 bg-[#ce112d] hover:bg-[#b00e26] text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Mail size={13} />
              {notifySubmitting ? 'Adding...' : 'Add to order alerts'}
            </button>
          </form>

          <div className="md:col-span-2 rounded-lg border border-white/10 bg-black/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Recipients ({notifyEmails.length})
            </div>
            {notifyLoading ? (
              <div className="p-5 text-center text-zinc-500 text-sm">Loading...</div>
            ) : notifyEmails.length === 0 ? (
              <div className="p-5 text-center text-zinc-500 text-sm">
                No recipients yet. Add emails above, or they will seed from server env on first order.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifyEmails.map((row) => (
                  <div key={row.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{row.email}</p>
                      {row.label && <p className="text-[11px] text-zinc-500">{row.label}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNotifyEmail(row.id, row.email)}
                      className="text-zinc-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                      title="Remove from alerts"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <div className="bg-[#121215] border border-white/10 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Plus size={15} className="text-emerald-500" /> Add Admin
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Google email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="name@gmail.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 mb-1 block">Password (backup login)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50"
                  placeholder="At least 8 characters"
                  minLength={8}
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
                {managers.map(m => {
                  const onAlerts = notifySet.has(String(m.email || '').toLowerCase());
                  return (
                    <div key={m.id} className="p-3 flex items-center justify-between gap-2 hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 ${m.role === 'superadmin' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                          {m.role === 'superadmin' ? <ShieldAlert size={16} /> : <Shield size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{m.email}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
                            <span className="capitalize">{m.role}</span>
                            {m.email_verified_at ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                Verified
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                title="Has not signed in with Google yet. Password login is blocked."
                              >
                                Pending verification
                              </span>
                            )}
                            {onAlerts && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ce112d]/10 text-[#ce112d] border border-[#ce112d]/25">
                                Order alerts
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!onAlerts && (
                          <button
                            type="button"
                            onClick={() => addManagerToNotify(m.email)}
                            className="text-[10px] font-semibold px-2 py-1.5 rounded-lg border border-[#ce112d]/30 text-[#ce112d] hover:bg-[#ce112d]/10 transition-colors"
                            title="Send this admin new-order emails"
                          >
                            + Alerts
                          </button>
                        )}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
