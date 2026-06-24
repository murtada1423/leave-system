import { useState } from 'react'
import { Inbox, Calendar, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import DeleteLeaveModal from './DeleteLeaveModal'

interface LeaveRequest {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  duration_hours: number
  reason: string | null
  rejection_reason: string | null
  status: string
  created_at: string
}

interface LeaveHistoryProps {
  requests: LeaveRequest[]
  loading: boolean
  isAdmin?: boolean
  employeeId?: string
  onRequestsChange?: (requests: LeaveRequest[]) => void
}

const statusStyles: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300',
  'مقبولة': 'bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300',
  'مرفوضة': 'bg-red-100 dark:bg-red-500/30 text-red-800 dark:text-red-300',
}

const months = ['الكل', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const years = ['الكل', '2026', '2027', '2028', '2029', '2030']

function DateCell({ start, end, type }: { start: string; end: string; type: string }) {
  if (type === 'زمنية') {
    return <span className="number" dir="ltr">{start}</span>
  }
  if (start === end) {
    return <span className="number" dir="ltr">{start}</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="number" dir="ltr">{start}</span>
      <span className="text-slate-400 dark:text-slate-500 select-none mx-1" dir="ltr">&larr;</span>
      <span className="number" dir="ltr">{end}</span>
    </span>
  )
}

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

export default function LeaveHistory({ requests, loading, isAdmin, employeeId, onRequestsChange }: LeaveHistoryProps) {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = requests.filter((r) => {
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
          const { data: p } = await supabase.from('profiles').select('hourly_balance').eq('id', employeeId).single()
          if (p) {
            await supabase.from('profiles').update({ hourly_balance: p.hourly_balance + target.duration_hours }).eq('id', employeeId)
          }
        } else {
          const s = new Date(target.start_date), e = new Date(target.end_date)
          const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
          const { data: p } = await supabase.from('profiles').select('days_balance').eq('id', employeeId).single()
          if (p) {
            await supabase.from('profiles').update({ days_balance: p.days_balance + days }).eq('id', employeeId)
          }
        }
      }
      const { error } = await supabase.from('leave_requests').delete().eq('id', target.id)
      if (error) throw error
      const updated = requests.filter((r) => r.id !== target.id)
      onRequestsChange?.(updated)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err)
      alert('فشل حذف الإجازة')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل إجازاتي</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-36">
            <FilterSelect value={selectedMonth} onChange={setSelectedMonth} options={months} />
          </div>
          <div className="w-36">
            <FilterSelect value={selectedYear} onChange={setSelectedYear} options={years} />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">جاري التحميل...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <Inbox className="w-10 h-10 mb-3" />
            <p className="text-sm">لا توجد إجازات مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع الإجازة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>سبب الرفض</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.leave_type}</TableCell>
                  <TableCell>
                    <DateCell start={req.start_date} end={req.end_date} type={req.leave_type} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        statusStyles[req.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {req.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {req.status === 'مرفوضة' && req.rejection_reason ? (
                      <span className="text-red-600 dark:text-red-400 text-sm">{req.rejection_reason}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {(req.status === 'مقبولة' || req.status === 'مرفوضة') ? (
                      <button
                        onClick={() => setDeleteTarget(req)}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>

      <DeleteLeaveModal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={handleDeleteLeave}
        loading={deleting}
        leaveStatus={deleteTarget?.status}
      />
    </Card>
  )
}
