import React, { useState, useEffect } from 'react';
import { Search, Filter, Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UsersScreenProps {
  onNavigate: (route: string) => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  member_tier: string;
  created_at: string;
  avatar_url: string | null;
}

interface UserOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string;
}

export const UsersScreen: React.FC<UsersScreenProps> = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'prescriptions' | 'activity'>('orders');

  // Listen for global refresh
  useEffect(() => {
    const handler = () => loadUsers();
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: partnersData } = await supabase.from('partners').select('id, email, name');
    setPartners(partnersData || []);

    const { data, error } = await supabase.rpc('get_admin_users_with_email');
    if (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } else {
      setUsers(data || []);
      if (data && data.length > 0) {
        selectUser(data[0], partnersData || []);
      }
    }
    setLoading(false);
  };

  const selectUser = async (user: UserProfile | null, currentPartners: any[] = partners) => {
    setSelectedUser(user);
    if (!user) {
      setUserOrders([]);
      return;
    }
    const partnerInfo = currentPartners.find(p => p.email === user.email);
    
    let ordersQuery = supabase
      .from('orders')
      .select('id, created_at, total, status, user_id')
      .order('created_at', { ascending: false });

    if (partnerInfo) {
      ordersQuery = ordersQuery.eq('assigned_partner_id', partnerInfo.id);
    } else {
      ordersQuery = ordersQuery.eq('user_id', user.id);
    }
    
    const { data: orders } = await ordersQuery;
    setUserOrders(orders || []);
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-amber-100 text-amber-800';
      case 'clinical': return 'bg-blue-100 text-blue-800';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'delivered') return 'text-on-secondary-container';
    if (status === 'cancelled') return 'text-on-error-container';
    return 'text-on-surface-variant';
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const isSelectedPartner = selectedUser ? partners.find(p => p.email === selectedUser.email) : false;
  const uniqueCustomers = new Set(userOrders.map(o => o.user_id)).size;

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">
          Users <span className="text-lg font-normal text-on-surface-variant">({users.length} total)</span>
        </h2>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Users List */}
        <div className={`w-full lg:w-[380px] flex-shrink-0 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-y-auto max-h-[calc(100vh-200px)] ${selectedUser ? 'hidden lg:block' : 'block'}`}>
          {loading ? (
            <div className="p-8 text-center text-on-surface-variant">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">No users found</div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors border-b border-outline-variant/20 ${
                  selectedUser?.id === user.id
                    ? 'bg-primary/5 border-l-4 border-l-primary'
                    : 'hover:bg-surface-container-low'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface truncate">{user.name || 'Unknown'}</span>
                    {partners.find(p => p.email === user.email) ? (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize bg-secondary text-on-secondary">
                        Partner
                      </span>
                    ) : user.member_tier && user.member_tier !== 'standard' ? (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${getTierBadge(user.member_tier)}`}>
                        {user.member_tier}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                </div>
                <span className="text-xs text-on-surface-variant whitespace-nowrap">
                  {userOrders.length > 0 && selectedUser?.id === user.id ? `${userOrders.length} Orders` : ''}
                </span>
              </button>
            ))
          )}
        </div>

        {/* User Detail */}
        {selectedUser ? (
          <div className={`flex-1 flex flex-col gap-6 min-w-0 ${selectedUser ? 'block' : 'hidden lg:flex'}`}>
            {/* Breadcrumb + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <button onClick={() => selectUser(null)} className="lg:hidden p-1.5 hover:bg-surface-container rounded-md">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="hidden sm:inline">Users &gt;</span> <span className="text-on-surface font-medium truncate max-w-[200px]">{selectedUser.name}</span>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                  Suspend
                </button>
                <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-surface-container-low/50 border border-outline-variant/30 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container font-bold text-xl flex items-center justify-center flex-shrink-0">
                {getInitials(selectedUser.name)}
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-xl sm:text-2xl font-semibold text-on-surface truncate">{selectedUser.name || 'Unknown'}</h3>
                  {isSelectedPartner ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize bg-secondary text-on-secondary">
                      Delivery Partner
                    </span>
                  ) : selectedUser.member_tier && selectedUser.member_tier !== 'standard' ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${getTierBadge(selectedUser.member_tier)}`}>
                      {selectedUser.member_tier} Member
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {selectedUser.email}</span>
                  {selectedUser.phone && <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {selectedUser.phone}</span>}
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Joined: {new Date(selectedUser.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {isSelectedPartner ? (
                <div className="flex gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-outline-variant/20">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Customers Served</p>
                    <p className="text-xl font-bold text-on-surface">{uniqueCustomers}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total Sale</p>
                    <p className="text-xl font-bold text-on-surface">₹{totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-outline-variant/20">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total Spent</p>
                  <p className="text-xl font-bold text-on-surface">₹{totalSpent.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-outline-variant/30">
              <div className="flex gap-6">
                {(['orders', 'prescriptions', 'activity'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-semibold capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-on-surface border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab === 'orders' ? (isSelectedPartner ? 'Assigned Orders' : 'Order History') : tab === 'prescriptions' ? 'Saved Prescriptions' : 'Activity Log'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30">
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Order ID</th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {userOrders.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant text-sm">No orders yet</td></tr>
                    ) : (
                      userOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-primary">#{order.id.split('-')[0]}</td>
                          <td className="py-3 px-4 text-sm text-on-surface-variant">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold capitalize flex items-center gap-1 ${getStatusBadge(order.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${order.status === 'delivered' ? 'bg-secondary' : order.status === 'cancelled' ? 'bg-error' : 'bg-outline'}`} />
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-on-surface text-right">
                            ₹{(order.total || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="py-12 text-center text-on-surface-variant text-sm">
                Prescription management coming soon.
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="py-12 text-center text-on-surface-variant text-sm">
                Activity log coming soon.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            Select a user to view details
          </div>
        )}
      </div>
    </div>
  );
};
