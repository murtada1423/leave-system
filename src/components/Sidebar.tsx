import { useState } from 'react'
import { LayoutDashboard, Users, LogOut, Info, X, Phone, Code } from 'lucide-react'
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

  return (
    <>
      <aside className="w-[var(--sidebar-width)] h-screen bg-white/70 backdrop-blur-2xl border-l border-slate-200 flex flex-col fixed right-0 top-0">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">نظام إدارة الإجازات</h1>
        </div>

        <div className="p-6 border-b border-slate-100">
          <p className="font-medium text-slate-900">{fullName}</p>
          <p className="text-sm text-slate-500 mt-1">
            {role === 'admin' ? 'مدير النظام' : 'موظف'}
          </p>
        </div>

        {role === 'admin' && (
          <nav className="flex-1 p-4 space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-start text-slate-700 hover:bg-slate-100 ${activeView === 'dashboard' ? 'bg-slate-100 font-semibold' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              <LayoutDashboard className="w-5 h-5 ml-2.5" />
              لوحة التحكم
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start text-slate-700 hover:bg-slate-100 ${activeView === 'employees' ? 'bg-slate-100 font-semibold' : ''}`}
              onClick={() => onNavigate('employees')}
            >
              <Users className="w-5 h-5 ml-2.5" />
              سجل الموظفين
            </Button>
          </nav>
        )}
        {role !== 'admin' && <div className="flex-1" />}

        <div className="p-4 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            onClick={() => setAboutOpen(true)}
          >
            <Info className="w-5 h-5 ml-2.5" />
            لمحة عن البرنامج
          </Button>
        </div>

        <div className="px-4 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
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
            className="w-full max-w-sm mx-4 backdrop-blur-2xl bg-white/70 rounded-3xl border border-white/40 shadow-2xl shadow-black/10 p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">لمحة عن النظام</h3>
              <button onClick={() => setAboutOpen(false)} className="p-2 rounded-xl hover:bg-white/60 transition cursor-pointer">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-neutral-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">تصميم وبرمجة</p>
                  <p className="text-lg font-bold text-neutral-900">مرتضى رزاق</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-neutral-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">للتواصل</p>
                  <p className="text-base font-semibold text-neutral-900 number ltr" dir="ltr">07713964171</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setAboutOpen(false)}
              className="w-full h-11 rounded-2xl bg-white/80 border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-white transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  )
}
