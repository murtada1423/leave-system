import { useState } from 'react'
import { X, User, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'

interface LeaveRecord {
  id: string
  employee_id: string
  full_name: string
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

interface ExportModalProps {
  open: boolean
  onClose: () => void
  allRecords: LeaveRecord[]
  employees: EmployeeRecord[]
}

function formatDurationDays(start: string, end: string): string {
  const s = new Date(start), e = new Date(end)
  const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return `${days} يـوم`
}

export default function ExportModal({ open, onClose, allRecords, employees }: ExportModalProps) {
  const [employeeId, setEmployeeId] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  if (!open) return null

  const handleExport = async () => {
    setError('')
    setSuccess(null)
    setExporting(true)

    try {
      let data = [...allRecords]

      if (employeeId !== 'all') {
        data = data.filter((r) => r.employee_id === employeeId)
      }

      if (dateFrom && dateTo) {
        data = data.filter((r) => r.start_date <= dateTo && r.end_date >= dateFrom)
      } else if (dateFrom) {
        data = data.filter((r) => r.end_date >= dateFrom)
      } else if (dateTo) {
        data = data.filter((r) => r.start_date <= dateTo)
      }

      if (data.length === 0) {
        setError('لا توجد بيانات للتصدير حسب المعايير المحددة')
        setExporting(false)
        return
      }

      const XLSX = await import('xlsx')

      const headers = [
        'اسم الموظف',
        'نوع الإجازة',
        'تاريخ البدء',
        'تاريخ الانتهاء',
        'المدة',
        'السبب',
        'الحالة',
        'تاريخ الطلب',
      ]

      const rows = data.map((r) => {
        const duration = r.leave_type === 'زمنية'
          ? `${r.duration_hours} ساعة`
          : formatDurationDays(r.start_date, r.end_date)

        return [
          r.full_name,
          r.leave_type,
          r.start_date,
          r.end_date,
          duration,
          r.reason || '—',
          r.status,
          new Date(r.created_at).toLocaleDateString('en-GB'),
        ]
      })

      const sheetData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)

      ws['!dir'] = 'rtl'

      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 30 },
        { wch: 14 },
        { wch: 18 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الإجازات')

      let filename = 'سجل_الإجازات'
      if (employeeId !== 'all') {
        const emp = employees.find((e) => e.id === employeeId)
        if (emp) filename += `_${emp.full_name}`
      }
      if (dateFrom && dateTo) {
        filename += `_${dateFrom}_${dateTo}`
      } else if (dateFrom) {
        filename += `_من_${dateFrom}`
      } else if (dateTo) {
        filename += `_إلى_${dateTo}`
      }
      filename += '.xlsx'

      XLSX.writeFile(wb, filename)

      const count = employeeId !== 'all'
        ? `للموظف: ${employees.find((e) => e.id === employeeId)?.full_name}`
        : 'لجميع الموظفين'
      setSuccess(`تم تصدير ${data.length} سجلاً بنجاح (${count})`)
    } catch (err) {
      setError((err as Error).message || 'حدث خطأ أثناء التصدير')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-700/40 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">تصدير سجل الإجازات</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Employee selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">الموظف</label>
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400 pointer-events-none" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition appearance-none cursor-pointer"
              >
                <option value="all">جميع الموظفين</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">نطاق التاريخ (اختياري)</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div dir="ltr">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              <span className="text-neutral-300 dark:text-slate-600 shrink-0 select-none">—</span>
              <div className="flex-1">
                <div dir="ltr">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 dark:text-slate-400">اترك الحقول فارغة لتصدير جميع البيانات</p>
          </div>

          {/* Format info */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20">
            <FileSpreadsheet className="w-6 h-6 text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-slate-200">تنسيق Excel</p>
              <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">سيتم تصدير البيانات بصيغة Excel مع دعم كامل للغة العربية والاتجاه من اليمين لليسار</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 dark:bg-red-500/15 border border-red-300/30 dark:border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-300/30 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-semibold text-sm hover:from-emerald-500 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'جاري التصدير...' : 'تصدير'}
            </button>
            <button
              onClick={onClose}
              className="px-8 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
