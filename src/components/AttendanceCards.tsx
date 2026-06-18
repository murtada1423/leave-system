import { UserCheck, CalendarCheck, CalendarClock } from 'lucide-react'
import { Card, CardContent } from './ui/card'

interface AttendanceCardsProps {
  presentCount: number
  onLeaveTodayCount: number
  onLeaveTomorrowCount: number
  loading: boolean
  onCardClick: (card: 'present' | 'today' | 'tomorrow') => void
}

export default function AttendanceCards({
  presentCount,
  onLeaveTodayCount,
  onLeaveTomorrowCount,
  loading,
  onCardClick,
}: AttendanceCardsProps) {
  const cards = [
    {
      key: 'present' as const,
      label: 'الموظفون المتواجدون',
      count: presentCount,
      icon: UserCheck,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      shadow: 'shadow-emerald-200',
    },
    {
      key: 'today' as const,
      label: 'مجازون اليوم',
      count: onLeaveTodayCount,
      icon: CalendarCheck,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      shadow: 'shadow-amber-200',
    },
    {
      key: 'tomorrow' as const,
      label: 'مجازون غداً',
      count: onLeaveTomorrowCount,
      icon: CalendarClock,
      bg: 'bg-sky-50',
      iconColor: 'text-sky-500',
      shadow: 'shadow-sky-200',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => onCardClick(card.key)}
          className="text-right cursor-pointer"
          disabled={loading}
        >
          <Card>
            <CardContent className="p-6 flex items-center gap-4 transition hover:scale-[1.02] duration-200">
              <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center shrink-0 shadow-sm ${card.shadow}`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-3xl font-bold text-slate-900 number">
                  {loading ? '...' : card.count}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  )
}
