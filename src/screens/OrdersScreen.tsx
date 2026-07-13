import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronLeft, ChevronRight, MoreVertical, X, ArrowUp, ArrowDown, MapPin, Package, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrdersScreenProps {
  onNavigate: (route: string) => void;
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
  address_snapshot?: any;
  profiles?: { name: string; email: string; phone: string } | null;
}

interface Partner {
  id: string;
  name: string;
  region: string;
}

type SortField = 'id' | 'created_at' | 'total' | 'status' | 'user_id';
type SortDirection = 'asc' | 'desc';

export const OrdersScreen: React.FC<OrdersScreenProps> = () => {
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

  const loadPartners = async () => {
    const { data } = await supabase.from('partners').select('id, name, region').eq('is_active', true);
    setPartners(data || []);
  };

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('id, created_at, total, delivery_fee, status, user_id, assigned_partner_id, address_snapshot, items:order_items(*)', { count: 'exact' })
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
    // Bulk assign
    const { error } = await supabase.from('orders').update({ assigned_partner_id: partnerId, status: 'Verified by Pharmacy' }).in('id', orderIds);
    if (error) {
      alert('Failed to assign partner: ' + error.message);
      return;
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Order Placed': 'bg-amber-100 text-amber-800',
      'Verified by Pharmacy': 'bg-blue-100 text-blue-800',
      'Dispatched from Field Warehouse': 'bg-indigo-100 text-indigo-800',
      'Out for Delivery': 'bg-orange-100 text-orange-800',
      'Delivered': 'bg-secondary-container/30 text-on-secondary-container',
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
          <option value="Order Placed">Order Placed</option>
          <option value="Verified by Pharmacy">Verified by Pharmacy</option>
          <option value="Dispatched from Field Warehouse">Dispatched</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
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
              onClick={() => setAssignModal({ orderIds: selectedOrders, open: true })}
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
                  const itemCount = Array.isArray(order.items) ? order.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0) : 0;
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
                        {itemCount} items
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {!order.assigned_partner_id && order.status === 'Order Placed' ? (
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
                {!detailsModal.assigned_partner_id && detailsModal.status === 'Order Placed' && (
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
                      <p className="font-medium">{detailsModal.address_snapshot.name}</p>
                      <p className="text-on-surface-variant mt-1">
                        {detailsModal.address_snapshot.house_no}, {detailsModal.address_snapshot.area}
                      </p>
                      <p className="text-on-surface-variant">
                        {detailsModal.address_snapshot.landmark && `${detailsModal.address_snapshot.landmark}, `}
                        {detailsModal.address_snapshot.city}
                      </p>
                      <p className="text-on-surface-variant mt-1">📞 {detailsModal.address_snapshot.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Order Items
                </h3>
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden divide-y divide-outline-variant/20">
                  {detailsModal.items && detailsModal.items.length > 0 ? (
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
                    <div className="p-4 text-center text-sm text-on-surface-variant">No items recorded.</div>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/30">
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>{formatCurrency(detailsModal.total - (detailsModal.delivery_fee || 0))}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(detailsModal.delivery_fee || 0)}</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-outline-variant/30 flex justify-between font-semibold text-lg text-on-surface">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(detailsModal.total)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
