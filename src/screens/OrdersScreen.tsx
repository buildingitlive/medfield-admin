import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronLeft, ChevronRight, MoreVertical, X, ArrowUp, ArrowDown, MapPin, Package, CheckCircle, Info, Plus, Loader2, FileText, Pill, Trash2, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QuantityWheel } from '../components/QuantityWheel';

interface OrdersScreenProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  delivery_fee: number;
  status: string;
  user_id: string;
  assigned_partner_id: string | null;
  items: any[];
  confirmed_items?: any[];
  address_snapshot?: any;
  profiles?: { name: string; email: string; phone: string } | null;
  prescription_url?: string | null;
  prescription_id?: string | null;
  medicine_text?: string | null;
  notes?: string | null;
  discount_percent?: number;
}

interface Partner {
  id: string;
  name: string;
  region: string;
}

type SortField = 'id' | 'created_at' | 'total' | 'status' | 'user_id';
type SortDirection = 'asc' | 'desc';

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onNavigate, currentRoute }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Multiselect
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Modals
  const [assignModal, setAssignModal] = useState<{ orderIds: string[]; open: boolean }>({ orderIds: [], open: false });
  const [detailsModal, setDetailsModal] = useState<Order | null>(null);

  // Confirm Order Popup
  const [confirmModal, setConfirmModal] = useState<Order | null>(null);
  const [confirmDiscount, setConfirmDiscount] = useState(0);
  const [confirmItems, setConfirmItems] = useState<{ medicine_name: string; company: string; quantity: number | ''; mrp: number | '' }[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [_autoCompleteQuery, setAutoCompleteQuery] = useState('');
  const [autoCompleteResults, setAutoCompleteResults] = useState<any[]>([]);
  const [activeAutoCompleteIdx, setActiveAutoCompleteIdx] = useState<number | null>(null);

  // Cancel Order
  const [cancelModal, setCancelModal] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    loadPartners();
  }, [page, statusFilter, assignmentFilter, sortField, sortDirection]);

  // Listen for global refresh
  useEffect(() => {
    const handler = () => { loadOrders(); loadPartners(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, []);

  // Reset selection when page changes to avoid confusion
  useEffect(() => {
    setSelectedOrders([]);
  }, [page, statusFilter, assignmentFilter, sortField, sortDirection, searchQuery]);

  // Handle auto-opening order details from notification
  useEffect(() => {
    const processNotification = () => {
      const notif = (window as any).pendingNotificationForOrder;
      if (!notif) return;
      
      // Consume it
      (window as any).pendingNotificationForOrder = null;

      // Extract full ID from link if it's valid, otherwise try to extract short ID from title/description
      let targetId = notif.link?.split('id=')[1];
      if (targetId === 'undefined') targetId = null;

      if (!targetId) {
        // Fallback for old notifications (extract short ID)
        const match = notif.title?.match(/#([a-f0-9]+)/i) || notif.description?.match(/#([a-f0-9]+)/i);
        if (match) {
          const shortId = match[1];
          // Search locally first
          const localOrder = orders.find(o => o.id.startsWith(shortId));
          if (localOrder) {
            setDetailsModal(localOrder);
          } else {
            alert("This is an old notification and the order is not on the current page. Please scroll or search to find it!");
          }
        }
        return;
      }

      // Normal logic with full UUID targetId
      const targetOrder = orders.find(o => o.id === targetId);
      if (targetOrder) {
        setDetailsModal(targetOrder);
      } else {
        supabase
          .from('orders')
          .select('id, created_at, total, delivery_fee, status, user_id, assigned_partner_id, address_snapshot, prescription_url, prescription_id, medicine_text, notes, discount_percent, items:order_items(*), confirmed_items:order_confirmed_items(*)')
          .eq('id', targetId)
          .single()
          .then(({ data }) => {
            if (data) setDetailsModal(data);
            else alert("Order not found. It may have been deleted.");
          });
      }
    };

    // Process on mount or when currentRoute/orders change
    // Only process if we have finished loading the initial set of orders,
    // so we don't accidentally fail a local search on an empty array.
    if (!loading) {
      processNotification();
    }
  }, [orders, currentRoute, loading]);

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('id, name, region').eq('is_active', true);
    setPartners(data || []);
  };

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, created_at, total, delivery_fee, status, user_id, assigned_partner_id, address_snapshot, prescription_url, prescription_id, medicine_text, notes, discount_percent, items:order_items(*), confirmed_items:order_confirmed_items(*)', { count: 'exact' })
      .order(sortField, { ascending: sortDirection === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (assignmentFilter === 'unassigned') query = query.is('assigned_partner_id', null);
    if (assignmentFilter === 'assigned') query = query.not('assigned_partner_id', 'is', null);

    const { data, count } = await query;
    
    setOrders(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const assignPartner = async (orderIds: string[], partnerId: string) => {
    // Ensure all orders being assigned have been confirmed first
    const unconfirmedOrders = orders.filter(o => orderIds.includes(o.id) && o.status !== 'Order Confirmed');
    if (unconfirmedOrders.length > 0) {
      alert(`Cannot assign partner: ${unconfirmedOrders.length} order(s) have not been confirmed (` + unconfirmedOrders.map(o => `#${o.id.split('-')[0]}`).join(', ') + `). Without order confirmation, orders cannot be assigned to a partner.`);
      return;
    }

    // Bulk assign
    const { error } = await supabase.from('orders').update({ assigned_partner_id: partnerId, status: 'Verified by Pharmacy' }).in('id', orderIds);
    if (error) {
      alert('Failed to assign partner: ' + error.message);
      return;
    }

    // Emit notifications for assigned partner & customers
    const assignedPartner = partners.find(p => p.id === partnerId);
    const assignedOrders = orders.filter(o => orderIds.includes(o.id));
    
    const notifs: any[] = [];
    if (assignedPartner) {
      notifs.push({
        recipient_type: 'partner',
        recipient_id: partnerId,
        title: 'New Delivery Assignment',
        description: `You have been assigned ${orderIds.length} new order(s) for delivery.`,
        type: 'order_assigned',
        link: '/',
        is_read: false
      });
    }

    assignedOrders.forEach(o => {
      notifs.push({
        recipient_type: 'user',
        recipient_id: o.user_id,
        title: 'Order En Route 🚚',
        description: `Your order #${o.id.split('-')[0]} has been verified and assigned to our field partner for dispatch.`,
        type: 'order_assigned',
        link: `/orders?id=${o.id}`,
        is_read: false
      });
    });

    if (notifs.length > 0) {
      await supabase.from('notifications').insert(notifs);
    }

    setAssignModal({ orderIds: [], open: false });
    setSelectedOrders([]); // clear selection
    loadOrders();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc'); // Default when changing field
    }
  };

  const cancelOrder = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    const orderId = cancelModal.id;
    const shortId = orderId.split('-')[0];
    const reason = cancelReason.trim() || 'No reason specified';

    await supabase.from('orders').update({ status: 'Cancelled', notes: `[Cancelled] ${reason}` }).eq('id', orderId);

    // Notify customer and admin log
    const notifs: any[] = [
      {
        recipient_type: 'user',
        recipient_id: cancelModal.user_id,
        title: 'Order Cancelled',
        description: `Your order #${shortId} has been cancelled. Reason: ${reason}`,
        type: 'order_cancelled',
        link: `/orders?id=${cancelModal.id}`,
        is_read: false
      }
    ];

    // Notify partner if assigned
    if (cancelModal.assigned_partner_id) {
      notifs.push({
        recipient_type: 'partner',
        recipient_id: cancelModal.assigned_partner_id,
        title: `Order #${shortId} Cancelled`,
        description: `Order #${shortId} has been cancelled by admin. Reason: ${reason}`,
        type: 'order_cancelled',
        link: '/',
        is_read: false
      });
    }

    await supabase.from('notifications').insert(notifs);

    setCancelLoading(false);
    setCancelModal(null);
    setCancelReason('');
    setDetailsModal(null);
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Pending Confirmation': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'Order Confirmed': 'bg-sky-100 text-sky-800',
      'Order Placed': 'bg-amber-100 text-amber-800',
      'Verified by Pharmacy': 'bg-blue-100 text-blue-800',
      'Dispatched from Field Warehouse': 'bg-indigo-100 text-indigo-800',
      'Out for Delivery': 'bg-orange-100 text-orange-800',
      'Delivered': 'bg-secondary-container/30 text-on-secondary-container',
      'delivered': 'bg-secondary-container/30 text-on-secondary-container',
      'Cancelled': 'bg-red-100 text-red-800',
      'cancelled': 'bg-red-100 text-red-800',
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

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

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

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="Pending Confirmation">⏳ Pending Confirmation</option>
          <option value="Order Confirmed">✅ Order Confirmed</option>
          <option value="Order Placed">Order Placed</option>
          <option value="Verified by Pharmacy">Verified by Pharmacy</option>
          <option value="Dispatched from Field Warehouse">Dispatched</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
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
        
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-outline-variant/30">
            <span className="text-sm font-medium text-primary">{selectedOrders.length} selected</span>
            <button 
              onClick={() => {
                const confirmedIds = selectedOrders.filter(id => orders.find(o => o.id === id)?.status === 'Order Confirmed');
                const unconfirmedCount = selectedOrders.length - confirmedIds.length;
                if (unconfirmedCount > 0) {
                  alert(`Without order confirmation, orders cannot be assigned to a partner (${unconfirmedCount} unconfirmed order(s) excluded).`);
                }
                if (confirmedIds.length === 0) return;
                setAssignModal({ orderIds: confirmedIds, open: true });
              }}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm"
            >
              Bulk Assign to Partner
            </button>
          </div>
        )}

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
                  <input 
                    type="checkbox" 
                    className="rounded border-outline-variant accent-primary cursor-pointer" 
                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider cursor-pointer hover:text-on-surface transition-colors" onClick={() => handleSort('id')}>
                  ORDER ID <SortIcon field="id" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider cursor-pointer hover:text-on-surface transition-colors" onClick={() => handleSort('created_at')}>
                  DATE/TIME <SortIcon field="created_at" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider cursor-pointer hover:text-on-surface transition-colors" onClick={() => handleSort('user_id')}>
                  CUSTOMER <SortIcon field="user_id" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider cursor-pointer hover:text-on-surface transition-colors" onClick={() => handleSort('total')}>
                  PRICE <SortIcon field="total" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">
                  ITEMS
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider cursor-pointer hover:text-on-surface transition-colors" onClick={() => handleSort('status')}>
                  STATUS <SortIcon field="status" />
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-on-surface-variant">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-on-surface-variant">No orders found</td></tr>
              ) : (
                filteredOrders.map((order) => {
                  const confirmedCount = Array.isArray(order.confirmed_items) ? order.confirmed_items.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0) : 0;
                  const orderItemCount = Array.isArray(order.items) ? order.items.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0) : 0;
                  const itemCount = confirmedCount > 0 ? confirmedCount : orderItemCount;
                  const isSelected = selectedOrders.includes(order.id);

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                      onClick={() => setDetailsModal(order)}
                    >
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-outline-variant accent-primary cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.id)}
                        />
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
                      <td className="py-4 px-4 font-medium text-sm text-on-surface">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-4 px-4 text-sm text-on-surface-variant">
                        {itemCount > 0 ? `${itemCount} items` : <span className="text-xs text-primary">📋 Rx</span>}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {!order.assigned_partner_id && order.status === 'Order Confirmed' ? (
                          <button
                            onClick={() => setAssignModal({ orderIds: [order.id], open: true })}
                            className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                          >
                            Assign
                          </button>
                        ) : order.assigned_partner_id ? (
                          <span className="text-xs text-on-surface-variant flex items-center justify-end gap-1">
                            🚚 {partners.find(p => p.id === order.assigned_partner_id)?.name || 'Partner'}
                          </span>
                        ) : (
                          <button className="p-1 text-on-surface-variant hover:bg-surface-container rounded transition-colors" onClick={() => setDetailsModal(order)}>
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
      {assignModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-[450px] max-w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-on-surface">Assign to Partner</h3>
              <button onClick={() => setAssignModal({ orderIds: [], open: false })} className="p-1 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            {assignModal.orderIds.length > 1 && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg text-sm text-primary font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Assigning {assignModal.orderIds.length} orders
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {partners.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-4 text-center">No active partners found. Create partners first.</p>
              ) : (
                partners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => assignPartner(assignModal.orderIds, partner.id)}
                    className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low hover:border-primary transition-colors group"
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
                    <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Details Modal / Side Panel View */}
      {detailsModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={() => setDetailsModal(null)}>
          <div 
            className="bg-surface-container-lowest h-full w-[500px] max-w-full shadow-2xl flex flex-col shrink-0" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h2 className="text-xl font-semibold text-on-surface font-mono">#{detailsModal.id.split('-')[0]}</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Placed on {new Date(detailsModal.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button onClick={() => setDetailsModal(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${detailsModal.status === 'delivered' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary/10 text-primary'}`}>
                    {detailsModal.status === 'delivered' ? <CheckCircle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface capitalize">{detailsModal.status}</p>
                    <p className="text-xs text-on-surface-variant">
                      {detailsModal.assigned_partner_id 
                        ? `Assigned to ${partners.find(p => p.id === detailsModal.assigned_partner_id)?.name || 'Partner'}` 
                        : 'Awaiting assignment'}
                    </p>
                  </div>
                </div>
                {detailsModal.status === 'Pending Confirmation' && (
                  <button
                    onClick={() => {
                      // Pre-fill medicine rows from user's text
                      const meds = (detailsModal.medicine_text || '').split('\n').filter(Boolean).map(line => {
                        const match = line.match(/^(.+?)\s*×\s*(\d+)$/);
                        return { medicine_name: match?.[1] || line, company: '', quantity: parseInt(match?.[2] || '1'), mrp: 0 };
                      });
                      if (meds.length === 0) meds.push({ medicine_name: '', company: '', quantity: 1, mrp: 0 });
                      setConfirmItems(meds);
                      setConfirmDiscount(0);
                      setConfirmModal(detailsModal);
                      setDetailsModal(null);
                    }}
                    className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                  >
                    Confirm Order
                  </button>
                )}
                {!detailsModal.assigned_partner_id && detailsModal.status === 'Order Confirmed' && (
                  <button
                    onClick={() => { setDetailsModal(null); setAssignModal({ orderIds: [detailsModal.id], open: true }); }}
                    className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                  >
                    Assign
                  </button>
                )}
              </div>

              {/* Customer & Delivery Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Customer</h3>
                  <div className="text-sm text-on-surface font-medium">{detailsModal.user_id.split('-')[0]}</div>
                  <div className="text-xs text-on-surface-variant mt-1">User ID reference</div>
                </div>
                
                {detailsModal.address_snapshot && (
                  <div>
                    <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Delivery Address
                    </h3>
                    <div className="text-sm text-on-surface">
                      <p className="font-medium">{detailsModal.address_snapshot.name || detailsModal.address_snapshot.recipient_name}</p>
                      <p className="text-on-surface-variant mt-1">
                        {detailsModal.address_snapshot.house_no || detailsModal.address_snapshot.street}{detailsModal.address_snapshot.area ? `, ${detailsModal.address_snapshot.area}` : ''}
                      </p>
                      <p className="text-on-surface-variant">
                        {detailsModal.address_snapshot.landmark && `${detailsModal.address_snapshot.landmark}, `}
                        {detailsModal.address_snapshot.city}
                      </p>
                      <p className="text-on-surface-variant mt-1">📞 {detailsModal.address_snapshot.phone}</p>
                      {detailsModal.address_snapshot.latitude && detailsModal.address_snapshot.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${detailsModal.address_snapshot.latitude},${detailsModal.address_snapshot.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Open in Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Prescription & Medicine Request */}
              {(detailsModal.prescription_url || detailsModal.medicine_text || detailsModal.notes) && (
                <div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Prescription & Request
                  </h3>
                  <div className="space-y-3">
                    {detailsModal.prescription_url && (
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                        <p className="text-xs font-semibold text-on-surface mb-2">📄 Prescription Uploaded</p>
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-outline-variant/30 bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(supabase.storage.from('prescriptions').getPublicUrl(detailsModal.prescription_url!).data.publicUrl, '_blank')}
                          >
                            <img
                              src={supabase.storage.from('prescriptions').getPublicUrl(detailsModal.prescription_url).data.publicUrl}
                              alt="Prescription"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-on-surface-variant break-all mb-1.5">{detailsModal.prescription_url.split('/').pop()}</p>
                            <button
                              onClick={() => window.open(supabase.storage.from('prescriptions').getPublicUrl(detailsModal.prescription_url!).data.publicUrl, '_blank')}
                              className="text-xs text-primary font-semibold hover:underline"
                            >
                              View Full Image →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {detailsModal.medicine_text && (
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                        <p className="text-xs font-semibold text-on-surface mb-2">💊 Medicines Requested</p>
                        <div className="space-y-1">
                          {detailsModal.medicine_text.split('\n').filter(Boolean).map((line, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-on-surface">
                              <Pill className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {detailsModal.notes && (
                      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                        <p className="text-xs font-semibold text-on-surface mb-1">📝 Customer Notes</p>
                        <p className="text-sm text-on-surface-variant">{detailsModal.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Order Items
                </h3>
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden divide-y divide-outline-variant/20">
                  {detailsModal.confirmed_items && detailsModal.confirmed_items.length > 0 ? (
                    detailsModal.confirmed_items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center gap-3 bg-surface-container-lowest">
                        <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-on-surface">{item.medicine_name}</p>
                          {item.company && <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">{item.company}</p>}
                          <p className="text-xs text-on-surface-variant">Qty: {item.quantity} × {formatCurrency(item.mrp)}</p>
                        </div>
                        <div className="text-sm font-semibold text-on-surface">
                          {formatCurrency(item.price)}
                        </div>
                      </div>
                    ))
                  ) : detailsModal.items && detailsModal.items.length > 0 ? (
                    detailsModal.items.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center gap-3 bg-surface-container-lowest">
                        <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center shrink-0">
                          {item.product_snapshot?.image_url ? (
                            <img src={item.product_snapshot.image_url} alt="Item" className="w-8 h-8 object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-outline" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-on-surface">{item.product_snapshot?.name || 'Unknown Item'}</p>
                          <p className="text-xs text-on-surface-variant">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-sm font-semibold text-on-surface">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-on-surface-variant">
                      {detailsModal.status === 'Pending Confirmation' ? 'Awaiting pharmacist confirmation — no items yet.' : 'No items recorded.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/30">
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                  <div className="pt-3 mt-3 border-t border-outline-variant/30 flex justify-between font-semibold text-lg text-on-surface">
                    <span>Total</span>
                    <span className="text-primary">{detailsModal.total > 0 ? formatCurrency(detailsModal.total) : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Cancel Order Button — only show for non-cancelled, non-delivered orders */}
              {detailsModal.status !== 'Cancelled' && detailsModal.status !== 'cancelled' && detailsModal.status !== 'Delivered' && detailsModal.status !== 'delivered' && (
                <button
                  onClick={() => { setCancelModal(detailsModal); setDetailsModal(null); }}
                  className="w-full py-3 rounded-xl border border-error/40 text-error font-semibold text-sm hover:bg-error/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> Cancel This Order
                </button>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* CONFIRM ORDER POPUP                           */}
      {/* ═══════════════════════════════════════════════ */}
      {confirmModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmModal(null)}>
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Confirm Order #{confirmModal.id.split('-')[0]}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Set pricing for this order. The customer will be notified.</p>
              </div>
              <button onClick={() => setConfirmModal(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Discount Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-on-surface">Discount</label>
                <select
                  value={confirmDiscount}
                  onChange={(e) => setConfirmDiscount(Number(e.target.value))}
                  className="px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm font-semibold text-primary cursor-pointer focus:outline-none focus:border-primary"
                >
                  {[0, 5, 10, 15, 20, 25].map(d => (
                    <option key={d} value={d}>{d}% OFF</option>
                  ))}
                </select>
              </div>

              {/* Medicine Table */}
              <div className="border border-outline-variant/30 rounded-xl overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/30 border-b border-outline-variant/30">
                      <th className="py-2.5 px-3 text-xs font-semibold text-on-surface-variant w-[35%]">Medicine</th>
                      <th className="py-2.5 px-3 text-xs font-semibold text-on-surface-variant w-[20%]">Company</th>
                      <th className="py-2.5 px-3 text-xs font-semibold text-on-surface-variant w-[10%] text-center">Qty</th>
                      <th className="py-2.5 px-3 text-xs font-semibold text-on-surface-variant w-[13%] text-right">MRP</th>
                      <th className="py-2.5 px-3 text-xs font-semibold text-on-surface-variant w-[15%] text-right">Price</th>
                      <th className="py-2.5 px-3 w-[7%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmItems.map((item, idx) => {
                      const q = Number(item.quantity) || 0;
                      const m = Number(item.mrp) || 0;
                      const discountedPrice = m * q * (1 - confirmDiscount / 100);
                      return (
                        <tr key={idx} className="border-b border-outline-variant/20 last:border-0">
                          <td className="py-2 px-3 relative">
                            <input
                              type="text"
                              value={item.medicine_name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfirmItems(prev => prev.map((it, i) => i === idx ? { ...it, medicine_name: val } : it));
                                setActiveAutoCompleteIdx(idx);
                                setAutoCompleteQuery(val);
                                // Debounced search in admin_products
                                if (val.length >= 2) {
                                  supabase.from('admin_products').select('*').ilike('medicine_name', `%${val}%`).limit(5).then(({ data }) => {
                                    setAutoCompleteResults(data || []);
                                  });
                                } else {
                                  setAutoCompleteResults([]);
                                }
                              }}
                              onBlur={() => setTimeout(() => { setActiveAutoCompleteIdx(null); setAutoCompleteResults([]); }, 200)}
                              placeholder="Medicine name"
                              className="w-full py-1.5 px-2 bg-surface border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-primary"
                            />
                            {/* Auto-complete dropdown */}
                            {activeAutoCompleteIdx === idx && autoCompleteResults.length > 0 && (
                              <div className="absolute z-[100] left-3 right-3 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                {autoCompleteResults.map((result: any) => (
                                  <button
                                    key={result.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setConfirmItems(prev => prev.map((it, i) => i === idx ? {
                                        ...it,
                                        medicine_name: result.medicine_name,
                                        company: result.company || '',
                                        mrp: result.mrp || 0,
                                      } : it));
                                      setAutoCompleteResults([]);
                                      setActiveAutoCompleteIdx(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                                  >
                                    <span className="text-amber-500 text-xs">⭐</span>
                                    <span className="text-on-surface font-medium">{result.medicine_name}</span>
                                    {result.company && <span className="text-on-surface-variant text-xs">({result.company})</span>}
                                    {result.mrp > 0 && <span className="ml-auto text-xs text-primary font-semibold">₹{result.mrp}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.company}
                              onChange={(e) => setConfirmItems(prev => prev.map((it, i) => i === idx ? { ...it, company: e.target.value } : it))}
                              placeholder="Company"
                              className="w-full py-1.5 px-2 bg-surface border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <QuantityWheel 
                              value={item.quantity}
                              onChange={(val) => setConfirmItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it))}
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.mrp}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setConfirmItems(prev => prev.map((it, i) => i === idx ? { ...it, mrp: isNaN(val) ? '' : val } : it));
                              }}
                              className="w-20 py-1.5 px-2 bg-surface border border-outline-variant rounded text-sm text-on-surface text-right focus:outline-none focus:border-primary ml-auto"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-sm font-semibold text-on-surface">₹{discountedPrice.toFixed(2)}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {confirmItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setConfirmItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-on-surface-variant hover:text-error rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Add Row */}
                <button
                  type="button"
                  onClick={() => setConfirmItems(prev => [...prev, { medicine_name: '', company: '', quantity: 1, mrp: 0 }])}
                  className="w-full py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 border-t border-outline-variant/30"
                >
                  <Plus className="w-4 h-4" />
                  Add Medicine Row
                </button>
              </div>

              {/* Total */}
              <div className="bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/30 flex justify-between items-center">
                <span className="text-sm font-semibold text-on-surface">Total Price</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{confirmItems.reduce((sum, it) => sum + ((Number(it.mrp) || 0) * (Number(it.quantity) || 0) * (1 - confirmDiscount / 100)), 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/30 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-6 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmLoading || confirmItems.every(it => !it.medicine_name.trim())}
                onClick={async () => {
                  if (!confirmModal) return;
                  setConfirmLoading(true);

                  const validItems = confirmItems.filter(it => it.medicine_name.trim());
                  const totalPrice = validItems.reduce((sum, it) => sum + (Number(it.mrp) * Number(it.quantity) * (1 - confirmDiscount / 100)), 0);

                  // 1. Insert confirmed items
                  const confirmPayload = validItems.map(it => ({
                    order_id: confirmModal.id,
                    medicine_name: it.medicine_name,
                    company: it.company || null,
                    quantity: Number(it.quantity),
                    mrp: Number(it.mrp),
                    price: Number(it.mrp) * Number(it.quantity) * (1 - confirmDiscount / 100),
                  }));
                  
                  const { error: itemsErr } = await supabase.from('order_confirmed_items').insert(confirmPayload);
                  if (itemsErr) { alert('Error saving items: ' + itemsErr.message); setConfirmLoading(false); return; }

                  // 2. Upsert into admin_products (self-growing catalog)
                  for (const it of validItems) {
                    await supabase.from('admin_products').upsert(
                      { medicine_name: it.medicine_name, company: it.company || null, mrp: it.mrp, updated_at: new Date().toISOString() },
                      { onConflict: 'medicine_name,company' }
                    );
                  }

                  // 2b. Auto-sync into customer-facing products table (Dynamic Catalog Growth)
                  for (const it of validItems) {
                    const { data: existing } = await supabase
                      .from('products')
                      .select('id')
                      .eq('name', it.medicine_name)
                      .maybeSingle();

                    if (!existing) {
                      await supabase.from('products').insert({
                        name: it.medicine_name,
                        generic_name: it.company || '',
                        price: (Number(it.mrp) || 0) * (1 - confirmDiscount / 100),
                        mrp: Number(it.mrp) || 0,
                        category: null,
                        description: 'auto-added',
                        grower_name: '',
                      });
                    }
                  }

                  // 3. Update order status and total
                  await supabase.from('orders').update({
                    status: 'Order Confirmed',
                    total: totalPrice,
                    discount_percent: confirmDiscount,
                  }).eq('id', confirmModal.id);

                  // 4. Add tracking step
                  await supabase.from('order_tracking_steps').insert({
                    order_id: confirmModal.id,
                    title: 'Order Confirmed by Pharmacist',
                    description: `Your order has been confirmed. Total: ₹${totalPrice.toFixed(2)}`,
                    timestamp: new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    completed: true,
                    step_order: 2,
                  });

                  // 5. Notify customer
                  const shortId = confirmModal.id.split('-')[0];
                  await supabase.from('notifications').insert({
                    recipient_type: 'user',
                    recipient_id: confirmModal.user_id,
                    title: 'Order Confirmed! ✅',
                    description: `Your order #${shortId} has been confirmed by our pharmacist. Total: ₹${totalPrice.toFixed(2)}`,
                    type: 'order_confirmed',
                    link: `/orders?id=${confirmModal.id}`,
                    is_read: false,
                  });

                  setConfirmLoading(false);
                  setConfirmModal(null);
                  loadOrders();
                }}
                className="px-8 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>Confirm Order</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* CANCEL ORDER MODAL                             */}
      {/* ═══════════════════════════════════════════════ */}
      {cancelModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setCancelModal(null); setCancelReason(''); }}>
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-2xl w-[90vw] sm:w-[400px] shrink-0 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-error flex items-center gap-2">
                  <Ban className="w-5 h-5" /> Cancel Order
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Order #{cancelModal.id.split('-')[0]}</p>
              </div>
              <button onClick={() => { setCancelModal(null); setCancelReason(''); }} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-error/5 border border-error/20 rounded-xl">
                <p className="text-sm text-error font-medium">This action cannot be undone.</p>
                <p className="text-xs text-on-surface-variant mt-1">The customer and assigned partner (if any) will be notified of the cancellation.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1.5">Reason for Cancellation *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Out of stock, Customer requested cancellation, Invalid prescription..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface focus:outline-none focus:border-error resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-end gap-3">
              <button
                onClick={() => { setCancelModal(null); setCancelReason(''); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={cancelOrder}
                disabled={cancelLoading || !cancelReason.trim()}
                className="px-6 py-2.5 bg-error text-white rounded-xl text-sm font-semibold hover:bg-error/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Cancel Order
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
