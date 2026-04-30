import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Plus, Edit2, Trash2, Loader2, Package, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RestaurantMenu() {
  const qc = useQueryClient()
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [catName, setCatName] = useState('')
  const [itemForm, setItemForm] = useState({ name:'', description:'', price:'', category:'', type:'product', duration:'' })
  const [imageFile, setImageFile] = useState(null)

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => api.get('/menu/categories').then(r => r.data),
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', selectedCat],
    queryFn: () => api.get('/menu/items', { params: { categoryId: selectedCat } }).then(r => r.data),
  })

  const addCategory = useMutation({
    mutationFn: () => api.post('/menu/categories', { name: catName }),
    onSuccess: () => { qc.invalidateQueries(['menu-categories']); setCatName(''); setShowAddCategory(false); toast.success('Category added') },
    onError: () => toast.error('Failed to add category'),
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries(['menu-categories', 'menu-items']); setSelectedCat(null); toast.success('Category deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const saveItem = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      Object.entries(itemForm).forEach(([k, v]) => fd.append(k, v))
      if (imageFile) fd.append('image', imageFile)
      if (editItem) return api.patch(`/menu/items/${editItem._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return api.post('/menu/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      qc.invalidateQueries(['menu-items'])
      setShowAddItem(false); setEditItem(null)
      setItemForm({ name:'', description:'', price:'', category: selectedCat || '', type:'product', duration:'' })
      setImageFile(null)
      toast.success(editItem ? 'Item updated' : 'Item added')
    },
    onError: () => toast.error('Failed to save item'),
  })

  const deleteItem = useMutation({
    mutationFn: (id) => api.delete(`/menu/items/${id}`),
    onSuccess: () => { qc.invalidateQueries(['menu-items']); toast.success('Item deleted') },
  })

  const toggleAvail = useMutation({
    mutationFn: ({ id, isAvailable }) => api.patch(`/menu/items/${id}`, { isAvailable: String(!isAvailable) }),
    onSuccess: () => qc.invalidateQueries(['menu-items']),
  })

  const startEditItem = (item) => {
    setEditItem(item)
    setItemForm({ name: item.name, description: item.description||'', price: String(item.price), category: item.category?._id||item.category, type: item.type||'product', duration: item.duration ? String(item.duration) : '' })
    setShowAddItem(true)
  }

  const openAddItem = () => {
    setEditItem(null)
    setItemForm({ name:'', description:'', price:'', category: selectedCat || (categories[0]?._id || ''), type:'product', duration:'' })
    setImageFile(null)
    setShowAddItem(true)
  }

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      {/* Categories Sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-surface-900 text-sm">Categories</h3>
          <button onClick={() => setShowAddCategory(true)} className="btn-primary py-1 px-2 text-xs"><Plus size={13} /></button>
        </div>

        {showAddCategory && (
          <div className="card p-3 flex gap-2">
            <input className="input py-1.5 text-xs flex-1" placeholder="Category name" value={catName} onChange={e => setCatName(e.target.value)} autoFocus />
            <button onClick={() => addCategory.mutate()} disabled={!catName.trim() || addCategory.isPending} className="btn-primary py-1 px-2">
              {addCategory.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button onClick={() => setShowAddCategory(false)} className="btn-secondary py-1 px-2"><X size={12} /></button>
          </div>
        )}

        <div className="space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCat ? 'bg-brand-50 text-brand-700 font-medium border border-brand-100' : 'text-surface-600 hover:bg-surface-50'}`}
          >
            All Items
          </button>
          {catsLoading ? <Loader2 className="animate-spin mx-auto text-surface-300" size={16} /> :
            categories.map(cat => (
              <div key={cat._id} className={`group flex items-center rounded-lg transition-colors ${selectedCat === cat._id ? 'bg-brand-50 border border-brand-100' : 'hover:bg-surface-50'}`}>
                <button onClick={() => setSelectedCat(cat._id)}
                  className={`flex-1 text-left px-3 py-2 text-sm ${selectedCat === cat._id ? 'text-brand-700 font-medium' : 'text-surface-600'}`}>
                  {cat.name}
                </button>
                <button onClick={() => deleteCategory.mutate(cat._id)} className="hidden group-hover:flex px-2 py-2 text-surface-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-surface-900 text-sm">
            Catalog Items {items.length > 0 && <span className="text-surface-400 font-normal">({items.length})</span>}
          </h3>
          <button onClick={openAddItem} className="btn-primary">
            <Plus size={15} /> Add Item
          </button>
        </div>

        <div className="overflow-y-auto grid grid-cols-1 gap-3">
          {itemsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-surface-400" size={24} /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-surface-400">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No items yet. Add your first catalog item!</p>
            </div>
          ) : items.map(item => (
            <div key={item._id} className={`card p-4 flex items-start gap-4 ${!item.isAvailable ? 'opacity-60' : ''}`}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                : <div className="w-16 h-16 bg-surface-100 rounded-xl flex items-center justify-center shrink-0 text-2xl">📦</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className="font-semibold text-surface-900">{item.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.type === 'service' ? 'bg-blue-100 text-blue-700' : 'bg-surface-100 text-surface-600'}`}>
                    {item.type === 'service' ? 'Service' : 'Product'}
                  </span>
                </div>
                <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">{item.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-brand-600">₹{item.price}</span>
                  {item.duration && <span className="text-xs text-blue-500">{item.duration} min</span>}
                  <span className="text-xs text-surface-400">{item.category?.name}</span>
                  <span className="text-xs text-surface-400">{item.totalOrdered} orders</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleAvail.mutate({ id: item._id, isAvailable: item.isAvailable })}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${item.isAvailable ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-surface-100 text-surface-500 hover:bg-green-100 hover:text-green-700'}`}>
                  {item.isAvailable ? 'Available' : 'Hidden'}
                </button>
                <button onClick={() => startEditItem(item)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => { if (confirm('Delete this item?')) deleteItem.mutate(item._id) }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-surface-900">{editItem ? 'Edit Item' : 'Add Catalog Item'}</h3>
              <button onClick={() => { setShowAddItem(false); setEditItem(null) }} className="text-surface-400 hover:text-surface-700"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Item Name *</label>
                <input className="input" placeholder="e.g. Haircut, Laptop Stand" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[70px] resize-none" placeholder="Short description..." value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹) *</label>
                  <input type="number" className="input" placeholder="0" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Item Type</label>
                  <select className="input" value={itemForm.type} onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="product">📦 Product</option>
                    <option value="service">🛠️ Service</option>
                  </select>
                </div>
              </div>
              {itemForm.type === 'service' && (
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input type="number" className="input" placeholder="e.g. 30" value={itemForm.duration} onChange={e => setItemForm(f => ({ ...f, duration: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="label">Category *</label>
                <select className="input" value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Image (optional)</label>
                <input type="file" accept="image/*" className="input text-xs" onChange={e => setImageFile(e.target.files[0])} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => saveItem.mutate()} disabled={!itemForm.name || !itemForm.price || !itemForm.category || saveItem.isPending} className="btn-primary flex-1 justify-center">
                {saveItem.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {editItem ? 'Update Item' : 'Add Item'}
              </button>
              <button onClick={() => { setShowAddItem(false); setEditItem(null) }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
