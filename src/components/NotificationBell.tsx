import { Bell, BellRing, Check, CheckCheck, Clock, X } from 'lucide-react'
import { useNotifications, type Notification } from '../context/NotificationContext'
import { useState, useRef, useEffect } from 'react'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} ي`
  return new Date(dateStr).toLocaleDateString('ar-IQ')
}

function typeStyles(type: string) {
  switch (type) {
    case 'success': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30'
    case 'error': return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/30'
    case 'warning': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30'
    default: return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/30'
  }
}

function typeDot(type: string) {
  switch (type) {
    case 'success': return 'bg-emerald-500'
    case 'error': return 'bg-red-500'
    case 'warning': return 'bg-amber-500'
    default: return 'bg-indigo-500'
  }
}

export default function NotificationBell() {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-slate-700/80 transition"
        aria-label="الإشعارات"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div
          ref={panelRef}
          className="hidden md:flex absolute top-full right-0 left-auto mt-2 w-80 flex-col rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 z-50 origin-top-left animate-fade-in max-h-[70vh]"
        >
          <NotificationPanelHeader unreadCount={unreadCount} markAllAsRead={markAllAsRead} />
          <NotificationList notifications={notifications} markAsRead={markAsRead} />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] flex flex-col rounded-t-[28px] backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-600/60 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/30 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    تحديد الكل
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-12">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                  <Bell className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markAsRead(n.id)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationPanelHeader({ unreadCount, markAllAsRead }: { unreadCount: number; markAllAsRead: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700/30">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">الإشعارات</h3>
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          تحديد الكل كمقروء
        </button>
      )}
    </div>
  )
}

function NotificationList({ notifications: items, markAsRead }: { notifications: Notification[]; markAsRead: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
        <Bell className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">لا توجد إشعارات</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {items.map((n) => (
        <NotificationItem key={n.id} notification={n} onMarkRead={() => markAsRead(n.id)} />
      ))}
    </div>
  )
}

function NotificationItem({ notification: n, onMarkRead }: { notification: Notification; onMarkRead: () => void }) {
  return (
    <div
      onClick={() => { if (!n.is_read) onMarkRead() }}
      className={`flex items-start gap-3 p-3 rounded-2xl transition cursor-pointer ${
        n.is_read
          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
          : 'bg-indigo-50/60 dark:bg-indigo-500/5 hover:bg-indigo-100/60 dark:hover:bg-indigo-500/10'
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${typeDot(n.type)} ${n.is_read ? 'opacity-0' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${typeStyles(n.type)} px-2 py-0.5 rounded-lg border`}>
            {n.title}
          </span>
        </div>
        <p className={`text-xs mt-1.5 leading-relaxed ${n.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
          {n.message}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelativeTime(n.created_at)}</span>
        </div>
      </div>
      {!n.is_read && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead() }}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition shrink-0 cursor-pointer"
          aria-label="تحديد كمقروء"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
