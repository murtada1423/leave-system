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
        className="w-full max-w-lg mx-4 backdrop-blur-2xl bg-white/70 rounded-3xl border border-white/40 shadow-2xl shadow-black/10 p-8 space-y-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1 min-h-0">
          {employees.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">لا يوجد موظفون</p>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-neutral-100"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{emp.full_name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {emp.role === 'admin' ? 'مدير' : 'موظف'}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                  {emp.role === 'admin' ? 'مدير' : 'موظف'}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl bg-white/80 border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-white transition shrink-0 cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  )
}
