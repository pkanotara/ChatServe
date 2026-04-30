import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Search, ChevronRight, ToggleLeft, ToggleRight, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  active: 'badge-active',
  pending_meta: 'badge-pending',
  onboarding: 'badge-pending',
  inactive: 'badge-inactive',
  suspended: 'badge-error',
}

export default function AdminRestaurants() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurants', search, statusFilter, page],
    queryFn: () => api.get('/admin/restaurants', {
      params: { search, status: statusFilter, page, limit: 20 }
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, newStatus }) => api.patch(`/admin/restaurants/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-restaurants'])
      toast.success('Business status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteRestaurant = useMutation({
    mutationFn: (id) => api.delete(`/admin/restaurants/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-restaurants'])
      toast.success(res.data?.message || 'Business deleted successfully')
      setConfirmDeleteId(null)
    },
    onError: () => {
      toast.error('Failed to delete business')
      setConfirmDeleteId(null)
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-surface-900">Businesses</h2>
          <p className="text-surface-500 text-sm mt-0.5">{data?.meta?.total ?? 0} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search businesses..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending_meta">Pending Meta</option>
          <option value="onboarding">Onboarding</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">Business</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">Bot</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-surface-400">
                  <Loader2 className="animate-spin mx-auto" size={24} />
                </td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-surface-400">No businesses found</td></tr>
              ) : data?.data?.map(r => (
                <tr key={r._id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.logoUrl
                        ? <img src={r.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        : <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-sm">{r.name[0]}</div>
                      }
                      <div>
                        <p className="font-medium text-surface-900">{r.name}</p>
                        <p className="text-xs text-surface-400 truncate max-w-xs">{r.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-surface-900">{r.owner?.name}</p>
                    <p className="text-xs text-surface-400">{r.owner?.whatsappNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-surface-600">{r.whatsappConfig?.targetBusinessNumber || '—'}</p>
                    <p className="text-xs text-surface-400">{r.whatsappConfig?.signupStatus?.replace('_', ' ') || 'not configured'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_COLORS[r.status] || 'badge-inactive'}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.whatsappConfig?.botEnabled
                      ? <span className="badge-active">● Live</span>
                      : <span className="badge-inactive">○ Off</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus.mutate({
                          id: r._id,
                          newStatus: r.status === 'active' ? 'inactive' : 'active'
                        })}
                        disabled={toggleStatus.isPending}
                        className="text-xs text-surface-500 hover:text-brand-600 transition-colors"
                      >
                        {r.status === 'active' ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <Link to={`/admin/restaurants/${r._id}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                        View <ChevronRight size={13} />
                      </Link>
                      <button
                        onClick={() => setConfirmDeleteId(r._id)}
                        className="text-xs text-surface-400 hover:text-red-500 transition-colors"
                        title="Delete business"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between text-sm">
            <p className="text-surface-500">Page {data.meta.page} of {data.meta.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.hasNext} className="btn-secondary py-1 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-surface-900 text-lg">Delete Business?</h3>
              <p className="text-surface-500 text-sm mt-2">
                This will permanently delete the business and <strong>all related data</strong> — owner account, catalog, orders, customers, WhatsApp config, and logs.
              </p>
              <p className="text-red-500 text-xs font-semibold mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRestaurant.mutate(confirmDeleteId)}
                disabled={deleteRestaurant.isPending}
                className="btn-danger flex-1 justify-center"
              >
                {deleteRestaurant.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {deleteRestaurant.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
