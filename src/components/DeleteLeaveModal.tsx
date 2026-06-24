import { AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteLeaveModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
  leaveStatus?: string
}

export default function DeleteLeaveModal({ open, onClose, onConfirm, loading, leaveStatus }: DeleteLeaveModalProps) {
  if (!open) return null

  const isRejected = leaveStatus === 'مرفوضة'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-500/20">
          <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">تأكيد حذف الإجازة</h3>
          <p className="text-sm text-neutral-500 dark:text-slate-400 leading-relaxed">
            {isRejected
              ? 'هل أنت متأكد من حذف هذه الإجازة المرفوضة نهائياً من السجل؟'
              : 'هل أنت متأكد من حذف هذه الإجازة؟ سيتم استرجاع رصيد الموظف تلقائياً فوراً.'
            }
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-200 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold text-sm hover:from-red-500 hover:to-red-600 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-red-900/30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  )
}