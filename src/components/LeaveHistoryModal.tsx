import { useEffect, useState } from 'react'
import { X, Calendar, Clock, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LeaveRecord {
  id: string
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
  'قيد الانتظار': 'bg-amber-100 text-amber-700',
  'مقبولة': 'bg-emerald-100 text-emerald-700',
  'مرفوضة': 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  'قيد الانتظار': 'قيد الانتظار',
  'مقبولة': 'مقبولة',
  'مرفوضة': 'مرفوضة',
}

export default function LeaveHistoryModal({ employeeId, employees, onClose }: LeaveHistoryModalProps) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(false)

  const employee = employees.find((e) => e.id === employeeId)
  const open = !!employeeId

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-4 backdrop-blur-2xl bg-white/70 rounded-3xl border border-white/40 shadow-2xl shadow-black/10 p-8 space-y-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-neutral-900">
            سجل إجازات الموظف: {employee?.full_name || ''}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Calendar className="w-10 h-10 mb-3" />
              <p className="text-sm">لا يوجد سجل إجازات لهذا الموظف</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-neutral-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="font-medium text-neutral-900 text-sm">{leave.leave_type}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {leave.leave_type === 'زمنية' ? 'إجازة زمنية' : 'إجازة يومية'}
                      </p>
                    </div>
                    <div className="number">
                      <p className="text-sm text-neutral-900 dir-ltr" dir="ltr">
                        {new Date(leave.start_date).toLocaleDateString('ar-SA')}
                        {leave.start_date !== leave.end_date && (
                          <span className="mx-1 text-neutral-400">←</span>
                        )}
                        {leave.start_date !== leave.end_date && new Date(leave.end_date).toLocaleDateString('ar-SA')}
                      </p>
                      {leave.duration_hours > 0 && (
                        <p className="text-xs text-neutral-500 mt-0.5 number">{leave.duration_hours} ساعة</p>
                      )}
                    </div>
                    <div className="text-left">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge[leave.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabel[leave.status] || leave.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl bg-white/80 border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-white transition shrink-0 cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  )
}
