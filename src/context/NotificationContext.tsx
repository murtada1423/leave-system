import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}

interface NotificationContextValue {
  notifications: Notification[]
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
})

export function useNotifications() {
  return useContext(NotificationContext)
}

function showNativeNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Try via Service Worker (works for installed PWAs)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, icon: '/icon-512.svg', badge: '/icon-192.svg' })
    }).catch(() => {
      try { new Notification(title, { body, icon: '/icon-512.svg' }) } catch { /* */ }
    })
  } else {
    try { new Notification(title, { body, icon: '/icon-512.svg' }) } catch { /* */ }
  }
}

export function NotificationProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setNotifications(data as Notification[])
  }, [userId])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification
          setNotifications((prev) => [n, ...prev])
          showNativeNotification(n.title, n.message)

          toast(n.title, {
            description: n.message,
            duration: 5000,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  )
}
