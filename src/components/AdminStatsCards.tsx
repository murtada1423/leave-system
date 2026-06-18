import { Users, ClipboardList } from 'lucide-react'
import { Card, CardContent } from './ui/card'

interface AdminStatsCardsProps {
  totalEmployees: number
  pendingRequests: number
}

export default function AdminStatsCards({ totalEmployees, pendingRequests }: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">عدد الموظفين</p>
            <p className="text-3xl font-bold text-slate-900 number">{totalEmployees}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">الطلبات المعلقة</p>
            <p className="text-3xl font-bold text-slate-900 number">{pendingRequests}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
