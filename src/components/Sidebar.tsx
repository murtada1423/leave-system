import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, LogOut, Info, X, Phone, Code, Menu, CalendarCheck, Sun, Moon } from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  fullName: string
  role: string
  onLogout: () => void
  activeView: string
  onNavigate: (view: string) => void
}

export default function Sidebar({ fullName, role, onLogout, activeView, onNavigate }: SidebarProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const [isDark, setIsDark] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('darkMode', String(isDark))
  }, [isDark])

  const toggleDarkMode = () => setIsDark((prev) => !prev)

  const closeSidebar = () => setSidebarOpen(false)
  const handleNav = (view: string) => { onNavigate(view); closeSidebar() }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-center cursor-pointer"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile logout */}
      <button
        onClick={() => setLogoutConfirmOpen(true)}
        className="fixed top-4 left-16 z-40 md:hidden w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center justify-center cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className={`w-[var(--sidebar-width)] h-screen bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border-l border-slate-200 dark:border-slate-700/50 flex flex-col fixed right-0 top-0 z-40 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">نظام إدارة الإجازات</h1>
        </div>

        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
          <p className="font-medium text-slate-900 dark:text-white">{fullName}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {role === 'admin' ? 'مدير النظام' : 'موظف'}
          </p>
        </div>

        {role === 'admin' && (
          <nav className="flex-1 p-4 space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 ${activeView === 'dashboard' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : ''}`}
              onClick={() => handleNav('dashboard')}
            >
              <LayoutDashboard className="w-5 h-5 ml-2.5" />
              لوحة التحكم
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 ${activeView === 'employees' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : ''}`}
              onClick={() => handleNav('employees')}
            >
              <Users className="w-5 h-5 ml-2.5" />
              سجل الموظفين
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 ${activeView === 'leave-history' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : ''}`}
              onClick={() => handleNav('leave-history')}
            >
              <CalendarCheck className="w-5 h-5 ml-2.5" />
              سجل الإجازات
            </Button>
          </nav>
        )}
        {role !== 'admin' && <div className="flex-1" />}

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
            <Sun className={`w-5 h-5 transition ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}`}
              aria-label="تبديل الوضع الداكن"
            >
              <div
                className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isDark ? 'left-[2px]' : 'right-[2px]'}`}
              />
            </button>
            <Moon className={`w-5 h-5 transition ${isDark ? 'text-indigo-400' : 'text-slate-300'}`} />
          </div>

          <Button
            variant="ghost"
            className={`w-full justify-start text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 ${aboutOpen ? 'bg-slate-100 dark:bg-slate-800/60' : ''}`}
            onClick={() => setAboutOpen(true)}
          >
            <Info className="w-5 h-5 ml-2.5" />
            لمحة عن النظام
          </Button>
        </div>

        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5 ml-2.5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setAboutOpen(false)}>
          <div
            className="w-full max-w-sm mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">لمحة عن النظام</h3>
              <button onClick={() => setAboutOpen(false)} className="p-2 rounded-xl hover:bg-white/60 transition cursor-pointer">
                <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-700/30">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">تصميم وبرمجة</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">مرتضى رزاق</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-700/30">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400">للتواصل</p>
                  <p className="text-base font-semibold text-neutral-900 dark:text-white number ltr" dir="ltr">07713964171</p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-neutral-400 dark:text-slate-500 number font-medium" dir="ltr">رقم الاصدار 1.6</p>

            <button
              onClick={() => setAboutOpen(false)}
              className="w-full h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setLogoutConfirmOpen(false)}>
          <div
            className="w-full max-w-sm mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-500/20">
              <LogOut className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">تأكيد تسجيل الخروج</h3>
              <p className="text-sm text-neutral-500 dark:text-slate-400 leading-relaxed">
                هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={onLogout}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold text-sm hover:from-red-500 hover:to-red-600 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-red-900/30"
              >
                <LogOut className="w-4 h-4" />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
