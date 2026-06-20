import { User, X } from 'lucide-react'

interface EmployeeRecord {
  id: string
  full_name: string
  role: string
}

interface AttendanceModalProps {
  title: string
  employees: EmployeeRecord[]
  open: boolean
  onClose: () => void
}

export default function AttendanceModal({ title, employees, open, onClose }: AttendanceModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 min-h-0">
          {employees.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-slate-500 text-center py-8">لا يوجد موظفون</p>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-700/30"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">{emp.full_name}</p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                    {emp.role === 'admin' ? 'مدير' : 'موظف'}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {emp.role === 'admin' ? 'مدير' : 'موظف'}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  )
}
