import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductsScreenProps {
  onNavigate: (route: string) => void;
}

interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  price: number;
  mrp: number;
  in_stock: boolean;
  image_url: string | null;
  description: string;
  manufacturer: string;
}

const defaultForm: Omit<Medicine, 'id'> = {
  name: '', generic_name: '', category: 'Antibiotics', price: 0, mrp: 0,
  in_stock: true, image_url: null, description: '', manufacturer: '',
};

const categories = ['All', 'Antibiotics', 'Pain Relief', 'Cardiac', 'Diabetes', 'Vitamins', 'Dermatology', 'Respiratory', 'Gastrointestinal'];

export const ProductsScreen: React.FC<ProductsScreenProps> = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'outofstock'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => { loadMedicines(); }, [page, categoryFilter, stockFilter]);

  const loadMedicines = async () => {
    setLoading(true);
    let query = supabase
      .from('medicines')
      .select('*', { count: 'exact' })
      .order('name')
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (categoryFilter !== 'All') query = query.eq('category', categoryFilter);
    if (stockFilter === 'instock') query = query.eq('in_stock', true);
    if (stockFilter === 'outofstock') query = query.eq('in_stock', false);

    const { data, count } = await query;
    setMedicines(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditId(med.id);
    setForm({
      name: med.name, generic_name: med.generic_name, category: med.category,
      price: med.price, mrp: med.mrp, in_stock: med.in_stock,
      image_url: med.image_url, description: med.description, manufacturer: med.manufacturer,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editId) {
      await supabase.from('medicines').update(form).eq('id', editId);
    } else {
      await supabase.from('medicines').insert(form);
    }
    setSaving(false);
    setModalOpen(false);
    loadMedicines();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('medicines').delete().eq('id', id);
    setDeleteConfirm(null);
    loadMedicines();
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const filtered = searchQuery
    ? medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : medicines;

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[32px] leading-[40px] font-semibold text-on-surface">Products</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text" placeholder="Search products..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button onClick={openCreateModal} className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary cursor-pointer"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={stockFilter} onChange={(e) => { setStockFilter(e.target.value as any); setPage(1); }}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">Stock Status</option>
          <option value="instock">In Stock</option>
          <option value="outofstock">Out of Stock</option>
        </select>
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/30">
                <th className="py-3 px-4 w-10"><input type="checkbox" className="rounded border-outline-variant" /></th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Product Details</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Category</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Price (MRP)</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">No products found</td></tr>
              ) : (
                filtered.map((med) => (
                  <tr key={med.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-4"><input type="checkbox" className="rounded border-outline-variant" /></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 border border-outline-variant/20 overflow-hidden">
                          {med.image_url ? (
                            <img src={med.image_url} alt={med.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">💊</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{med.name}</p>
                          <p className="text-xs text-on-surface-variant">Generic: {med.generic_name || 'N/A'}</p>
                          <p className="text-[10px] text-outline font-mono">ID: {med.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10">
                        {med.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold text-on-surface">₹{med.price}</div>
                      {med.mrp > med.price && (
                        <div className="text-xs text-on-surface-variant line-through">₹{med.mrp}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-semibold flex items-center gap-1.5 ${med.in_stock ? 'text-secondary' : 'text-error'}`}>
                        <span className={`w-2 h-2 rounded-full ${med.in_stock ? 'bg-secondary' : 'bg-error'}`} />
                        {med.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(med)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(med.id)} className="p-2 rounded-lg hover:bg-error-container/50 text-on-surface-variant hover:text-error transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[500px] sm:w-[500px] p-6 shrink-0 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-on-surface">{editId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Medicine Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Generic Name</label>
                  <input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary cursor-pointer">
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Price (₹)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">MRP (₹)</label>
                  <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Manufacturer</label>
                <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} className="sr-only peer" />
                  <div className="w-9 h-5 bg-outline-variant rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-on-surface-variant">In Stock</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="w-full mt-2 bg-primary text-on-primary font-semibold text-sm py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-sm p-6 m-4 text-center">
            <h3 className="text-lg font-semibold text-on-surface mb-2">Delete Product?</h3>
            <p className="text-sm text-on-surface-variant mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-error text-on-error rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
