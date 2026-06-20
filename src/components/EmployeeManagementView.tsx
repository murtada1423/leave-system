import { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Trash2, Users, AlertCircle, History, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EmployeeModal from './EmployeeModal'
import LeaveHistoryModal from './LeaveHistoryModal'
import AdminLeaveModal from './AdminLeaveModal'

interface EmployeeRecord {
  id: string
  full_name: string
  role: string
  days_balance: number
  hourly_balance: number
  created_at: string
}

interface EmployeeManagementViewProps {
  employees: EmployeeRecord[]
  loading: boolean
  onRefresh: () => void
}

export default function EmployeeManagementView({ employees, loading, onRefresh }: EmployeeManagementViewProps) {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<{ id: string; full_name: string; password: string; role: string; days_balance: number; hourly_balance: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.trim().toLowerCase()
    return employees.filter((e) => e.full_name.toLowerCase().includes(q))
  }, [employees, search])

  const handleAdd = () => {
    setEditData(null)
    setModalOpen(true)
  }

  const handleEdit = (emp: EmployeeRecord) => {
    setEditData({ id: emp.id, full_name: emp.full_name, role: emp.role, password: '', days_balance: emp.days_balance, hourly_balance: emp.hourly_balance })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_id: id })
      if (error) throw error
      onRefresh()
    } catch (err) {
      alert('فشل حذف الموظف: ' + ((err as Error).message || 'خطأ غير معروف'))
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleRowClick = (emp: EmployeeRecord) => {
    setHistoryEmployeeId(emp.id)
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-xl shadow-black/5 dark:shadow-black/20 p-4 md:p-8">
        {/* Fixed header section */}
        <div className="shrink-0 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white">سجل الموظفين</h3>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-slate-400">إدارة جميع الموظفين المسجلين في النظام</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLeaveModalOpen(true)}
                className="h-11 px-4 md:px-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-medium text-sm hover:from-emerald-500 hover:to-emerald-600 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
              >
                <CalendarPlus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">تسجيل إجازة جديدة</span>
                <span className="sm:hidden">إجازة</span>
              </button>
              <button
                onClick={handleAdd}
                className="h-11 px-4 md:px-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-medium text-sm hover:from-indigo-500 hover:to-indigo-600 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">إضافة موظف جديد</span>
                <span className="sm:hidden">إضافة</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
              placeholder="البحث باسم الموظف"
            />
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto mt-6 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-slate-700/50 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">اسم الموظف</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">الصلاحيات</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">رصيد الأيام</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">رصيد الساعات</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">تاريخ التسجيل</th>
                <th className="text-center py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400 dark:text-slate-500">جاري التحميل...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8" />
                      <p className="text-sm">لا يوجد موظفون</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/30'} border-b border-gray-100 dark:border-slate-700/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition cursor-pointer`}
                    onClick={() => handleRowClick(emp)}
                  >
                    <td className="py-4 px-4 font-medium text-neutral-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
                          <History className="w-4 h-4 text-white" />
                        </div>
                        <span>{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-neutral-600 dark:text-slate-300">
                      <span className={`inline-flex items-center justify-center w-[70px] h-7 rounded-xl text-xs font-medium ${emp.role === 'admin' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-200'}`}>
                        {emp.role === 'admin' ? 'مدير' : 'موظف'}
                      </span>
                    </td>
                    <td className="py-4 px-4 number text-neutral-900 dark:text-white">{emp.days_balance}</td>
                    <td className="py-4 px-4 number text-neutral-900 dark:text-white">{emp.hourly_balance}</td>
                    <td className="py-4 px-4 number text-neutral-500 dark:text-slate-400 text-xs">{new Date(emp.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500 transition cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(emp.id)}
                          className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition cursor-pointer"
                          title="حذف"
                        >
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

      <EmployeeModal
        open={modalOpen}
        editData={editData}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
      />

      <LeaveHistoryModal
        employeeId={historyEmployeeId}
        employees={employees}
        onClose={() => setHistoryEmployeeId(null)}
      />

      <AdminLeaveModal
        open={leaveModalOpen}
        employees={employees}
        onClose={() => setLeaveModalOpen(false)}
        onSaved={onRefresh}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div
            className="w-full max-w-sm mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border-2 border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-slate-400">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white font-medium text-sm hover:from-red-400 hover:to-red-500 transition disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
