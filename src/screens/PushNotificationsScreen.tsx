import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, History, Users, Handshake, Globe, Loader2, AlertCircle, Settings, CalendarClock, Zap, Clock, Repeat, Trash2, Power, PowerOff } from 'lucide-react';
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

interface Campaign {
  id: string;
  name: string;
  audience: string;
  title: string;
  description: string;
  link: string | null;
  loop_type: string;
  send_time: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

export const PushNotificationsScreen: React.FC<PushNotificationsScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<'quick' | 'campaign' | 'settings'>('quick');

  // Quick Push Form State
  const [recipientType, setRecipientType] = useState<'all_users' | 'all_partners' | 'all'>('all_users');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignAudience, setCampaignAudience] = useState<'all_users' | 'all_partners' | 'all'>('all_users');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignLink, setCampaignLink] = useState('');
  const [campaignLoopType, setCampaignLoopType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [campaignSendTime, setCampaignSendTime] = useState('09:00');

  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<NotificationRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Settings State
  const [refillEnabled, setRefillEnabled] = useState(true);
  const [refillDays, setRefillDays] = useState(28);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  useEffect(() => {
    loadHistory();
    loadSettings();
    loadCampaigns();
  }, []);

  // Auto-clear success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (settingsSuccessMsg) {
      const timer = setTimeout(() => setSettingsSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [settingsSuccessMsg]);

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

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').in('key', ['refill_reminders_enabled', 'refill_reminder_days']);
    if (data) {
      const enabledSetting = data.find((s) => s.key === 'refill_reminders_enabled');
      const delaySetting = data.find((s) => s.key === 'refill_reminder_days');
      if (enabledSetting) setRefillEnabled(enabledSetting.value === 'true');
      if (delaySetting) setRefillDays(Number(delaySetting.value));
    }
  };

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      await supabase.from('app_settings').upsert([
        { key: 'refill_reminders_enabled', value: refillEnabled ? 'true' : 'false', updated_at: new Date().toISOString() },
        { key: 'refill_reminder_days', value: refillDays.toString(), updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });
      setSettingsSuccessMsg('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings', err);
    }
    setSavingSettings(false);
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please fill out all required fields.');
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
      if (error) throw error;

      setSuccessMsg(`Notification pushed to ${
        recipientType === 'all_users' ? 'All Customers' :
        recipientType === 'all_partners' ? 'All Partners' : 'Everyone'
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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !campaignTitle.trim() || !campaignDescription.trim()) {
      setErrorMsg('Please fill out all required campaign fields.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name: campaignName.trim(),
        audience: campaignAudience,
        title: campaignTitle.trim(),
        description: campaignDescription.trim(),
        link: campaignLink.trim() || null,
        loop_type: campaignLoopType,
        send_time: campaignSendTime,
        is_active: true,
      };

      const { error } = await supabase.from('campaigns').insert([payload]);
      if (error) throw error;

      // If it's a one-time campaign (loop_type 'none'), also send it immediately
      if (campaignLoopType === 'none') {
        await supabase.from('notifications').insert([{
          recipient_type: campaignAudience,
          recipient_id: null,
          title: campaignTitle.trim(),
          description: campaignDescription.trim(),
          type: 'campaign',
          link: campaignLink.trim() || null,
          is_read: false,
        }]);
      }

      setSuccessMsg(campaignLoopType === 'none'
        ? `Campaign "${campaignName}" sent immediately!`
        : `Campaign "${campaignName}" scheduled (${campaignLoopType} at ${campaignSendTime}).`
      );
      setCampaignName('');
      setCampaignTitle('');
      setCampaignDescription('');
      setCampaignLink('');
      setCampaignLoopType('none');
      setCampaignSendTime('09:00');
      loadHistory();
      loadCampaigns();
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setErrorMsg(err.message || 'Error creating campaign.');
    } finally {
      setSending(false);
    }
  };

  const toggleCampaignActive = async (id: string, currentActive: boolean) => {
    await supabase.from('campaigns').update({ is_active: !currentActive }).eq('id', id);
    loadCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    await supabase.from('campaigns').delete().eq('id', id);
    loadCampaigns();
  };

  const getRecipientBadge = (type: string) => {
    switch (type) {
      case 'all_users':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary flex items-center gap-1"><Users className="w-3 h-3" /> Customers</span>;
      case 'all_partners':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary flex items-center gap-1"><Handshake className="w-3 h-3" /> Partners</span>;
      case 'all':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-tertiary-container text-on-tertiary-container flex items-center gap-1"><Globe className="w-3 h-3" /> Everyone</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant">{type}</span>;
    }
  };

  const getLoopBadge = (loopType: string) => {
    const map: Record<string, { label: string; color: string }> = {
      'none': { label: 'One-time', color: 'bg-surface-variant text-on-surface-variant' },
      'daily': { label: 'Daily', color: 'bg-blue-100 text-blue-700' },
      'weekly': { label: 'Weekly', color: 'bg-purple-100 text-purple-700' },
      'monthly': { label: 'Monthly', color: 'bg-amber-100 text-amber-700' },
    };
    const info = map[loopType] || map['none'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${info.color} flex items-center gap-1`}><Repeat className="w-3 h-3" />{info.label}</span>;
  };

  // ─── Audience Selector Component ─────────────────────────────────────────────
  const AudienceSelector = ({ value, onChange }: { value: string; onChange: (v: any) => void }) => (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Target Audience</label>
      <div className="grid grid-cols-1 gap-2">
        {[
          { key: 'all_users', label: 'All Customers (PWA)', icon: <Users className="w-4 h-4" /> },
          { key: 'all_partners', label: 'All Delivery Partners', icon: <Handshake className="w-4 h-4" /> },
        ].map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              value === opt.key
                ? 'border-primary bg-primary/5 text-primary font-bold'
                : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="flex items-center gap-2 text-xs">{opt.icon} {opt.label}</span>
            {value === opt.key && <CheckCircle2 className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </div>
  );

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
            Broadcast instant notifications, create campaigns, and manage automated alerts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-6">
        <button
          onClick={() => { setActiveTab('quick'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'quick' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Zap className="w-4 h-4" /> Quick Push
        </button>
        <button
          onClick={() => { setActiveTab('campaign'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'campaign' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <CalendarClock className="w-4 h-4" /> Campaign Maker
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setSuccessMsg(null); setErrorMsg(null); }}
          className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Settings className="w-4 h-4" /> Automated Settings
        </button>
      </div>

      {/* ═══════════════════════ QUICK PUSH TAB ═══════════════════════ */}
      {activeTab === 'quick' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose Form */}
          <div className="lg:col-span-1 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Compose Push
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-error-container/40 border border-error/30 rounded-xl text-xs text-error flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-primary-container/40 border border-primary/30 rounded-xl text-xs text-primary flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendPush} className="space-y-4">
              <AudienceSelector value={recipientType} onChange={setRecipientType} />

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Special Health Sale Live!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Message *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="e.g., Get up to 25% off on all wellness formulations this weekend."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary resize-none" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Deep Link (optional)</label>
                <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                  placeholder="e.g., /search or /orders"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" />
              </div>

              <button type="submit" disabled={sending}
                className="w-full py-3 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Bulk Push</>}
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Broadcast History
              </h2>
              <button onClick={loadHistory} className="text-xs text-primary font-semibold hover:underline">Refresh</button>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
                <Bell className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-sm font-semibold text-on-surface">No notifications broadcast yet</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
                {history.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-outline-variant/30 bg-surface/50 hover:bg-surface transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRecipientBadge(item.recipient_type)}
                        {item.type === 'campaign' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">Campaign</span>}
                        <span className="text-xs text-on-surface-variant">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <h3 className="font-bold text-sm text-on-surface pt-1">{item.title}</h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                      {item.link && <p className="text-[11px] text-primary pt-0.5 font-mono">Link: {item.link}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ CAMPAIGN MAKER TAB ═══════════════════════ */}
      {activeTab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Form */}
          <div className="lg:col-span-1 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" /> New Campaign
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-error-container/40 border border-error/30 rounded-xl text-xs text-error flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-primary-container/40 border border-primary/30 rounded-xl text-xs text-primary flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Campaign Name *</label>
                <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Wellness Sale"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" required />
              </div>

              <AudienceSelector value={campaignAudience} onChange={setCampaignAudience} />

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Notification Title *</label>
                <input type="text" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g., 💊 Don't miss our Health Sale!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Message *</label>
                <textarea value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} rows={3}
                  placeholder="e.g., Flat 20% off on all BP & diabetes medicines. Order now!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary resize-none" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Deep Link</label>
                <input type="text" value={campaignLink} onChange={(e) => setCampaignLink(e.target.value)}
                  placeholder="e.g., /search"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" />
              </div>

              {/* Schedule Options */}
              <div className="pt-2 border-t border-outline-variant/20">
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  <Repeat className="w-3.5 h-3.5 inline mr-1" /> Schedule / Loop
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'none', label: 'Send Once' },
                    { key: 'daily', label: 'Daily' },
                    { key: 'weekly', label: 'Weekly' },
                    { key: 'monthly', label: 'Monthly' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCampaignLoopType(opt.key as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        campaignLoopType === opt.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {campaignLoopType !== 'none' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Send Time
                  </label>
                  <input
                    type="time"
                    value={campaignSendTime}
                    onChange={(e) => setCampaignSendTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">Based on server timezone (UTC). Checked every hour.</p>
                </div>
              )}

              <button type="submit" disabled={sending}
                className="w-full py-3 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><CalendarClock className="w-4 h-4" /> {campaignLoopType === 'none' ? 'Send Campaign Now' : 'Schedule Campaign'}</>}
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Broadcast History
              </h2>
              <button onClick={loadHistory} className="text-xs text-primary font-semibold hover:underline">Refresh</button>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs">Loading...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
                <Bell className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-sm font-semibold text-on-surface">No notifications broadcast yet</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
                {history.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-outline-variant/30 bg-surface/50 hover:bg-surface transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRecipientBadge(item.recipient_type)}
                        {item.type === 'campaign' && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">Campaign</span>}
                        <span className="text-xs text-on-surface-variant">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <h3 className="font-bold text-sm text-on-surface pt-1">{item.title}</h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
                      {item.link && <p className="text-[11px] text-primary pt-0.5 font-mono">Link: {item.link}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ AUTOMATED SETTINGS TAB ═══════════════════════ */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Refill Reminder Settings */}
          <div className="lg:col-span-1 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Refill Reminders
            </h2>

            {settingsSuccessMsg && (
              <div className="mb-4 p-3 bg-primary-container/40 border border-primary/30 rounded-xl text-xs text-primary flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>{settingsSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-on-surface">Enable Reminders</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Auto-remind users to refill their medicines.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={refillEnabled} onChange={(e) => setRefillEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {refillEnabled && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Delay (Days)</label>
                  <p className="text-[11px] text-on-surface-variant mb-2">Days after last order to trigger the reminder.</p>
                  <input type="number" min="1" max="365" value={refillDays} onChange={(e) => setRefillDays(parseInt(e.target.value) || 28)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>
              )}

              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="w-full py-3 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>

          {/* Right: Active Campaigns Manager */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" /> Active Campaigns
              </h2>
              <button onClick={loadCampaigns} className="text-xs text-primary font-semibold hover:underline">Refresh</button>
            </div>

            {loadingCampaigns ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-xs">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-on-surface-variant border border-dashed border-outline-variant/50 rounded-xl">
                <CalendarClock className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-sm font-semibold text-on-surface">No campaigns created yet</p>
                <p className="text-xs mt-1">Go to the Campaign Maker tab to create your first scheduled or one-time campaign.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
                {campaigns.map((c) => (
                  <div key={c.id} className={`p-4 rounded-xl border transition-colors ${c.is_active ? 'border-outline-variant/30 bg-surface/50 hover:bg-surface' : 'border-outline-variant/20 bg-surface-variant/20 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-on-surface truncate">{c.name}</span>
                          {getRecipientBadge(c.audience)}
                          {getLoopBadge(c.loop_type)}
                          {!c.is_active && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-error/10 text-error">Paused</span>}
                        </div>
                        <h4 className="text-xs font-semibold text-on-surface">{c.title}</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed truncate">{c.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant pt-1">
                          {c.loop_type !== 'none' && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.send_time}</span>}
                          {c.last_sent_at && <span>Last sent: {new Date(c.last_sent_at).toLocaleString()}</span>}
                          <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleCampaignActive(c.id, c.is_active)}
                          title={c.is_active ? 'Pause Campaign' : 'Resume Campaign'}
                          className={`p-2 rounded-lg transition-colors ${c.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-primary hover:bg-primary/10'}`}
                        >
                          {c.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteCampaign(c.id)}
                          title="Delete Campaign"
                          className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
