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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (Notification.permission !== 'granted') return

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.warn('Push: VITE_VAPID_PUBLIC_KEY not set')
    return
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })

    const json = sub.toJSON()
    if (!json.endpoint || !json.keys) return

    // Save to DB (upsert by endpoint)
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh!,
      auth: json.keys.auth!,
    }, { onConflict: 'user_id, endpoint' })
  } catch (err) {
    console.warn('Push subscription failed:', err)
  }
}

function showNativeNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, icon: '/icon-512.png', badge: '/icon-192.png' })
    }).catch(() => {
      try { new Notification(title, { body, icon: '/icon-512.png' }) } catch { /* */ }
    })
  } else {
    try { new Notification(title, { body, icon: '/icon-512.png' }) } catch { /* */ }
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
    subscribeToPush(userId)

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
