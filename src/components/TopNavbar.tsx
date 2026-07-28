import React, { useState, useEffect } from 'react';
import { Bell, Menu, LogOut, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TopNavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onNavigate, onToggleMobileSidebar }) => {
  const { adminProfile, partnerProfile, role, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const name = role === 'admin' ? adminProfile?.name : partnerProfile?.name;
  const initial = name?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [role, partnerProfile]);

  const loadNotifications = async () => {
    try {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(15);
      
      if (role === 'admin') {
        query = query.in('recipient_type', ['admin', 'all']);
      } else if (role === 'partner') {
        query = query.or(`recipient_type.in.(partner,all_partners,all),recipient_id.eq.${partnerProfile?.id || 'none'}`);
      } else {
        return;
      }

      const { data, error } = await query;
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching admin/partner notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new Event('admin-refresh'));
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all partners
      const { data: partners } = await supabase.from('partners').select('*');
      if (!partners || partners.length === 0) {
        alert('No partners found to export.');
        setExporting(false);
        return;
      }

      // Fetch all delivered orders with partner info
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total, status, user_id, assigned_partner_id')
        .eq('status', 'Delivered');

      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const partner of partners) {
        const partnerOrders = (orders || []).filter(o => o.assigned_partner_id === partner.id);
        const margin = partner.margin_share || 0;

        const csvHeader = 'Order ID,Date,Amount (₹),Revenue (₹),Customer ID,Status\n';
        const csvRows = partnerOrders.map(o => {
          const revenue = ((o.total || 0) * margin / 100).toFixed(2);
          const date = new Date(o.created_at).toLocaleDateString('en-IN');
          return `${o.id},${date},${o.total},${revenue},${o.user_id},${o.status}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        const filename = `${partner.name.replace(/[^a-zA-Z0-9]/g, '_')}_orders.csv`;
        zip.file(filename, csvContent);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medfield_partner_reports_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Check console for details.');
    }
    setExporting(false);
  };

  return (
    <header className="flex justify-between items-center w-full h-16 px-4 sm:px-6 sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-primary p-1"
          onClick={onToggleMobileSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="text-lg sm:text-xl font-semibold text-primary tracking-tight whitespace-nowrap truncate">
          MedField Portal
        </div>
      </div>

      <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3">
        {/* Action Buttons */}
        {role === 'admin' && (
          <>
            <button
              onClick={handleRefresh}
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="hidden sm:flex px-4 py-2 text-on-surface-variant border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-variant transition-colors items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </>
        )}

        {/* Icon Buttons */}
        <div className="flex items-center gap-1 text-on-surface-variant ml-2 sm:ml-3 border-l border-outline-variant pl-2 sm:pl-3 relative">
          <div className="relative">
            <button 
              onClick={() => setShowNotificationsModal(!showNotificationsModal)}
              className="p-2 hover:bg-surface-container rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-pulse"></span>
              )}
            </button>

            {showNotificationsModal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsModal(false)}></div>
                <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant py-3 z-50 flex flex-col max-h-[80vh] sm:max-h-[480px]">
                  <div className="px-4 pb-3 border-b border-outline-variant flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Notifications</h3>
                      <p className="text-[11px] text-on-surface-variant">
                        {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30 flex flex-col">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center text-on-surface-variant text-xs">
                        No recent alerts or notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            if (notif.link) {
                              if (notif.link.startsWith('/orders')) {
                                (window as any).pendingNotificationForOrder = notif;
                                onNavigate('/orders');
                              } else {
                                onNavigate(notif.link);
                              }
                              setShowNotificationsModal(false);
                            }
                          }}
                          className={`p-3.5 hover:bg-surface-container-low transition-colors flex items-start gap-3.5 border-b border-outline-variant/30 last:border-b-0 cursor-pointer ${
                            !notif.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            !notif.is_read ? 'bg-primary' : 'bg-transparent'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2">
                              <h4 className="text-xs font-bold text-on-surface truncate">{notif.title}</h4>
                              <span className="text-[10px] text-on-surface-variant flex-shrink-0 font-medium">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">{notif.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {role === 'admin' && (
                    <div className="pt-3 px-4 border-t border-outline-variant mt-1">
                      <button
                        onClick={() => {
                          setShowNotificationsModal(false);
                          onNavigate('/notifications');
                        }}
                        className="w-full py-2.5 px-3 text-center text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Open Push Notification Center</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full bg-surface-variant ml-2 flex-shrink-0 border border-outline-variant cursor-pointer flex items-center justify-center text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {initial}
            </div>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/30 mb-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{name}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{role}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/30 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
