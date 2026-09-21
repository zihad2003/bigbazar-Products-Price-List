import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Clock, ShoppingBag, X, RefreshCw, ChevronRight, User } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';

export default function AdminConversations() {
  const [stats, setStats] = useState({ active_now: 0, today_total: 0 });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchStats = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/conversations/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (_) {}
  };

  const fetchConversations = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/conversations?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    fetchConversations();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const openConversationModal = async (conv) => {
    setSelectedConversation(conv);
    setLoadingMessages(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/conversations/${conv.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch (_) {}
    finally { setLoadingMessages(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('bn-BD', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-5 max-w-6xl pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <MessageSquare size={18} className="text-[#ce112d]" />
            AI Chat <span className="text-[#ce112d]">Conversations</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Live customer AI interactions and message logs</p>
        </div>

        <button
          onClick={() => { fetchStats(); fetchConversations(); }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#121215] border border-white/10 text-xs font-semibold text-zinc-400 hover:border-[#ce112d]/40 hover:text-white transition-colors self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-[#121215] border-t-2 border-t-emerald-500 px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-500">Active now (5m)</p>
            <p className="text-base font-semibold text-emerald-400 flex items-center gap-2 mt-0.5">
              {stats.active_now}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
          <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Users size={14} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#121215] border-t-2 border-t-[#ce112d] px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-500">Conversations today</p>
            <p className="text-base font-semibold text-white mt-0.5">{stats.today_total}</p>
          </div>
          <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[#ce112d] shrink-0">
            <Clock size={14} />
          </div>
        </div>
      </div>

      {/* Conversations Table / List */}
      <div className="bg-[#121215] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">Recent conversations</span>
          <span className="text-[11px] text-zinc-500">Top {conversations.length} threads</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No AI conversations recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => openConversationModal(conv)}
                className="p-3 hover:bg-white/[0.02] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2 group"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <User size={13} className="text-zinc-500" />
                      {conv.user_name || 'Guest Customer'}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Session: {conv.session_id ? conv.session_id.substring(0, 14) + '...' : ''}
                    </span>
                    {conv.has_order && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <ShoppingBag size={10} /> Order Created
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-1">
                    "{conv.last_message || 'No message content'}"
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-zinc-500">
                  <span>{conv.message_count || 0} msgs</span>
                  <span>{formatDate(conv.updated_at)}</span>
                  <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message History Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1050] flex items-center justify-center p-4">
          <div className="bg-[#0e0e11] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-3 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User size={15} className="text-[#ce112d]" />
                  {selectedConversation.user_name || 'Guest Visitor'}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  ID: {selectedConversation.id} • {formatDate(selectedConversation.updated_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {loadingMessages ? (
                <div className="py-10 text-center text-zinc-500">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={18} />
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-10 text-center text-zinc-500">No messages found for this thread.</div>
              ) : (
                messages.map(m => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                      <span className="text-[10px] text-zinc-600 font-mono px-1">
                        {isUser ? 'Customer' : 'BigBazar AI'} • {formatDate(m.created_at)}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg leading-relaxed ${
                          isUser
                            ? 'bg-[#ce112d] text-white rounded-br-sm'
                            : 'bg-zinc-900 text-zinc-200 border border-white/10 rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
