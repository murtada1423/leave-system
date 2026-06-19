import { Check, X, Inbox } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { Button } from './ui/button'

interface PendingRequest {
  id: string
  employee_id: string
  full_name: string
  leave_type: string
  start_date: string
  end_date: string
  duration_hours: number
  reason: string | null
  created_at: string
}

interface PendingRequestsTableProps {
  requests: PendingRequest[]
  loading: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  processing: string | null
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

export default function PendingRequestsTable({
  requests,
  loading,
  onApprove,
  onReject,
  processing,
}: PendingRequestsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>طلبات الإجازات الواردة</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">جاري التحميل...</p>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <Inbox className="w-10 h-10 mb-3" />
            <p className="text-sm">لا توجد طلبات معلقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الموظف</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.full_name}</TableCell>
                  <TableCell>{req.leave_type}</TableCell>
                  <TableCell>
                    <DateCell start={req.start_date} end={req.end_date} type={req.leave_type} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{req.reason ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        disabled={processing === req.id}
                        onClick={() => onApprove(req.id)}
                      >
                        <Check className="w-4 h-4 ml-1" />
                        {processing === req.id ? '...' : 'موافقة'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={processing === req.id}
                        onClick={() => onReject(req.id)}
                      >
                        <X className="w-4 h-4 ml-1" />
                        {processing === req.id ? '...' : 'رفض'}
                      </Button>
                    </div>
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
