import { useState, useRef } from 'react'
import { X, User, Calendar, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const LEAVE_TYPES = ['اعتيادية', 'مرضية', 'زمنية'] as const

interface EmployeeRecord {
  id: string
  full_name: string
  days_balance: number
  hourly_balance: number
}

interface AdminLeaveModalProps {
  open: boolean
  employees: EmployeeRecord[]
  onClose: () => void
  onSaved: () => void
  adminName?: string
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d} - ${m} - ${y}`
}

function DatePickerOverlay({ value, onChange, required, min, max }: { value: string; onChange: (v: string) => void; required?: boolean; min?: string; max?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative w-full" dir="ltr">
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        max={max}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
      />
      <div
        className="flex items-center h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus-within:ring-2 focus-within:ring-indigo-400/50 focus-within:border-indigo-400 transition select-none cursor-pointer"
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.click()}
        style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
      >
        <span className={`flex-1 text-right ${value ? '' : 'text-neutral-400 dark:text-slate-400'}`}>
          {value ? <bdi dir="ltr">{formatDateDisplay(value)}</bdi> : 'اختر التاريخ'}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-slate-400 mr-2 shrink-0 pointer-events-none" />
      </div>
    </div>
  )
}

export default function AdminLeaveModal({ open, employees, onClose, onSaved, adminName }: AdminLeaveModalProps) {
  const [employeeId, setEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const selectedEmployee = employees.find((e) => e.id === employeeId)
  const isTimeLeave = leaveType === 'زمنية'

  const calcDays = (): number => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!employeeId) { setError('اختر الموظف'); return }
    if (!leaveType) { setError('اختر نوع الإجازة'); return }
    if (!startDate) { setError('اختر تاريخ البداية'); return }
    if (!endDate) { setError('اختر تاريخ النهاية'); return }

    const days = calcDays()
    if (days < 1) { setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'); return }

    if (!isTimeLeave && selectedEmployee && days > selectedEmployee.days_balance) {
      setError(`رصيد الأيام غير كافٍ. الرصيد الحالي: ${selectedEmployee.days_balance}`);
      return
    }

    setSubmitting(true)

    try {
      const { error: insertErr } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          duration_hours: isTimeLeave ? 1 : 0,
          reason: reason || null,
          status: 'مقبولة',
          processed_by: adminName || null,
        })

      if (insertErr) throw insertErr

      if (isTimeLeave) {
        const { data: p, error: fetchErr } = await supabase
          .from('profiles')
          .select('hourly_balance')
          .eq('id', employeeId)
          .single()
        if (fetchErr) throw fetchErr
        const { error: deductErr } = await supabase
          .from('profiles')
          .update({ hourly_balance: p.hourly_balance - 1 })
          .eq('id', employeeId)
        if (deductErr) throw deductErr
      } else {
        const { data: p, error: fetchErr } = await supabase
          .from('profiles')
          .select('days_balance')
          .eq('id', employeeId)
          .single()
        if (fetchErr) throw fetchErr
        const { error: deductErr } = await supabase
          .from('profiles')
          .update({ days_balance: p.days_balance - days })
          .eq('id', employeeId)
        if (deductErr) throw deductErr
      }

      setEmployeeId('')
      setLeaveType('')
      setStartDate('')
      setEndDate('')
      setReason('')
      onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'حدث خطأ أثناء تسجيل الإجازة')
    } finally {
      setSubmitting(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">تسجيل إجازة جديدة</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">الموظف</label>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition appearance-none cursor-pointer"
                required
              >
                <option value="">-- اختر الموظف --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} (الرصيد: {emp.days_balance} يوم)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">نوع الإجازة</label>
            <div className="relative">
              <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-500 pointer-events-none" />
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition appearance-none cursor-pointer"
                required
              >
                <option value="">-- اختر نوع الإجازة --</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">تاريخ البداية</label>
              <DatePickerOverlay value={startDate} onChange={setStartDate} required max={endDate || undefined} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">تاريخ النهاية</label>
              <DatePickerOverlay value={endDate} onChange={setEndDate} required min={startDate || todayStr} />
            </div>
          </div>

          {startDate && endDate && !isTimeLeave && (
            <p className="text-sm text-neutral-500 dark:text-slate-400 number">
              عدد أيام الإجازة: {calcDays()} يوم
              {selectedEmployee && ` — الرصيد المتاح: ${selectedEmployee.days_balance} يوم`}
            </p>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">سبب الإجازة</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[80px] px-4 py-3 rounded-2xl bg-white/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm placeholder-neutral-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition resize-none"
              placeholder="اذكر سبب الإجازة (اختياري)"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 dark:bg-red-500/15 border border-red-300/30 dark:border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-semibold text-sm hover:from-emerald-500 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              {submitting ? 'جاري التسجيل...' : 'تسجيل الإجازة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
