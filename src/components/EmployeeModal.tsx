import { useState, useEffect } from 'react'
import { X, User, Lock, ShieldCheck, Upload, CheckCircle, AlertCircle, Loader2, Save, Sun, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface EmployeeFormData {
  id?: string
  full_name: string
  password: string
  role: string
  days_balance?: number
  hourly_balance?: number
}

interface EmployeeModalProps {
  open: boolean
  editData?: EmployeeFormData | null
  onClose: () => void
  onSaved: () => void
}

export default function EmployeeModal({ open, editData, onClose, onSaved }: EmployeeModalProps) {
  const [tab, setTab] = useState<'manual' | 'excel'>('manual')
  const [form, setForm] = useState<EmployeeFormData>({ full_name: '', password: '', role: 'employee' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null)

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({ id: editData.id, full_name: editData.full_name, password: '', role: editData.role, days_balance: editData.days_balance ?? 3, hourly_balance: editData.hourly_balance ?? 2 })
        setTab('manual')
      } else {
        setForm({ full_name: '', password: '', role: 'employee' })
        setTab('manual')
      }
      setError('')
      setImportResult(null)
      setImportProgress(null)
    }
  }, [open, editData])

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('الاسم مطلوب'); return }
    if (!editData && !form.password) { setError('كلمة المرور مطلوبة'); return }
    if (!editData && form.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }

    setSaving(true)
    setError('')

    try {
      if (editData?.id) {
        if (editData.role === 'admin' && form.role !== 'admin') {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
          if (count !== null && count <= 1) {
            throw new Error('لا يمكن تغيير صلاحية المدير الوحيد. يجب وجود مدير واحد على الأقل.')
          }
        }
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ full_name: form.full_name.trim(), role: form.role, days_balance: form.days_balance, hourly_balance: form.hourly_balance })
          .eq('id', editData.id)
        if (updateErr) throw updateErr
      } else {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const { getCleanEmail } = await import('../lib/email')

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            storageKey: 'sb-temp-single-add',
            storage: { getItem() { return null }, setItem() {}, removeItem() {} },
          },
        })

        const email = getCleanEmail(form.full_name.trim())
        const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
          email,
          password: form.password,
          options: {
            data: {
              full_name: form.full_name.trim(),
              role: form.role,
            },
          },
        })

        if (signUpErr) throw signUpErr

        const newUserId = signUpData?.user?.id
        if (newUserId) {
          await supabase.from('profiles').update({ email }).eq('id', newUserId)
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg = typeof (err as Error).message === 'string'
        ? (err as Error).message
        : JSON.stringify(err)
      setError(msg || 'حدث خطأ أثناء الحفظ')
      console.error('Signup error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportProgress('جاري قراءة الملف...')
    setImportResult(null)

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | undefined)[]>(sheet, { header: 1 })

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const { createClient } = await import('@supabase/supabase-js')
      const { getCleanEmail } = await import('../lib/email')

      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          storageKey: 'sb-temp-modal-import',
          storage: { getItem() { return null }, setItem() {}, removeItem() {} },
        },
      })

      let successCount = 0
      let failCount = 0
      const errorList: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0] || !String(row[0]).trim()) continue

        const name = String(row[0]).trim()
        const password = row[1] ? String(row[1]).trim() : ''

        if (!password) {
          failCount++; errorList.push(`الصف ${i + 1}: "${name}" — كلمة المرور مفقودة`); continue
        }
        if (password.length < 6) {
          failCount++; errorList.push(`الصف ${i + 1}: "${name}" — كلمة المرور أقل من 6 أحرف`); continue
        }

        const email = getCleanEmail(name)
        setImportProgress(`جاري إنشاء: ${name} (${i + 1}/${rows.length})`)

        const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
          email, password,
          options: { data: { full_name: name, role: 'employee' } },
        })

        if (signUpErr) {
          failCount++; errorList.push(`"${name}": ${signUpErr.message || 'خطأ غير معروف'}`)
        } else {
          successCount++
          const newUserId = signUpData?.user?.id
          if (newUserId) {
            await supabase.from('profiles').update({ email }).eq('id', newUserId)
          }
        }
      }

      setImportResult({ success: successCount, fail: failCount, errors: errorList })
      setImportProgress(null)
      if (successCount > 0) onSaved()
    } catch (err) {
      setImportProgress(null)
      setImportResult({ success: 0, fail: 0, errors: [(err as Error).message || 'خطأ غير معروف'] })
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  const isEditing = !!editData?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-slate-600/60 shadow-2xl shadow-black/10 dark:shadow-black/30 p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
            {isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer">
            <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
          </button>
        </div>

        {!isEditing && (
          <div className="flex gap-2 bg-white/40 dark:bg-slate-800/40 rounded-2xl p-1">
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${tab === 'manual' ? 'bg-white shadow-sm text-neutral-900 dark:text-white dark:bg-slate-700' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'}`}
              onClick={() => setTab('manual')}
            >
              إضافة يدوي
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${tab === 'excel' ? 'bg-white shadow-sm text-neutral-900 dark:text-white dark:bg-slate-700' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200'}`}
              onClick={() => setTab('excel')}
            >
              استيراد من إكسل
            </button>
          </div>
        )}

        {tab === 'manual' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">الاسم الثلاثي للموظف</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                  placeholder="أدخل اسم الموظف"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400" />
                <input
                  type="password"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                  placeholder={isEditing ? 'اتركه فارغاً إذا لم ترد التغيير' : '••••••••'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">الصلاحيات</label>
              <div className="relative">
                <ShieldCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-slate-400 pointer-events-none" />
                <select
                  value={form.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition appearance-none cursor-pointer"
                >
                  <option value="employee">موظف</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">رصيد الأيام</label>
                  <div className="relative">
                    <Sun className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      lang="en"
                      dir="ltr"
                      value={form.days_balance}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        setForm((prev) => ({ ...prev, days_balance: v ? parseInt(v) : 0 }))
                      }}
                      className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-200">رصيد الساعات</label>
                  <div className="relative">
                    <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      lang="en"
                      dir="ltr"
                      value={form.hourly_balance}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        setForm((prev) => ({ ...prev, hourly_balance: v ? parseInt(v) : 0 }))
                      }}
                      className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition number"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 dark:bg-red-500/15 border border-red-300/30 dark:border-red-500/30 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-semibold text-sm hover:from-indigo-500 hover:to-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={onClose}
                className="px-8 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {tab === 'excel' && !isEditing && (
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
              id="modal-excel-input"
              disabled={importing}
            />
            <label
              htmlFor="modal-excel-input"
              className="block w-full py-6 px-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-slate-600 hover:border-emerald-400 bg-white/40 dark:bg-slate-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20 transition cursor-pointer text-center"
            >
              {importing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-sm text-neutral-600 dark:text-slate-400">{importProgress || 'جاري الاستيراد...'}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-neutral-400 dark:text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-slate-200">استيراد الموظفين من ملف إكسل</p>
                    <p className="text-xs text-neutral-400 dark:text-slate-400 mt-1">العمود الأول: الاسم — العمود الثاني: كلمة المرور</p>
                  </div>
                </div>
              )}
            </label>

            {importResult && !importing && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    تم بنجاح: {importResult.success}
                  </span>
                  {importResult.fail > 0 && (
                    <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      فشل: {importResult.fail}
                    </span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-1.5">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/50 text-neutral-700 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
