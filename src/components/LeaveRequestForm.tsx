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

function DatePickerOverlay({ value, onChange, required, disabled }: { value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative w-full" dir="ltr">
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
      />
      <div
        className="flex items-center h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus-within:ring-2 focus-within:ring-indigo-400/50 focus-within:border-indigo-400 transition select-none"
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

export default function LeaveRequestForm({ onSubmit, daysBalance, hourlyBalance }: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [singleDate, setSingleDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmBorrow, setConfirmBorrow] = useState(false)
  const [error, setError] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const isTimeLeave = leaveType === 'زمنية'
  const isDayLeave = leaveType === 'اعتيادية' || leaveType === 'مرضية'
  const showForm = leaveType !== ''

  const calcDays = (): number => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate), e = new Date(endDate)
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  }

  const setTodayLeave = () => { setStartDate(todayStr); setEndDate(todayStr); setError(''); setConfirmBorrow(false) }
  const setTomorrowLeave = () => { setStartDate(tomorrowStr); setEndDate(tomorrowStr); setError(''); setConfirmBorrow(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveType) return
    if (isDayLeave && (!startDate || !endDate)) return
    if (isTimeLeave && !singleDate) return

    const days = isDayLeave ? calcDays() : 0
    const balance = isTimeLeave ? hourlyBalance : daysBalance

    if (isDayLeave && days > balance + 1) {
      setError(`رصيدك غير كافٍ. الرصيد المتاح: ${balance} يوم${balance !== 1 ? 'اً' : ''}. لا يمكن استلاف أكثر من يوم واحد.`)
      return
    }

    if (isDayLeave && days === balance + 1 && !confirmBorrow) {
      setConfirmBorrow(true)
      return
    }

    if (isTimeLeave && 1 > balance + 1) {
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
      setConfirmBorrow(false)
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
                <DatePickerOverlay value={startDate} onChange={setStartDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">تاريخ الانتهاء</Label>
                <DatePickerOverlay value={endDate} onChange={setEndDate} required />
              </div>
            </>
          )}

          {isTimeLeave && (
            <div className="space-y-2">
              <Label htmlFor="single-date">تاريخ الإجازة</Label>
                  id="single-date"
                  type="date"
                  className="w-full dark:[color-scheme:dark] text-right"
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                />
              </div>
              <DatePickerOverlay value={singleDate} onChange={setSingleDate} required />
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

          {confirmBorrow && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-amber-500/10 border border-amber-300/30 text-amber-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-2">
                <p>رصيدك غير كافٍ ({daysBalance} يوم). هل تريد استلاف <strong>يوم واحد</strong> من الشهر القادم؟</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmBorrow(false)
                      const days = calcDays()
                      if (days > daysBalance + 1) return
                      setSubmitting(true)
                      try {
                        await onSubmit({
                          leave_type: leaveType,
                          start_date: startDate,
                          end_date: endDate,
                          duration_hours: 0,
                          reason,
                        })
                        setLeaveType('')
                        setStartDate('')
                        setEndDate('')
                        setSingleDate('')
                        setReason('')
                        setError('')
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    className="h-9 px-4 rounded-xl bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition cursor-pointer disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'جاري...' : 'نعم، استلاف يوم'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBorrow(false)}
                    disabled={submitting}
                    className="h-9 px-4 rounded-xl bg-white/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 text-xs font-medium hover:bg-white transition cursor-pointer disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 border border-red-300/30 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !showForm || confirmBorrow}>
            <Send className="w-4 h-4 ml-2" />
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
