import React, { useState, useEffect } from 'react';
import { Plus, Edit2, X, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PartnersScreenProps {
  onNavigate: (route: string) => void;
}

interface Partner {
  id: string;
  email: string;
  name: string;
  phone: string;
  region: string;
  city: string;
  is_active: boolean;
  margin_share: number;
  coordinates: string;
  created_at: string;
}

const regions = ['city_north', 'city_south', 'city_east', 'city_west'];

const defaultForm = { name: '', email: '', phone: '', region: 'city_north', city: '', password: '', margin_share: 0, coordinates: '' };

export const PartnersScreen: React.FC<PartnersScreenProps> = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    setLoading(true);
    const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    setPartners(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('partners').update({ is_active: !current }).eq('id', id);
    loadPartners();
  };

  const openCreate = () => {
    setEditId(null);
    setForm(defaultForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Partner) => {
    setEditId(p.id);
    setForm({ name: p.name, email: p.email, phone: p.phone, region: p.region, city: p.city, password: '', margin_share: p.margin_share || 0, coordinates: p.coordinates || '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (editId) {
      // Update partner info
      const update: any = { name: form.name, phone: form.phone, region: form.region, city: form.city, margin_share: Number(form.margin_share), coordinates: form.coordinates };
      await supabase.from('partners').update(update).eq('id', editId);

      // If password provided, update via Auth admin API (will need a server function)
      if (form.password) {
        // Note: Password reset for partners would typically use a server-side function
        setError('Password changes require server-side admin API. Partner can use forgot-password flow.');
      }
    } else {
      // Create new partner: first sign up in auth, then insert partner row
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password || 'TempPass123!',
      });

      if (authError) {
        setError(authError.message);
        setSaving(false);
        return;
      }

      // Insert partner row
      const { error: insertError } = await supabase.from('partners').insert({
        email: form.email,
        name: form.name,
        phone: form.phone,
        region: form.region,
        city: form.city,
        margin_share: Number(form.margin_share),
        coordinates: form.coordinates,
        is_active: true,
      });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    loadPartners();
  };

  const formatRegion = (r: string) => r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">Partners</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage regional delivery partners across the city.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Partner
        </button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-on-surface-variant">Loading partners...</div>
        ) : partners.length === 0 ? (
          <div className="col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-12 text-center">
            <p className="text-on-surface-variant mb-4">No partners yet. Add your first delivery partner.</p>
          </div>
        ) : (
          partners.map((partner) => (
            <div
              key={partner.id}
              className={`bg-surface-container-lowest rounded-xl shadow-sm border p-6 flex flex-col gap-4 transition-all ${
                partner.is_active ? 'border-outline-variant/30 hover:shadow-md' : 'border-outline-variant/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container font-bold text-lg flex items-center justify-center flex-shrink-0">
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">{partner.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      partner.is_active ? 'bg-secondary-container/30 text-on-secondary-container' : 'bg-error-container/30 text-on-error-container'
                    }`}>
                      {partner.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <button onClick={() => openEdit(partner)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
                <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" /> {formatRegion(partner.region)} — {partner.city}</span>
                <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {partner.email}</span>
                {partner.phone && <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {partner.phone}</span>}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-surface-container-high text-on-surface">Margin Share: {partner.margin_share || 0}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                <span className="text-xs text-on-surface-variant">
                  Joined {new Date(partner.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  onClick={() => toggleActive(partner.id, partner.is_active)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${partner.is_active ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${partner.is_active ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[500px] sm:w-[500px] p-6 shrink-0 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-on-surface">{editId ? 'Edit Partner' : 'Add Partner'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-error-container/50 text-on-error-container rounded-lg text-xs">{error}</div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Partner Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!editId}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
              {!editId && (
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Region</label>
                  <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary cursor-pointer">
                    {regions.map(r => <option key={r} value={r}>{formatRegion(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">City</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Gorakhpur" className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Margin Share (%)</label>
                  <input type="number" step="0.1" value={form.margin_share} onChange={(e) => setForm({ ...form, margin_share: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Location (Co-ordinates)</label>
                  <input value={form.coordinates} onChange={(e) => setForm({ ...form, coordinates: e.target.value })} placeholder="e.g. 26.76, 83.37" className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <button
                onClick={handleSave} disabled={saving || !form.name || !form.email}
                className="w-full mt-2 bg-primary text-on-primary font-semibold text-sm py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Save Changes' : 'Create Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
