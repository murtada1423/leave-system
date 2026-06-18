import { Sun, Clock } from 'lucide-react'
import { Card, CardContent } from './ui/card'

interface MetricCardsProps {
  daysBalance: number
  hourlyBalance: number
}

export default function MetricCards({ daysBalance, hourlyBalance }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Sun className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">رصيد الإجازات (الأيام)</p>
            <p className="text-3xl font-bold text-slate-900 number">{daysBalance}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500">رصيد الإجازات الزمنية (الساعات)</p>
            <p className="text-3xl font-bold text-slate-900 number">{hourlyBalance}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
