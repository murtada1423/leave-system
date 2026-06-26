import { useState, useRef } from 'react'
import { Send, Calendar, CalendarPlus, AlertCircle, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

const LEAVE_TYPES = ['اعتيادية', 'مرضية', 'زمنية'] as const

interface LeaveRequestFormProps {
  onSubmit: (data: {
    leave_type: string
    start_date: string
    end_date: string
    duration_hours: number
    reason: string
  }) => Promise<void>
  daysBalance: number
  hourlyBalance: number
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d} - ${m} - ${y}`
}

function DatePickerNative({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative w-full" dir="ltr">
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer md:relative md:opacity-100 md:z-auto md:h-10 md:px-4 md:rounded-lg md:bg-white md:dark:bg-slate-900 md:border md:border-neutral-200 md:dark:border-slate-700/50 md:text-neutral-900 md:dark:text-white md:text-sm md:dark:[color-scheme:dark]"
        style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
      />
      <div
        className="flex items-center h-10 px-4 rounded-lg bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm pointer-events-none md:hidden"
        style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
      >
        <span className={`flex-1 text-right ${value ? '' : 'text-neutral-400 dark:text-slate-400'}`}>
          {value ? <bdi dir="ltr">{formatDateDisplay(value)}</bdi> : 'اختر التاريخ'}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-400 dark:text-slate-400 mr-2 shrink-0" />
      </div>
    </div>
  )
}

interface LeaveRequestFormProps {
  onSubmit: (data: {
    leave_type: string
    start_date: string
    end_date: string
    duration_hours: number
    reason: string
  }) => Promise<void>
  daysBalance: number
  hourlyBalance: number
}

export default function LeaveRequestForm({ onSubmit, daysBalance, hourlyBalance }: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [singleDate, setSingleDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const todayStr = new Date().toLocaleDateString('en-CA')
  const d = new Date(); d.setDate(d.getDate() + 1); const tomorrowStr = d.toLocaleDateString('en-CA')

  const isTimeLeave = leaveType === 'زمنية'
  const isDayLeave = leaveType === 'اعتيادية' || leaveType === 'مرضية'
  const showForm = leaveType !== ''

  const calcDays = (): number => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate), e = new Date(endDate)
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  }

  const setTodayLeave = () => { setStartDate(todayStr); setEndDate(todayStr); setError('') }
  const setTomorrowLeave = () => { setStartDate(tomorrowStr); setEndDate(tomorrowStr); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveType) return
    if (isDayLeave && (!startDate || !endDate)) return
    if (isTimeLeave && !singleDate) return

    const days = isDayLeave ? calcDays() : 0
    const balance = isTimeLeave ? hourlyBalance : daysBalance

    if (isDayLeave && days > balance) {
      setError(`رصيدك غير كافٍ. الرصيد المتاح: ${balance} يوم${balance !== 1 ? 'اً' : ''}.`)
      return
    }

    if (isTimeLeave && 1 > balance) {
      setError('رصيد الساعات غير كافٍ')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        leave_type: leaveType,
        start_date: isTimeLeave ? singleDate : startDate,
        end_date: isTimeLeave ? singleDate : endDate,
        duration_hours: isTimeLeave ? 1 : 0,
        reason,
      })
      setLeaveType('')
      setStartDate('')
      setEndDate('')
      setSingleDate('')
      setReason('')
      setReason('')
      setError('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>طلب إجازة جديدة</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leave-type">نوع الإجازة</Label>
            <Select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              required
            >
              <option value="">-- اختر نوع الإجازة --</option>
              {LEAVE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          {isDayLeave && (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={setTodayLeave}
                  className="flex-1 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:from-emerald-400 hover:to-emerald-500 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30"
                >
                  <Calendar className="w-4 h-4" />
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={setTomorrowLeave}
                  className="flex-1 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white text-sm font-medium hover:from-sky-400 hover:to-sky-500 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-sky-200 dark:shadow-sky-900/30"
                >
                  <CalendarPlus className="w-4 h-4" />
                  غداً
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">تاريخ البدء</Label>
                <DatePickerNative value={startDate} onChange={setStartDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">تاريخ الانتهاء</Label>
                <DatePickerNative value={endDate} onChange={setEndDate} required />
              </div>
            </>
          )}

          {isTimeLeave && (
            <div className="space-y-2">
              <Label htmlFor="single-date">تاريخ الإجازة</Label>
              <DatePickerNative value={singleDate} onChange={setSingleDate} required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">سبب الإجازة</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب الإجازة..."
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 border border-red-300/30 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !showForm}>
            <Send className="w-4 h-4 ml-2" />
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
