import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BannersScreenProps {
  onNavigate: (route: string) => void;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  bg_color: string;
  link: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

const defaultForm = {
  title: '', subtitle: '', image_url: '', bg_color: '#a7f3d0',
  link: '', position: 0, is_active: true,
};

export const BannersScreen: React.FC<BannersScreenProps> = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBanners(); }, []);

  // Listen for global refresh
  useEffect(() => {
    const handler = () => loadBanners();
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const { data } = await supabase.from('banners').select('*').order('position');
    setBanners(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    await supabase.from('banners').update({ is_active: !currentState }).eq('id', id);
    loadBanners();
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...defaultForm, position: banners.length });
    setModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditId(b.id);
    setForm({
      title: b.title, subtitle: b.subtitle, image_url: b.image_url || '',
      bg_color: b.bg_color, link: b.link, position: b.position, is_active: b.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, image_url: form.image_url || null };
    if (editId) {
      await supabase.from('banners').update(payload).eq('id', editId);
    } else {
      await supabase.from('banners').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    loadBanners();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('banners').delete().eq('id', id);
    loadBanners();
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">Banners Management</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage promotional and informational banners displayed on the main portal.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors">
          <Plus className="w-3.5 h-3.5" /> Create Banner
        </button>
      </div>

      {/* Banners List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="py-12 text-center text-on-surface-variant">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-12 text-center">
            <p className="text-on-surface-variant mb-4">No banners yet. Create your first banner.</p>
            <button onClick={openCreate} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 inline mr-1" /> Create Banner
            </button>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                {/* Drag Handle */}
                <GripVertical className="w-5 h-5 text-outline-variant cursor-grab flex-shrink-0" />

                {/* Thumbnail */}
                <div
                  className="w-16 h-12 sm:w-24 sm:h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border border-outline-variant/20"
                  style={{ backgroundColor: banner.bg_color || '#e5eeff' }}
                >
                  {banner.image_url ? (
                    <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-semibold text-on-surface-variant/50">{banner.title.split(' ')[0]}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-on-surface truncate">{banner.title}</h3>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                      banner.is_active ? 'bg-secondary-container/30 text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {banner.is_active ? 'Active' : 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">{banner.subtitle}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Status</span>
                  <button
                    onClick={() => toggleActive(banner.id, banner.is_active)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${banner.is_active ? 'bg-primary' : 'bg-outline-variant'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${banner.is_active ? 'left-5.5 translate-x-0' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(banner)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(banner.id)} className="p-2 rounded-lg hover:bg-error-container/50 text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
              <h3 className="text-lg font-semibold text-on-surface">{editId ? 'Edit Banner' : 'Create Banner'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Subtitle</label>
                <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Image URL</label>
                  <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-[42px] h-[42px] p-1 rounded-lg border border-outline-variant bg-surface-container-low cursor-pointer shrink-0" />
                    <input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1 min-w-0 px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Link URL</label>
                <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/search?category=..." className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <button
                onClick={handleSave} disabled={saving || !form.title}
                className="w-full mt-2 bg-primary text-on-primary font-semibold text-sm py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Save Changes' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
