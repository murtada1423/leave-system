import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import MetricCards from './MetricCards'
import LeaveRequestForm from './LeaveRequestForm'
import LeaveHistory from './LeaveHistory'

interface Profile {
  id: string
  full_name: string
  role: string
  days_balance: number
  hourly_balance: number
}

interface LeaveRequest {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  duration_hours: number
  reason: string | null
  status: string
  created_at: string
}

interface EmployeeDashboardProps {
  userId: string
  onLogout: () => void
}

export default function EmployeeDashboard({ userId, onLogout }: EmployeeDashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    let ignore = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const [profileRes, requestsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('leave_requests').select('*').eq('employee_id', userId).order('created_at', { ascending: false }),
      ])

      if (ignore) return

      if (profileRes.data) setProfile(profileRes.data)
      if (requestsRes.data) setRequests(requestsRes.data as LeaveRequest[])
      setLoadingProfile(false)
      setLoadingRequests(false)

      channel = supabase
        .channel('employee_changes')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'leave_requests', filter: `employee_id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              setRequests((prev) =>
                prev.map((r) => (r.id === (payload.new as LeaveRequest).id ? (payload.new as LeaveRequest) : r)),
              )
            }
          },
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'leave_requests', filter: `employee_id=eq.${userId}` },
          (payload) => {
            if (payload.old) {
              setRequests((prev) => prev.filter((r) => r.id !== (payload.old as LeaveRequest).id))
            }
          },
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              setProfile(payload.new as Profile)
            }
          },
        )
        .subscribe()
    }

    init()

    return () => {
      ignore = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  const handleSubmitRequest = async (formData: {
    leave_type: string
    start_date: string
    end_date: string
    duration_hours: number
    reason: string
  }) => {
    const { data, error } = await supabase.from('leave_requests').insert({
      employee_id: userId,
      leave_type: formData.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      duration_hours: formData.duration_hours,
      reason: formData.reason,
    }).select('*').single()

    if (error) throw error

    if (data) {
      if (formData.leave_type === 'زمنية') {
        const { data: p } = await supabase.from('profiles').select('hourly_balance').eq('id', userId).single()
        if (p) {
          await supabase.from('profiles').update({ hourly_balance: p.hourly_balance - 1 }).eq('id', userId)
          setProfile((prev) => prev ? { ...prev, hourly_balance: p.hourly_balance - 1 } : prev)
        }
      } else {
        const s = new Date(formData.start_date), e = new Date(formData.end_date)
        const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
        const { data: p } = await supabase.from('profiles').select('days_balance').eq('id', userId).single()
        if (p) {
          await supabase.from('profiles').update({ days_balance: p.days_balance - days }).eq('id', userId)
          setProfile((prev) => prev ? { ...prev, days_balance: p.days_balance - days } : prev)
        }
      }
      setRequests((prev) => [data as LeaveRequest, ...prev])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  if (loadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500">
        جاري التحميل...
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500">
        يرجى تسجيل الدخول
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar fullName={profile.full_name} role={profile.role} onLogout={handleLogout} activeView="" onNavigate={() => {}} />

      <main className="pr-[var(--sidebar-width)]">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">
              مرحباً، {profile.full_name}
            </h2>
            <p className="text-neutral-500 mt-1">لوحة التحكم</p>
          </div>

          <MetricCards
            daysBalance={profile.days_balance}
            hourlyBalance={profile.hourly_balance}
          />

          <LeaveRequestForm onSubmit={handleSubmitRequest} daysBalance={profile.days_balance} hourlyBalance={profile.hourly_balance} />

          <LeaveHistory requests={requests} loading={loadingRequests} />
        </div>
      </main>
    </div>
  )
}
