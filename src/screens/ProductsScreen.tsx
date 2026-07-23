import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductsScreenProps {
  onNavigate: (route: string) => void;
}

interface Product {
  id: string;
  name: string;
  generic_name: string;
  price: number;
  mrp: number;
  grower_name: string;
  description: string;
  category: string;
  created_at: string;
}

const defaultForm = {
  name: '',
  generic_name: '',
  company: '',
  mrp: 0,
  category: '' as string,
  description: '',
};

const categories = ['All', 'Botanical', 'Allopathy', 'Ayush', 'Analgesic', 'Cardiac', 'Immunology', 'Wellness'];

type SourceFilter = 'all' | 'dynamic' | 'approved';

export const ProductsScreen: React.FC<ProductsScreenProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Catalog Search State
  const [catalogSuggestions, setCatalogSuggestions] = useState<any[]>([]);
  const [catalogSearchLoading, setCatalogSearchLoading] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const pageSize = 10;

  useEffect(() => { loadProducts(); }, [page, categoryFilter, sourceFilter]);

  // Listen for global refresh
  useEffect(() => {
    const handler = () => loadProducts();
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, []);

  const searchCatalog = async (query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length < 3) {
      setCatalogSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setCatalogSearchLoading(true);
      const { data } = await supabase
        .from('medicine_catalog')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(8);
      
      setCatalogSuggestions(data || []);
      setCatalogSearchLoading(false);
    }, 400);
  };

  const selectCatalogItem = (item: any) => {
    setForm(prev => ({
      ...prev,
      name: item.name,
      generic_name: item.short_composition1 || item.salt_composition || '',
      mrp: item.price || 0,
      description: item.medicine_desc || '',
    }));
    setCatalogSuggestions([]);
  };

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('name')
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (categoryFilter !== 'All') query = query.eq('category', categoryFilter);
    
    // Source filter
    if (sourceFilter === 'dynamic') query = query.eq('description', 'auto-added');
    if (sourceFilter === 'approved') query = query.neq('description', 'auto-added');

    const { data, count } = await query;
    setProducts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(defaultForm);
    setCatalogSuggestions([]);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      generic_name: p.generic_name || '',
      company: p.grower_name || '',
      mrp: p.mrp,
      category: p.category || '',
      description: p.description || '',
    });
    setCatalogSuggestions([]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: any = {
      name: form.name,
      generic_name: form.generic_name,
      grower_name: form.company,
      price: Number(form.mrp),
      mrp: Number(form.mrp),
      category: form.category || null,
      description: form.description,
    };

    if (editId) {
      await supabase.from('products').update(payload).eq('id', editId);
    } else {
      await supabase.from('products').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setDeleteConfirm(null);
    loadProducts();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const filtered = searchQuery
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const inputCls = "w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary";

  const sourceTabCls = (tab: SourceFilter) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
      sourceFilter === tab
        ? 'bg-primary text-on-primary shadow-sm'
        : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
    }`;

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 w-full max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-[32px] sm:leading-[40px] font-semibold text-on-surface">Products</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text" placeholder="Search products..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button onClick={openCreateModal} className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors whitespace-nowrap">
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

        {/* Source Tabs */}
        <div className="flex gap-2">
          <button onClick={() => { setSourceFilter('all'); setPage(1); }} className={sourceTabCls('all')}>All</button>
          <button onClick={() => { setSourceFilter('dynamic'); setPage(1); }} className={sourceTabCls('dynamic')}>Dynamic</button>
          <button onClick={() => { setSourceFilter('approved'); setPage(1); }} className={sourceTabCls('approved')}>Approved</button>
        </div>

        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant">
          Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
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
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Company</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Category</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">MRP</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">No products found</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-4"><input type="checkbox" className="rounded border-outline-variant" /></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 border border-outline-variant/20">
                          <span className="text-lg">💊</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{p.name}</p>
                          <p className="text-[10px] text-outline font-mono">ID: {p.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-on-surface-variant">{p.grower_name || '—'}</span>
                    </td>
                    <td className="py-4 px-4">
                      {p.category ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/5 text-primary border border-primary/10">
                          {p.category}
                        </span>
                      ) : (
                        <span className="text-xs text-outline">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold text-on-surface">₹{p.mrp}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(p)} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-lg hover:bg-error-container/50 text-on-surface-variant hover:text-error transition-colors">
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
          <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[560px] p-6 shrink-0 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-on-surface">{editId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block flex items-center justify-between">
                  <span>Medicine Name <span className="text-error">*</span></span>
                  {catalogSearchLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </label>
                <input 
                  value={form.name} 
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    searchCatalog(e.target.value);
                  }} 
                  className={inputCls} 
                  autoComplete="off"
                />
                
                {/* Catalog Suggestions Dropdown */}
                {catalogSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {catalogSuggestions.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/10 last:border-0"
                        onClick={() => selectCatalogItem(item)}
                      >
                        <div className="text-sm font-semibold text-on-surface">{item.name}</div>
                        <div className="text-xs text-on-surface-variant flex justify-between mt-1">
                          <span className="truncate max-w-[70%]">{item.manufacturer_name}</span>
                          <span className="shrink-0 text-primary">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Generic / Composition</label>
                  <input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Company</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls + ' cursor-pointer'}>
                    <option value="">None</option>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">MRP (₹) <span className="text-error">*</span></label>
                  <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls + ' resize-none'} />
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
