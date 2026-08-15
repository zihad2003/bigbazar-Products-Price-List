import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Clock, ShoppingBag, Eye, X, RefreshCw, CheckCircle2, ChevronRight, User } from 'lucide-react';
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
    const interval = setInterval(fetchStats, 30000);
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
    <div className="space-y-6 max-w-6xl pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="text-[#ce112d]" />
            AI Chat <span className="text-[#ce112d]">Conversations</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Live customer AI interactions and message logs</p>
        </div>

        <button
          onClick={() => { fetchStats(); fetchConversations(); }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 rounded-xl transition-all self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Now (Last 5m)</p>
            <h3 className="text-3xl font-black text-emerald-400 flex items-center gap-2">
              {stats.active_now}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Conversations Today</p>
            <h3 className="text-3xl font-black text-white">{stats.today_total}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ce112d]/10 border border-[#ce112d]/20 flex items-center justify-center text-[#ce112d]">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Conversations Table / List */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Recent Conversations</span>
          <span className="text-xs text-zinc-500">Showing top {conversations.length} threads</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            No AI conversations recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => openConversationModal(conv)}
                className="p-4 hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <User size={14} className="text-zinc-400" />
                      {conv.user_name || 'Guest Customer'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Session: {conv.session_id ? conv.session_id.substring(0, 14) + '...' : ''}
                    </span>
                    {conv.has_order && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <ShoppingBag size={10} /> Order Created
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-1 italic">
                    "{conv.last_message || 'No message content'}"
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-400">
                  <span>{conv.message_count || 0} msgs</span>
                  <span>{formatDate(conv.updated_at)}</span>
                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message History Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1050] flex items-center justify-center p-4">
          <div className="bg-[#0e0e11] border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User size={16} className="text-[#ce112d]" />
                  {selectedConversation.user_name || 'Guest Visitor'}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  ID: {selectedConversation.id} • {formatDate(selectedConversation.updated_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs md:text-sm">
              {loadingMessages ? (
                <div className="py-12 text-center text-zinc-500">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">No messages found for this thread.</div>
              ) : (
                messages.map(m => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                      <span className="text-[10px] text-zinc-500 font-mono px-1">
                        {isUser ? 'Customer' : 'BigBazar AI'} • {formatDate(m.created_at)}
                      </span>
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed ${
                          isUser
                            ? 'bg-[#ce112d] text-white rounded-br-none'
                            : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none'
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
