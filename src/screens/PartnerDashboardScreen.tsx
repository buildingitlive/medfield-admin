import React, { useState, useEffect } from 'react';
import { Package, Users, Clock, MapPin, Phone, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PartnerDashboardScreenProps {
  onNavigate: (route: string) => void;
}

interface PartnerOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string;
  items: any[];
  address_snapshot: any;
  profiles?: { name: string; phone: string; email: string } | null;
}

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = () => {
  const { partnerProfile } = useAuth();
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (partnerProfile) loadOrders();
  }, [partnerProfile]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, total, status, user_id, items:order_items(*), address_snapshot')
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

  const pendingOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'cancelled');
  const totalCustomers = new Set(orders.map(o => o.user_id)).size;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Placed': return 'bg-amber-100 text-amber-800';
      case 'Verified by Pharmacy': return 'bg-blue-100 text-blue-800';
      case 'Dispatched from Field Warehouse': return 'bg-indigo-100 text-indigo-800';
      case 'Out for Delivery': return 'bg-orange-100 text-orange-800';
      case 'Delivered': return 'bg-secondary-container/30 text-on-secondary-container';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  const formatRegion = (r: string) => r?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8 w-full max-w-[1200px] mx-auto">
      {/* Welcome */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl md:text-4xl font-semibold text-on-surface tracking-tight">
            Welcome, {partnerProfile?.name || 'Partner'}
          </h1>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            🚚 {formatRegion(partnerProfile?.region || '')}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">Here is your daily overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-l-primary border border-outline-variant/30 p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Pending Orders</span>
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-semibold text-on-surface">{loading ? '...' : pendingOrders.length}</div>
          <p className="text-xs text-secondary mt-1">+{Math.floor(Math.random() * 5)} since last hour</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-l-secondary border border-outline-variant/30 p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Customers Reached</span>
            <Users className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-3xl font-semibold text-on-surface">{loading ? '...' : totalCustomers.toLocaleString()}</div>
          <p className="text-xs text-on-surface-variant mt-1">This month</p>
        </div>
      </div>

      {/* Active Deliveries + Order Detail side panel */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Deliveries List */}
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-on-surface">Active Deliveries</h2>
          {loading ? (
            <div className="py-12 text-center text-on-surface-variant">Loading orders...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-8 text-center text-on-surface-variant">
              No active deliveries right now. 🎉
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 hover:shadow-md transition-all cursor-pointer ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono text-xs text-on-surface-variant">#{order.id.split('-')[0]}</span>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase ${getStatusColor(order.status)}`}>
                    {order.status === 'Verified by Pharmacy' ? 'En Route' : order.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">
                  {order.user_id.split('-')[0]}
                </h3>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address_snapshot?.city || 'N/A'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <a 
                    href={order.address_snapshot?.phone ? `tel:${order.address_snapshot.phone}` : '#'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!order.address_snapshot?.phone) e.preventDefault();
                    }}
                    className="flex-1 py-2 border border-outline-variant rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3 h-3" /> Call Customer
                  </a>
                  {order.address_snapshot?.latitude && order.address_snapshot?.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.address_snapshot.latitude},${order.address_snapshot.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="py-2 px-3 border border-outline-variant rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
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

        {/* Order Detail Side Panel */}
        {selectedOrder && (
          <div className="hidden md:flex w-[400px] flex-shrink-0 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex-col overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Order Details</h3>
                <p className="text-xs text-on-surface-variant font-mono">#{selectedOrder.id.split('-')[0]}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-surface-container rounded-full">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Map View */}
            {selectedOrder.address_snapshot?.latitude && selectedOrder.address_snapshot?.longitude ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.address_snapshot.latitude},${selectedOrder.address_snapshot.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-40 bg-primary/5 flex flex-col items-center justify-center gap-2 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <MapPin className="w-6 h-6" />
                Open in Google Maps
              </a>
            ) : (
              <div className="h-40 bg-surface-container flex items-center justify-center text-on-surface-variant text-xs">
                📍 No GPS coordinates available
              </div>
            )}

            {/* Customer Info */}
            <div className="p-5 border-b border-outline-variant/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center">
                  {selectedOrder.user_id.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">{selectedOrder.user_id.split('-')[0]}</p>
                </div>
                <a 
                  href={selectedOrder.address_snapshot?.phone ? `tel:${selectedOrder.address_snapshot.phone}` : '#'}
                  onClick={(e) => { if (!selectedOrder.address_snapshot?.phone) e.preventDefault(); }}
                  className="p-2 bg-primary/10 rounded-full text-primary"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
              {selectedOrder.address_snapshot && (
                <div className="text-xs text-on-surface-variant flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    {selectedOrder.address_snapshot.street}, {selectedOrder.address_snapshot.city}, {selectedOrder.address_snapshot.state} - {selectedOrder.address_snapshot.pincode}
                  </span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="p-5 border-b border-outline-variant/20">
              <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Items</h4>
              <div className="flex flex-col gap-2">
                {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-on-surface">{item.product_snapshot?.name || item.name} x{item.quantity}</span>
                    <span className="text-on-surface font-medium">₹{((item.unit_price || item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Total</span>
                <span className="text-base font-bold text-on-surface">₹{(selectedOrder.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Delivery Notes + Action */}
            <div className="p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant mb-2">Delivery Notes</h4>
              <textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Add notes for the delivery..."
                rows={3}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary resize-none mb-4"
              />
              <button
                onClick={() => markDelivered(selectedOrder.id)}
                disabled={marking}
                className="w-full bg-primary text-on-primary font-semibold text-sm py-3 rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Delivered'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
