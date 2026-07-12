import React, { useState, useEffect } from 'react';
import { TrendingUp, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface DashboardScreenProps {
  onNavigate: (route: string) => void;
}

// Dynamic chart data will be set in state

interface RecentOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string;
  assigned_partner_id?: string | null;
  partners?: { margin_share: number } | { margin_share: number }[] | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | '12m'>('30d');
  const [stats, setStats] = useState({ 
    totalSales: { value: 0, change: '+0.0%', up: true }, 
    totalOrders: { value: 0, change: '+0.0%', up: true }, 
    totalUsers: { value: 0, change: '+0.0%', up: true }, 
    activePartners: { value: 0, change: '0.0%', up: true }
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [dynamicChartData, setDynamicChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  const loadDashboardData = async () => {
    setLoading(true);

    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    
    if (dateFilter === 'today') {
      currentStart.setHours(0,0,0,0);
      previousStart.setHours(0,0,0,0);
      previousStart.setDate(previousStart.getDate() - 1);
    } else if (dateFilter === '7d') {
      currentStart.setDate(now.getDate() - 7);
      previousStart.setDate(now.getDate() - 14);
    } else if (dateFilter === '30d') {
      currentStart.setDate(now.getDate() - 30);
      previousStart.setDate(now.getDate() - 60);
    } else if (dateFilter === '12m') {
      currentStart.setMonth(now.getMonth() - 12);
      previousStart.setMonth(now.getMonth() - 24);
    }

    // Get orders
    const { data: allOrders, error: orderError } = await (supabase
      .from('orders')
      .select('id, created_at, total, status, user_id, assigned_partner_id, partners(margin_share)')
      .gte('created_at', previousStart.toISOString())
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: RecentOrder[] | null; error: any }>);

    // Get profiles
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', previousStart.toISOString());

    // Get partners
    const { data: allPartners, error: partnerError } = await supabase
      .from('partners')
      .select('created_at, is_active')
      .gte('created_at', previousStart.toISOString());

    console.log("Dashboard Debug:");
    console.log("Orders:", allOrders, "Error:", orderError);
    console.log("Profiles:", allProfiles, "Error:", profileError);
    console.log("Partners:", allPartners, "Error:", partnerError);

    const orders = allOrders || [];
    const currentOrders = orders.filter(o => new Date(o.created_at) >= currentStart);
    const previousOrders = orders.filter(o => new Date(o.created_at) >= previousStart && new Date(o.created_at) < currentStart);

    const profiles = allProfiles || [];
    const currentProfiles = profiles.filter(p => new Date(p.created_at) >= currentStart);
    const previousProfiles = profiles.filter(p => new Date(p.created_at) >= previousStart && new Date(p.created_at) < currentStart);

    const partnersData = allPartners || [];
    const currentPartners = partnersData.filter(p => new Date(p.created_at) >= currentStart && p.is_active);
    const previousPartners = partnersData.filter(p => new Date(p.created_at) >= previousStart && new Date(p.created_at) < currentStart && p.is_active);

    const calcSales = (arr: any[]) => arr
      .filter(o => o.status === 'Delivered' || o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const currentSales = calcSales(currentOrders);
    const previousSales = calcSales(previousOrders);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? { change: '+100%', up: true } : { change: '0.0%', up: true };
      const percent = ((current - previous) / previous) * 100;
      return {
        change: `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`,
        up: percent >= 0
      };
    };

    setStats({
      totalSales: { value: currentSales, ...calculateChange(currentSales, previousSales) },
      totalOrders: { value: currentOrders.length, ...calculateChange(currentOrders.length, previousOrders.length) },
      totalUsers: { value: currentProfiles.length, ...calculateChange(currentProfiles.length, previousProfiles.length) },
      activePartners: { value: currentPartners.length, ...calculateChange(currentPartners.length, previousPartners.length) },
    });

    // Generate dynamic chart data based on Revenue (margin_share of delivered orders)
    const chartOrders = currentOrders.filter(o => o.status === 'Delivered' || o.status === 'delivered');
    let groupedData: Record<string, number> = {};

    chartOrders.forEach(o => {
      const p = Array.isArray(o.partners) ? o.partners[0] : o.partners;
      const margin = p?.margin_share || 0;
      const rev = (o.total || 0) * (margin / 100);
      const d = new Date(o.created_at);
      let key = '';
      if (dateFilter === 'today') key = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      else if (dateFilter === '12m') key = d.toLocaleDateString('en-IN', { month: 'short' });
      else key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      groupedData[key] = (groupedData[key] || 0) + rev;
    });

    // If no data, provide an empty state to avoid broken chart
    if (Object.keys(groupedData).length === 0) {
       groupedData = { 'No Data': 0 };
    }

    setDynamicChartData(Object.entries(groupedData).map(([label, revenue]) => ({ label, revenue })).reverse());
    
    // For recent orders table
    const { data: recent } = await supabase
      .from('orders')
      .select('id, created_at, total, status, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentOrders(recent || []);
    setLoading(false);
  };

  const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

  const statCards = [
    { label: 'Total Sales', value: formatCurrency(stats.totalSales.value), change: stats.totalSales.change, up: stats.totalSales.up, icon: '₹' },
    { label: 'Total Orders', value: stats.totalOrders.value.toLocaleString(), change: stats.totalOrders.change, up: stats.totalOrders.up, icon: '📦' },
    { label: 'Total Users', value: stats.totalUsers.value.toLocaleString(), change: stats.totalUsers.change, up: stats.totalUsers.up, icon: '👤' },
    { label: 'Active Partners', value: stats.activePartners.value.toLocaleString(), change: stats.activePartners.change, up: stats.activePartners.up, icon: '🏢' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-secondary-container/30 text-on-secondary-container';
      case 'processing':
      case 'confirmed':
        return 'bg-surface-variant text-on-surface-variant';
      case 'delayed':
      case 'cancelled':
        return 'bg-error-container/50 text-on-error-container';
      default:
        return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-8 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">Dashboard</h2>
        <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant/50 shadow-sm">
          {(['today', '7d', '30d', '12m'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                dateFilter === f
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {f === 'today' ? 'Today' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary-container/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm text-on-surface-variant">{card.label}</span>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-semibold text-on-surface">{loading ? '...' : card.value}</div>
            <div className={`mt-2 text-xs font-semibold flex items-center gap-1 ${card.up ? 'text-secondary' : 'text-outline'}`}>
              {card.up ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {card.change}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-on-surface">Revenue Overview</h3>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006c49" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#006c49" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#c0c9bb" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#717a6d' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#717a6d' }} axisLine={false} tickLine={false} width={80} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #c0c9bb',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#006c49" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* This column intentionally left empty for the grid to work; recent orders goes full width below */}
        <div className="hidden lg:block" />
      </div>

      {/* Recent Orders */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-on-surface">Recent Orders</h3>
          <button
            onClick={() => onNavigate('/admin/orders')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Order ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Date</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Customer</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Amount</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Loading...</td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">No orders yet</td></tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                    <td className="py-3 px-4 font-mono text-xs text-primary">#{order.id.split('-')[0]}</td>
                    <td className="py-3 px-4 text-on-surface-variant text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-sm">{order.user_id?.split('-')[0] || 'N/A'}</td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(order.total || 0)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
