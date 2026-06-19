import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import AdminStatsCards from './AdminStatsCards'
import AttendanceCards from './AttendanceCards'
import AttendanceModal from './AttendanceModal'
import PendingRequestsTable from './PendingRequestsTable'
import EmployeeManagementView from './EmployeeManagementView'
import AdminLeaveHistoryView from './AdminLeaveHistoryView'

interface Profile {
  id: string
  full_name: string
  role: string
}

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

interface EmployeeRecord {
  id: string
  full_name: string
  role: string
  days_balance: number
  hourly_balance: number
  created_at: string
}

interface AdminDashboardProps {
  userId: string
  onLogout: () => void
}

export default function AdminDashboard({ userId, onLogout }: AdminDashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [approvedLeaves, setApprovedLeaves] = useState<PendingRequest[]>([])
  const [loadingApproved, setLoadingApproved] = useState(true)
  const [attendanceCard, setAttendanceCard] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const profileRes = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (ignore) return
      if (profileRes.data) setProfile(profileRes.data)
      setLoadingProfile(false)

      if (!profileRes.data) return

      await fetchData()

      const refreshApproved = async () => {
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
            created_at,
            profiles!inner ( full_name )
          `)
          .eq('status', 'مقبولة')
          .order('created_at', { ascending: false })
        if (data) {
          const mapped: PendingRequest[] = data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            employee_id: r.employee_id as string,
            full_name: (r.profiles as Record<string, string>).full_name,
            leave_type: r.leave_type as string,
            start_date: r.start_date as string,
            end_date: r.end_date as string,
            duration_hours: r.duration_hours as number,
            reason: r.reason as string | null,
            created_at: r.created_at as string,
          }))
          setApprovedLeaves(mapped)
        }
      }

      channel = supabase
        .channel('admin_changes')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leave_requests' },
          async () => {
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
                created_at,
                profiles!inner ( full_name )
              `)
              .eq('status', 'قيد الانتظار')
              .order('created_at', { ascending: false })

            if (data) {
              const mapped: PendingRequest[] = data.map((r: Record<string, unknown>) => ({
                id: r.id as string,
                employee_id: r.employee_id as string,
                full_name: (r.profiles as Record<string, string>).full_name,
                leave_type: r.leave_type as string,
                start_date: r.start_date as string,
                end_date: r.end_date as string,
                duration_hours: r.duration_hours as number,
                reason: r.reason as string | null,
                created_at: r.created_at as string,
              }))
              setPendingRequests(mapped)
            }
            await refreshApproved()
          },
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'leave_requests' },
          (payload) => {
            if (payload.new && payload.old) {
              const oldStatus = (payload.old as Record<string, string>).status
              const newStatus = (payload.new as Record<string, string>).status
              if (oldStatus === 'قيد الانتظار' && newStatus !== 'قيد الانتظار') {
                setPendingRequests((prev) => prev.filter((r) => r.id !== (payload.new as Record<string, string>).id))
              } else {
                supabase
                  .from('leave_requests')
                  .select(`
                    id,
                    employee_id,
                    leave_type,
                    start_date,
                    end_date,
                    duration_hours,
                    reason,
                    created_at,
                    profiles!inner ( full_name )
                  `)
                  .eq('status', 'قيد الانتظار')
                  .order('created_at', { ascending: false })
                  .then(({ data }) => {
                    if (data) {
                      const mapped: PendingRequest[] = data.map((r: Record<string, unknown>) => ({
                        id: r.id as string,
                        employee_id: r.employee_id as string,
                        full_name: (r.profiles as Record<string, string>).full_name,
                        leave_type: r.leave_type as string,
                        start_date: r.start_date as string,
                        end_date: r.end_date as string,
                        duration_hours: r.duration_hours as number,
                        reason: r.reason as string | null,
                        created_at: r.created_at as string,
                      }))
                      setPendingRequests(mapped)
                    }
                  })
              }
            }
            refreshApproved()
          },
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'leave_requests' },
          (payload) => {
            if (payload.old) {
              setPendingRequests((prev) => prev.filter((r) => r.id !== (payload.old as Record<string, string>).id))
            }
            refreshApproved()
          },
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .order('full_name')

            if (data) setEmployees(data as EmployeeRecord[])
          },
        )
        .subscribe()
    }

    const fetchData = async () => {
      const [pendingRes, employeesRes, approvedRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select(`
            id,
            employee_id,
            leave_type,
            start_date,
            end_date,
            duration_hours,
            reason,
            created_at,
            profiles!inner ( full_name )
          `)
          .eq('status', 'قيد الانتظار')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('full_name'),
        supabase
          .from('leave_requests')
          .select(`
            id,
            employee_id,
            leave_type,
            start_date,
            end_date,
            duration_hours,
            reason,
            created_at,
            profiles!inner ( full_name )
          `)
          .eq('status', 'مقبولة')
          .order('created_at', { ascending: false }),
      ])

      if (ignore) return

      if (pendingRes.data) {
        const mapped: PendingRequest[] = pendingRes.data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          employee_id: r.employee_id as string,
          full_name: (r.profiles as Record<string, string>).full_name,
          leave_type: r.leave_type as string,
          start_date: r.start_date as string,
          end_date: r.end_date as string,
          duration_hours: r.duration_hours as number,
          reason: r.reason as string | null,
          created_at: r.created_at as string,
        }))
        setPendingRequests(mapped)
      }
      if (employeesRes.data) setEmployees(employeesRes.data as EmployeeRecord[])
      if (approvedRes.data) {
        const mapped: PendingRequest[] = approvedRes.data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          employee_id: r.employee_id as string,
          full_name: (r.profiles as Record<string, string>).full_name,
          leave_type: r.leave_type as string,
          start_date: r.start_date as string,
          end_date: r.end_date as string,
          duration_hours: r.duration_hours as number,
          reason: r.reason as string | null,
          created_at: r.created_at as string,
        }))
        setApprovedLeaves(mapped)
      }
      setLoadingRequests(false)
      setLoadingEmployees(false)
      setLoadingApproved(false)
    }

    init()

    const poll = setInterval(async () => {
      if (ignore) return
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
          created_at,
          profiles!inner ( full_name )
        `)
        .eq('status', 'قيد الانتظار')
        .order('created_at', { ascending: false })
      if (data && !ignore) {
        const mapped: PendingRequest[] = data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          employee_id: r.employee_id as string,
          full_name: (r.profiles as Record<string, string>).full_name,
          leave_type: r.leave_type as string,
          start_date: r.start_date as string,
          end_date: r.end_date as string,
          duration_hours: r.duration_hours as number,
          reason: r.reason as string | null,
          created_at: r.created_at as string,
        }))
        setPendingRequests(mapped)
      }
    }, 5000)

    return () => {
      ignore = true
      clearInterval(poll)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [])

  const onLeaveTodayEmployeeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const l of approvedLeaves) {
      if (l.start_date <= todayStr && l.end_date >= todayStr) {
        ids.add(l.employee_id)
      }
    }
    return ids
  }, [approvedLeaves, todayStr])

  const onLeaveTomorrowEmployeeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const l of approvedLeaves) {
      if (l.start_date <= tomorrowStr && l.end_date >= tomorrowStr) {
        ids.add(l.employee_id)
      }
    }
    return ids
  }, [approvedLeaves, tomorrowStr])

  const presentEmployees = useMemo(() => {
    return employees.filter((e) => !onLeaveTodayEmployeeIds.has(e.id))
  }, [employees, onLeaveTodayEmployeeIds])

  const onLeaveTodayEmployees = useMemo(() => {
    return employees.filter((e) => onLeaveTodayEmployeeIds.has(e.id))
  }, [employees, onLeaveTodayEmployeeIds])

  const onLeaveTomorrowEmployees = useMemo(() => {
    return employees.filter((e) => onLeaveTomorrowEmployeeIds.has(e.id))
  }, [employees, onLeaveTomorrowEmployeeIds])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      const { error } = await supabase.rpc('approve_leave_request', { request_id: id })
      if (error) throw error
    } catch (err) {
      console.error('Approve failed:', err)
      alert('فشل قبول الطلب')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    try {
      const { error } = await supabase.rpc('reject_leave_request', { request_id: id })
      if (error) throw error
    } catch (err) {
      console.error('Reject failed:', err)
      alert('فشل رفض الطلب')
    } finally {
      setProcessing(null)
    }
  }

  const handleAttendanceCardClick = (card: 'present' | 'today' | 'tomorrow') => {
    setAttendanceCard(card)
  }

  const attendanceModalTitle =
    attendanceCard === 'present' ? 'الموظفون المتواجدون اليوم'
    : attendanceCard === 'today' ? 'مجازون اليوم'
    : attendanceCard === 'tomorrow' ? 'مجازون غداً'
    : ''

  const attendanceModalEmployees =
    attendanceCard === 'present' ? presentEmployees
    : attendanceCard === 'today' ? onLeaveTodayEmployees
    : attendanceCard === 'tomorrow' ? onLeaveTomorrowEmployees
    : []

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const refreshEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')

    if (data) setEmployees(data as EmployeeRecord[])
  }

  if (loadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500 dark:text-slate-400">
        جاري التحميل...
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500 dark:text-slate-400">
        يرجى تسجيل الدخول
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950">
      <Sidebar
        fullName={profile.full_name}
        role={profile.role}
        onLogout={handleLogout}
        activeView={activeView}
        onNavigate={setActiveView}
      />

      <main className="pr-0 md:pr-[var(--sidebar-width)] bg-neutral-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          {activeView === 'dashboard' && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">
                  لوحة تحكم المدير
                </h2>
                <p className="text-neutral-500 dark:text-slate-400 mt-1">مرحباً، {profile.full_name}</p>
              </div>

              <AdminStatsCards
                totalEmployees={employees.length}
                pendingRequests={pendingRequests.length}
              />

              <AttendanceCards
                presentCount={presentEmployees.length}
                onLeaveTodayCount={onLeaveTodayEmployees.length}
                onLeaveTomorrowCount={onLeaveTomorrowEmployees.length}
                loading={loadingApproved}
                onCardClick={handleAttendanceCardClick}
              />

              <PendingRequestsTable
                requests={pendingRequests}
                loading={loadingRequests}
                onApprove={handleApprove}
                onReject={handleReject}
                processing={processing}
              />
            </>
          )}

          <AttendanceModal
            title={attendanceModalTitle}
            employees={attendanceModalEmployees}
            open={!!attendanceCard}
            onClose={() => setAttendanceCard(null)}
          />

          {activeView === 'employees' && (
            <EmployeeManagementView
              employees={employees}
              loading={loadingEmployees}
              onRefresh={refreshEmployees}
            />
          )}

          {activeView === 'leave-history' && (
            <AdminLeaveHistoryView employees={employees} />
          )}
        </div>
      </main>
    </div>
  )
}
