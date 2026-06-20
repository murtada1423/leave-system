import { Inbox } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'

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
}

const statusStyles: Record<string, string> = {
  'قيد الانتظار': 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300',
  'مقبولة': 'bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300',
  'مرفوضة': 'bg-red-100 dark:bg-red-500/30 text-red-800 dark:text-red-300',
}

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

export default function LeaveHistory({ requests, loading }: LeaveHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل إجازاتي</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">جاري التحميل...</p>
        ) : requests.length === 0 ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
