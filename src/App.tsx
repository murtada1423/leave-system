import { useEffect, useState, useRef } from 'react'
import { type Session } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import { supabase } from './lib/supabase'
import { NotificationProvider } from './context/NotificationContext'
import LoginPage from './components/LoginPage'
import EmployeeDashboard from './components/EmployeeDashboard'
import AdminDashboard from './components/AdminDashboard'

interface Profile {
  role: string
  full_name?: string
  password_changed_at?: string
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const passwordVersionRef = useRef<string | null>(null)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission status:', permission)
      })
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s)
        fetchProfile(s.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession(s)
        fetchProfile(s.user.id)
      } else {
        setSession(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // مراقبة تغيير كلمة المرور — تسجيل خروج فوري
  useEffect(() => {
    if (!session?.user?.id || !passwordVersionRef.current) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('password_changed_at')
        .eq('id', session.user.id)
        .single()
      if (data && data.password_changed_at !== passwordVersionRef.current) {
        await supabase.auth.signOut()
        window.location.reload()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [session?.user?.id])

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name, password_changed_at')
      .eq('id', userId)
      .single()

    if (data) {
      passwordVersionRef.current = data.password_changed_at
      setProfile(data)
      setLoading(false)
      return
    }

    if (error?.code === 'PGRST116') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name && user?.user_metadata?.role) {
        await supabase.from('profiles').insert({
          id: userId,
          full_name: user.user_metadata.full_name,
          role: user.user_metadata.role,
        })
        setProfile({
          role: user.user_metadata.role as string,
          full_name: user.user_metadata.full_name as string,
        })
      }
    }

    setLoading(false)
  }

  const handleLogin = () => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setSession(s)
        fetchProfile(s.user.id)
      }
    })
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage onLogin={handleLogin} />

  const dashboard = profile?.role === 'admin'
    ? <AdminDashboard userId={session.user.id} onLogout={() => supabase.auth.signOut()} />
    : <EmployeeDashboard userId={session.user.id} onLogout={() => supabase.auth.signOut()} />

  return (
    <NotificationProvider userId={session.user.id}>
      {dashboard}
      <Toaster
        position="top-left"
        richColors
        closeButton
        dir="rtl"
        duration={5000}
      />
    </NotificationProvider>
  )
}
