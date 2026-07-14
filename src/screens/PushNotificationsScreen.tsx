import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, History, Users, Handshake, Globe, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PushNotificationsScreenProps {
  onNavigate: (route: string) => void;
}

interface NotificationRow {
  id: string;
  recipient_type: string;
  recipient_id: string | null;
  title: string;
  description: string;
  type: string;
  link: string | null;
  created_at: string;
}

export const PushNotificationsScreen: React.FC<PushNotificationsScreenProps> = ({ onNavigate: _onNavigate }) => {
  const [recipientType, setRecipientType] = useState<'all_users' | 'all_partners' | 'all'>('all_users');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<NotificationRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('recipient_type', ['all_users', 'all_partners', 'all', 'push'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load notification history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter both title and description.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        recipient_type: recipientType,
        recipient_id: null,
        title: title.trim(),
        description: description.trim(),
        type: 'push',
        link: link.trim() || null,
        is_read: false,
      };

      const { error } = await supabase.from('notifications').insert([payload]);

      if (error) {
        throw error;
      }

      setSuccessMsg(`Notification successfully pushed to ${
        recipientType === 'all_users' ? 'All Customers' :
        recipientType === 'all_partners' ? 'All Delivery Partners' : 'All Customers & Partners'
      }!`);
      setTitle('');
      setDescription('');
      setLink('');
      loadHistory();
    } catch (err: any) {
      console.error('Failed to send push notification:', err);
      setErrorMsg(err.message || 'Error sending push notification.');
    } finally {
      setSending(false);
    }
  };

  const getRecipientBadge = (type: string) => {
    switch (type) {
      case 'all_users':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary flex items-center gap-1"><Users className="w-3 h-3" /> All Customers</span>;
      case 'all_partners':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary flex items-center gap-1"><Handshake className="w-3 h-3" /> All Partners</span>;
      case 'all':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-tertiary-container text-on-tertiary-container flex items-center gap-1"><Globe className="w-3 h-3" /> All Users & Partners</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant">{type}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-primary" />
            Push Notification Center
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Broadcast instant notifications and alerts across the PWA and Partner Portal in bulk.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-1 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
          <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Compose Push Notification
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-error-container/40 border border-error/30 rounded-xl text-xs text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-primary-container/40 border border-primary/30 rounded-xl text-xs text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSendPush} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Target Audience
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientType('all_users')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    recipientType === 'all_users'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Users className="w-4 h-4" /> All Customers (PWA)
                  </span>
                  {recipientType === 'all_users' && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('all_partners')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    recipientType === 'all_partners'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Handshake className="w-4 h-4" /> All Delivery Partners
                  </span>
                  {recipientType === 'all_partners' && <CheckCircle2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('all')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    recipientType === 'all'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Globe className="w-4 h-4" /> All Customers & Partners
                  </span>
                  {recipientType === 'all' && <CheckCircle2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Notification Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Special Health Sale Live!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Description / Message *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g., Get up to 25% off on all cardiac & wellness formulations this weekend."
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Optional Target Route / Deep Link
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g., /search or /orders"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Push...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Bulk Push
                </>
              )}
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Broadcast History
            </h2>
            <button
              onClick={loadHistory}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading broadcast history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
              <Bell className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-sm font-semibold text-on-surface">No push notifications broadcast yet</p>
              <p className="text-xs max-w-sm mt-1">
                Compose and send your first bulk push notification from the panel on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-outline-variant/30 bg-surface/50 hover:bg-surface transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRecipientBadge(item.recipient_type)}
                      <span className="text-xs text-on-surface-variant">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-on-surface pt-1">{item.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                    {item.link && (
                      <p className="text-[11px] text-primary pt-0.5 font-mono">Link: {item.link}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
