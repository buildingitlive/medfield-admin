import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, MoreVertical, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrdersScreenProps {
  onNavigate: (route: string) => void;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string;
  assigned_partner_id: string | null;
  items: any[];
  profiles?: { name: string; email: string } | null;
}

interface Partner {
  id: string;
  name: string;
  region: string;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [assignModal, setAssignModal] = useState<{ orderId: string; open: boolean }>({ orderId: '', open: false });
  const pageSize = 10;

  useEffect(() => {
    loadOrders();
    loadPartners();
  }, [page, statusFilter, assignmentFilter]);

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('id, name, region').eq('is_active', true);
    setPartners(data || []);
  };

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, created_at, total, status, user_id, assigned_partner_id, items:order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (assignmentFilter === 'unassigned') query = query.is('assigned_partner_id', null);
    if (assignmentFilter === 'assigned') query = query.not('assigned_partner_id', 'is', null);

    const { data, count } = await query;
    setOrders(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const assignPartner = async (orderId: string, partnerId: string) => {
    await supabase.from('orders').update({ assigned_partner_id: partnerId, status: 'confirmed' }).eq('id', orderId);
    setAssignModal({ orderId: '', open: false });
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      placed: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-surface-variant text-on-surface-variant',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-secondary-container/30 text-on-secondary-container',
      cancelled: 'bg-error-container/50 text-on-error-container',
    };
    return map[status] || 'bg-surface-variant text-on-surface-variant';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredOrders = searchQuery
    ? orders.filter(o =>
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">Orders</h2>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            placeholder="Search orders, patients, IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-full text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="placed">Placed</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={assignmentFilter}
          onChange={(e) => { setAssignmentFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">Assignment: All</option>
          <option value="unassigned">Unassigned</option>
          <option value="assigned">Assigned</option>
        </select>
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} orders
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/30">
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider w-10">
                  <input type="checkbox" className="rounded border-outline-variant" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">ORDER ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">DATE/TIME</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">CUSTOMER</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">ITEMS</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">STATUS</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">No orders found</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-4">
                      <input type="checkbox" className="rounded border-outline-variant" />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-primary bg-primary/5 px-2 py-1 rounded">
                        #{order.id.split('-')[0]}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-on-surface-variant">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })},{' '}
                      {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-on-surface">{order.user_id.split('-')[0]}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-on-surface-variant">
                      {Array.isArray(order.items) ? order.items.length : 0} items
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {!order.assigned_partner_id && order.status === 'placed' ? (
                        <button
                          onClick={() => setAssignModal({ orderId: order.id, open: true })}
                          className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                        >
                          Assign
                        </button>
                      ) : order.assigned_partner_id ? (
                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          🚚 {partners.find(p => p.id === order.assigned_partner_id)?.name || 'Partner'}
                        </span>
                      ) : (
                        <button className="p-1 text-on-surface-variant hover:bg-surface-container rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/30">
            <span className="text-xs text-on-surface-variant">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} orders
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    page === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-on-surface">Assign to Partner</h3>
              <button onClick={() => setAssignModal({ orderId: '', open: false })} className="p-1 hover:bg-surface-container rounded-full">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {partners.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">No active partners found. Create partners first.</p>
              ) : (
                partners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => assignPartner(assignModal.orderId, partner.id)}
                    className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-sm">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-on-surface">{partner.name}</p>
                        <p className="text-xs text-on-surface-variant capitalize">{partner.region.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold">Select</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
