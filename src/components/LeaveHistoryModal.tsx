import { useEffect, useState } from 'react'
import { X, Calendar, Clock, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import DeleteLeaveModal from './DeleteLeaveModal'

interface LeaveRecord {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  duration_hours: number
  reason: string | null
  status: string
  created_at: string
}

interface EmployeeRecord {
  id: string
  full_name: string
}

interface LeaveHistoryModalProps {
  employeeId: string | null
  employees: EmployeeRecord[]
  onClose: () => void
}

const statusBadge: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'مقبولة': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'مرفوضة': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
}

const statusLabel: Record<string, string> = {
  'قيد الانتظار': 'قيد الانتظار',
  'مقبولة': 'مقبولة',
  'مرفوضة': 'مرفوضة',
}

const months = ['الكل', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const years = ['الكل', '2026', '2027', '2028', '2029', '2030']

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pr-10 pl-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-600/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt === 'الكل' ? 'الكل' : opt}</option>
        ))}
      </select>
    </div>
  )
}

export default function LeaveHistoryModal({ employeeId, employees, onClose }: LeaveHistoryModalProps) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [deleteTarget, setDeleteTarget] = useState<LeaveRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const employee = employees.find((e) => e.id === employeeId)
  const open = !!employeeId

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    setSelectedMonth(String(new Date().getMonth() + 1).padStart(2, '0'))
    setSelectedYear(new Date().getFullYear().toString())
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setLeaves(data as LeaveRecord[])
        }
        setLoading(false)
      })
  }, [employeeId])

  const filtered = leaves.filter((r) => {
    const mm = r.start_date.slice(5, 7)
    const yyyy = r.start_date.slice(0, 4)
    const monthOk = selectedMonth === 'الكل' || mm === selectedMonth
    const yearOk = selectedYear === 'الكل' || yyyy === selectedYear
    return monthOk && yearOk
  })

  const handleDeleteLeave = async () => {
    const target = deleteTarget
    if (!target) return
    setDeleting(true)
    try {
      if (target.status === 'مقبولة') {
        if (target.leave_type === 'زمنية') {
          const { data: p } = await supabase.from('profiles').select('hourly_balance').eq('id', target.employee_id).single()
          if (p) {
            await supabase.from('profiles').update({ hourly_balance: p.hourly_balance + target.duration_hours }).eq('id', target.employee_id)
          }
        } else {
          const s = new Date(target.start_date), e = new Date(target.end_date)
          const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
          const { data: p } = await supabase.from('profiles').select('days_balance').eq('id', target.employee_id).single()
          if (p) {
            await supabase.from('profiles').update({ days_balance: p.days_balance + days }).eq('id', target.employee_id)
          }
        }
      }
      const { error } = await supabase.from('leave_requests').delete().eq('id', target.id)
      if (error) throw error
      setLeaves((prev) => prev.filter((r) => r.id !== target.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err)
      alert('فشل حذف الإجازة')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
            سجل إجازات الموظف: {employee?.full_name || ''}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-36">
            <FilterSelect value={selectedMonth} onChange={setSelectedMonth} options={months} />
          </div>
          <div className="w-36">
            <FilterSelect value={selectedYear} onChange={setSelectedYear} options={years} />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-slate-500">
              <Calendar className="w-10 h-10 mb-3" />
              <p className="text-sm">لا يوجد سجل إجازات لهذا الموظف</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-700/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">{leave.leave_type}</p>
                      <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                        {leave.leave_type === 'زمنية' ? 'إجازة زمنية' : 'إجازة يومية'}
                      </p>
                    </div>
                    <div className="number">
                      <p className="text-sm text-neutral-900 dark:text-white dir-ltr" dir="ltr">
                        {new Date(leave.start_date).toLocaleDateString('en-GB')}
                        {leave.start_date !== leave.end_date && (
                          <span className="mx-1 text-neutral-400 dark:text-slate-500">←</span>
                        )}
                        {leave.start_date !== leave.end_date && new Date(leave.end_date).toLocaleDateString('en-GB')}
                      </p>
                      {leave.duration_hours > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5 number">{leave.duration_hours} ساعة</p>
                      )}
                    </div>
                    <div className="text-left">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge[leave.status] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {statusLabel[leave.status] || leave.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-end">
                      {(leave.status === 'مقبولة' || leave.status === 'مرفوضة') ? (
                      <button
                        onClick={() => setDeleteTarget(leave)}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
        >
          إغلاق
        </button>
      </div>

      <DeleteLeaveModal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleDeleteLeave}
        loading={deleting}
        leaveStatus={deleteTarget?.status}
      />
    </div>
  )
}
