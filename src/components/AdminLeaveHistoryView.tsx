import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Search, CalendarCheck, Download } from 'lucide-react'
import ExportModal from './ExportModal'

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
  rejection_reason: string | null
}

interface EmployeeRecord {
  id: string
  full_name: string
  role: string
  days_balance: number
  hourly_balance: number
}

interface AdminLeaveHistoryViewProps {
  employees: EmployeeRecord[]
}

const statusBadge: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'مقبولة': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'مرفوضة': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
}

function formatDuration(leave: LeaveRecord): string {
  if (leave.leave_type === 'زمنية') {
    return `${leave.duration_hours} ساعة`
  }
  const s = new Date(leave.start_date)
  const e = new Date(leave.end_date)
  const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return `${days} يـوم`
}

export default function AdminLeaveHistoryView({ employees }: AdminLeaveHistoryViewProps) {
  const [allRecords, setAllRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    const fetchRecords = async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          leave_type,
          start_date,
          end_date,
          duration_hours,
          reason,
          status,
          rejection_reason,
          created_at,
          profiles!inner ( full_name )
        `)
        .order('created_at', { ascending: false })

      if (ignore) return

      if (data) {
        const mapped: LeaveRecord[] = data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          employee_id: r.employee_id as string,
          full_name: (r.profiles as Record<string, string>).full_name,
          leave_type: r.leave_type as string,
          start_date: r.start_date as string,
          end_date: r.end_date as string,
          duration_hours: r.duration_hours as number,
          reason: r.reason as string | null,
          status: r.status as string,
          created_at: r.created_at as string,
          rejection_reason: r.rejection_reason as string | null,
        }))
        setAllRecords(mapped)
      }
      setLoading(false)
    }

    fetchRecords()

    channel = supabase
      .channel('admin_leave_history')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => { fetchRecords() },
      )
      .subscribe()

    return () => {
      ignore = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const filteredRecords = useMemo(() => {
    let result = allRecords

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) => r.full_name.toLowerCase().includes(q))
    }

    if (dateFrom && dateTo) {
      result = result.filter((r) => r.start_date <= dateTo && r.end_date >= dateFrom)
    } else if (dateFrom) {
      result = result.filter((r) => r.end_date >= dateFrom)
    } else if (dateTo) {
      result = result.filter((r) => r.start_date <= dateTo)
    }

    return result
  }, [allRecords, search, dateFrom, dateTo])

  const handleClearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = search.trim() || dateFrom || dateTo

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-xl shadow-black/5 dark:shadow-black/20 p-4 md:p-8">
        {/* Fixed header */}
        <div className="shrink-0 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 shrink-0">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white">سجل الإجازات</h3>
                <p className="text-xs md:text-sm text-neutral-500 dark:text-slate-400">
                  إجمالي: {filteredRecords.length} {allRecords.length !== filteredRecords.length ? `(من أصل ${allRecords.length})` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExportOpen(true)}
              className="h-11 px-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-medium text-sm hover:from-emerald-500 hover:to-emerald-600 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
            >
              <Download className="w-4 h-4 shrink-0" />
              تصدير
            </button>
          </div>

          {/* Search + filters row */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full md:max-w-xs">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                placeholder="البحث باسم الموظف"
              />
            </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <div dir="ltr">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full md:w-40 h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              <span className="text-neutral-300 dark:text-slate-600 shrink-0 select-none">—</span>
              <div className="relative flex-1 md:flex-initial">
                <div dir="ltr">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full md:w-40 h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white hover:border-neutral-300 dark:hover:border-slate-600 transition cursor-pointer text-sm shrink-0"
                >
                  إزالة
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto mt-6 rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-slate-700/50 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">#</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">اسم الموظف</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">نوع الإجازة</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">تاريخ البدء</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">تاريخ الانتهاء</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">المدة</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">الحالة</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">سبب الرفض</th>
                <th className="text-right py-3 px-4 font-medium text-neutral-500 dark:text-slate-400">تاريخ الطلب</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-neutral-400 dark:text-slate-500">جاري التحميل...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-neutral-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarCheck className="w-8 h-8" />
                      <p className="text-sm">لا توجد إجازات مسجلة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/30'} border-b border-gray-100 dark:border-slate-700/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition`}
                  >
                    <td className="py-4 px-4 number text-neutral-400 dark:text-slate-500">{idx + 1}</td>
                    <td className="py-4 px-4 font-medium text-neutral-900 dark:text-white">{rec.full_name}</td>
                    <td className="py-4 px-4 text-neutral-700 dark:text-slate-300">{rec.leave_type}</td>
                    <td className="py-4 px-4 number text-neutral-900 dark:text-white" dir="ltr">{rec.start_date}</td>
                    <td className="py-4 px-4 number text-neutral-900 dark:text-white" dir="ltr">{rec.end_date}</td>
                    <td className="py-4 px-4 number text-neutral-700 dark:text-slate-300">{formatDuration(rec)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge[rec.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-[200px]">
                      {rec.status === 'مرفوضة' && rec.rejection_reason ? (
                        <span className="text-red-600 dark:text-red-400 text-sm">{rec.rejection_reason}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 number text-neutral-500 dark:text-slate-400 text-xs">
                      {new Date(rec.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        allRecords={allRecords}
        employees={employees}
      />
    </>
  )
}
