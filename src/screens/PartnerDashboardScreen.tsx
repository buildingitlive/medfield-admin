import React, { useState, useEffect } from 'react';
import { Package, Clock, MapPin, Phone, X, Loader2, History, CheckCircle2, IndianRupee, Users, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PartnerDashboardScreenProps {
  onNavigate: (route: string) => void;
}

interface PartnerOrder {
  id: string;
  created_at: string;
  total: number;
  discount_percent?: number;
  status: string;
  user_id: string;
  items: any[];
  address_snapshot: any;
  prescription_url?: string | null;
  profiles?: { name: string; phone: string; email: string } | null;
}

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = () => {
  const { partnerProfile } = useAuth();
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [marking, setMarking] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (partnerProfile) loadOrders();
  }, [partnerProfile]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, total, discount_percent, status, user_id, items:order_confirmed_items(*), address_snapshot, prescription_url')
      .eq('assigned_partner_id', partnerProfile?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Supabase Error loading orders:", error);
    }
    
    setOrders(data || []);
    setLoading(false);
  };

  const markDelivered = async (orderId: string) => {
    setMarking(true);
    await supabase.from('orders').update({ status: 'Delivered' }).eq('id', orderId);
    
    // Emit notifications
    const targetOrder = orders.find(o => o.id === orderId);
    const shortId = orderId.split('-')[0];
    await supabase.from('notifications').insert([
      {
        recipient_type: 'admin',
        title: `Order #${shortId} Delivered`,
        description: `Order successfully delivered by partner ${partnerProfile?.name || 'Partner'}.`,
        type: 'order_delivered',
        link: '/orders',
        is_read: false
      },
      {
        recipient_type: 'user',
        recipient_id: targetOrder?.user_id || null,
        title: 'Order Delivered 🎉',
        description: `Your order #${shortId} has been delivered successfully. Thank you for choosing MedField!`,
        type: 'order_delivered',
        link: '/orders',
        is_read: false
      }
    ]);

    setMarking(false);
    setSelectedOrder(null);
    loadOrders();
  };



  const pendingOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'cancelled' && o.status !== 'Cancelled');
  const historyOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'cancelled' || o.status === 'Cancelled');
  const totalCustomers = new Set(orders.map(o => o.user_id)).size;
  const marginShare = partnerProfile?.margin_share || 0;
  const totalSales = orders.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + (o.total || 0), 0);
  const revenueAfterMargin = totalSales * (1 - (marginShare / 100));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Placed': return 'bg-amber-100 text-amber-800';
      case 'Verified by Pharmacy': return 'bg-blue-100 text-blue-800';
      case 'Dispatched from Field Warehouse': return 'bg-indigo-100 text-indigo-800';
      case 'Out for Delivery': return 'bg-orange-100 text-orange-800';
      case 'Delivered': return 'bg-secondary-container/30 text-on-secondary-container';
      case 'cancelled':
      case 'Cancelled': return 'bg-error/10 text-error';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  const formatRegion = (r: string) => r?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  const renderOrderDetailsContent = (order: PartnerOrder) => {
    const isActive = order.status !== 'Delivered' && order.status !== 'cancelled' && order.status !== 'Cancelled';
    return (
      <>
        <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Order Details</h3>
            <p className="text-xs text-on-surface-variant font-mono">#{order.id.split('-')[0]}</p>
          </div>
          <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-surface-container rounded-full transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Status banner if completed */}
        {!isActive && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-center gap-2 border-b border-outline-variant/20 ${
            order.status === 'Delivered' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'
          }`}>
            {order.status === 'Delivered' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            Status: {order.status} ({new Date(order.created_at).toLocaleDateString('en-IN')})
          </div>
        )}

        {/* Map View */}
        {order.address_snapshot?.latitude && order.address_snapshot?.longitude ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${order.address_snapshot.latitude},${order.address_snapshot.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-36 bg-primary/5 flex flex-col items-center justify-center gap-2 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors cursor-pointer border-b border-outline-variant/20"
          >
            <MapPin className="w-6 h-6" />
            Open in Google Maps
          </a>
        ) : (
          <div className="h-36 bg-surface-container flex items-center justify-center text-on-surface-variant text-xs border-b border-outline-variant/20">
            📍 No GPS coordinates available
          </div>
        )}

        {/* Customer Info */}
        <div className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center shrink-0">
              {(order.address_snapshot?.name || order.address_snapshot?.recipient_name || order.profiles?.name || order.user_id).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-on-surface truncate">{order.address_snapshot?.name || order.address_snapshot?.recipient_name || order.profiles?.name || order.user_id.split('-')[0]}</p>
              {order.address_snapshot?.phone && (
                <p className="text-xs font-mono text-on-surface-variant">{order.address_snapshot.phone}</p>
              )}
            </div>
            {order.address_snapshot?.phone && (
              <a 
                href={`tel:${order.address_snapshot.phone}`}
                className="p-2.5 bg-primary/10 rounded-full text-primary hover:bg-primary/20 transition-colors"
                title="Call Customer"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
          {order.address_snapshot && (
            <div className="text-xs text-on-surface-variant flex items-start gap-2 bg-surface-container-low p-3 rounded-lg">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
              <span>
                {order.address_snapshot.street ? `${order.address_snapshot.street}, ` : ''}{order.address_snapshot.city}, {order.address_snapshot.state} - {order.address_snapshot.pincode}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-5 border-b border-outline-variant/20">
          <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Order Items</h4>
          <div className="flex flex-col gap-2.5">
            {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
              <div key={i} className="flex flex-col gap-1 text-sm pb-2 border-b border-outline-variant/10 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <span className="text-on-surface font-medium flex items-start gap-2">
                    <span className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant mt-0.5 shrink-0">x{item.quantity}</span>
                    <span>
                      {item.medicine_name}
                      {item.company && <span className="block text-xs text-on-surface-variant font-normal">{item.company}</span>}
                    </span>
                  </span>
                  <span className="text-on-surface font-medium whitespace-nowrap ml-2">₹{(item.mrp * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-on-surface-variant pl-7">
                  <span>MRP: ₹{item.mrp.toFixed(2)} / item</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-outline-variant/20 space-y-1.5">
            {order.discount_percent && order.discount_percent > 0 ? (
              <>
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>₹{(order.total / (1 - order.discount_percent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-primary">
                  <span>Discount ({order.discount_percent}%)</span>
                  <span>- ₹{((order.total / (1 - order.discount_percent / 100)) - order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-outline-variant/10">
                  <span className="text-sm font-semibold text-on-surface">Total Amount</span>
                  <span className="text-base font-bold text-primary">₹{(order.total || 0).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between pt-1">
                <span className="text-sm font-semibold text-on-surface">Total Amount</span>
                <span className="text-base font-bold text-primary">₹{(order.total || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prescription if attached */}
        {order.prescription_url && (
          <div className="p-5 border-b border-outline-variant/20">
            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Prescription
            </h4>
            <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <div
                className="w-20 h-20 rounded-lg overflow-hidden border border-outline-variant/30 bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(supabase.storage.from('prescriptions').getPublicUrl(order.prescription_url!).data.publicUrl, '_blank')}
              >
                <img
                  src={supabase.storage.from('prescriptions').getPublicUrl(order.prescription_url!).data.publicUrl}
                  alt="Prescription"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-on-surface-variant break-all mb-1.5">{order.prescription_url.split('/').pop()}</p>
                <button
                  onClick={() => window.open(supabase.storage.from('prescriptions').getPublicUrl(order.prescription_url!).data.publicUrl, '_blank')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  View Full Image →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions for Active Orders */}
        {isActive ? (
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Delivery Notes</label>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Add notes for the delivery..."
                rows={2}
                className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <button
              onClick={() => markDelivered(order.id)}
              disabled={marking}
              className="w-full bg-primary text-on-primary font-semibold text-sm py-3 rounded-xl hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <> <CheckCircle2 className="w-4 h-4" /> Mark as Delivered </>}
            </button>
          </div>
        ) : (
          <div className="p-5 text-center text-xs text-on-surface-variant">
            This order is in your delivery history and cannot be modified.
          </div>
        )}
      </>
    );
  };

  const displayedOrders = activeTab === 'active' ? pendingOrders : historyOrders;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col gap-6 sm:gap-8 w-full max-w-[1200px] mx-auto">
      {/* Welcome */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-on-surface tracking-tight">
            Welcome, {partnerProfile?.name || 'Partner'}
          </h1>
          {partnerProfile?.region && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              🚚 {formatRegion(partnerProfile.region)}
            </span>
          )}
        </div>
        <p className="text-sm text-on-surface-variant">Here is your delivery dashboard & order history.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-l-primary border border-outline-variant/30 p-5 sm:p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total Sales Delivered</span>
            <IndianRupee className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-semibold text-on-surface">{loading ? '...' : `₹${revenueAfterMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
          <p className="text-xs text-on-surface-variant mt-1">From completed deliveries (Margin deducted)</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-l-secondary border border-outline-variant/30 p-5 sm:p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Customers Reached</span>
            <Users className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-3xl font-semibold text-on-surface">{loading ? '...' : totalCustomers}</div>
          <p className="text-xs text-on-surface-variant mt-1">Unique households served across orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-2">
        <button
          onClick={() => { setActiveTab('active'); setSelectedOrder(null); }}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Package className="w-4 h-4" />
          Active Orders ({pendingOrders.length})
        </button>
        <button
          onClick={() => { setActiveTab('history'); setSelectedOrder(null); }}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <History className="w-4 h-4" />
          Order History ({historyOrders.length})
        </button>
      </div>

      {/* Orders Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Orders List */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4">
          {loading ? (
            <div className="py-12 text-center text-on-surface-variant"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading orders...</div>
          ) : displayedOrders.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-8 text-center text-on-surface-variant">
              {activeTab === 'active'
                ? 'No active deliveries right now. 🎉'
                : 'No order history found.'}
            </div>
          ) : (
            displayedOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <span className="font-mono text-xs font-semibold text-on-surface-variant">#{order.id.split('-')[0]}</span>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${getStatusColor(order.status)}`}>
                    {order.status === 'Verified by Pharmacy' ? 'En Route' : order.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2 truncate">
                  {order.address_snapshot?.name || order.address_snapshot?.recipient_name || order.profiles?.name || order.user_id.split('-')[0]}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {order.address_snapshot?.city || 'N/A'}</span>
                </div>
                <div className="mt-3.5 flex gap-2 pt-3 border-t border-outline-variant/20">
                  <a 
                    href={order.address_snapshot?.phone ? `tel:${order.address_snapshot.phone}` : '#'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!order.address_snapshot?.phone) e.preventDefault();
                    }}
                    className="flex-1 py-2 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary" /> Call Customer
                  </a>
                  {order.address_snapshot?.latitude && order.address_snapshot?.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.address_snapshot.latitude},${order.address_snapshot.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="py-2 px-3.5 border border-outline-variant rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center gap-1"
                      title="Open in Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Map
                    </a>
                  ) : (
                    <button className="py-2 px-3 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface-variant opacity-40 cursor-not-allowed" disabled>
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Detail Side Panel (Desktop >= md) */}
        {selectedOrder && (
          <div className="hidden md:flex w-[400px] flex-shrink-0 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex-col overflow-y-auto max-h-[calc(100vh-200px)]">
            {renderOrderDetailsContent(selectedOrder)}
          </div>
        )}

        {/* Order Detail Modal (Mobile < md) */}
        {selectedOrder && createPortal(
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 md:hidden animate-in fade-in duration-200" onClick={() => setSelectedOrder(null)}>
            <div className="w-full sm:w-[420px] max-h-[90vh] bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-y-auto animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
              {renderOrderDetailsContent(selectedOrder)}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
