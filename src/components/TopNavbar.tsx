import React, { useState } from 'react';
import { Bell, Menu, LogOut, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TopNavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleMobileSidebar }) => {
  const { adminProfile, partnerProfile, role, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const name = role === 'admin' ? adminProfile?.name : partnerProfile?.name;
  const initial = name?.charAt(0).toUpperCase() || 'U';

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
        <div className="flex items-center gap-1 text-on-surface-variant ml-2 sm:ml-3 border-l border-outline-variant pl-2 sm:pl-3">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
          </button>

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
