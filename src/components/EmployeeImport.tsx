import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getCleanEmail } from '../lib/email'
import { supabase } from '../lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    storageKey: 'sb-temp-bulk-import',
    storage: {
      getItem() { return null },
      setItem() {},
      removeItem() {},
    },
  },
})

export default function EmployeeImport({ onImported }: { onImported?: () => void }) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setProgress('جاري قراءة الملف...')
    setResult(null)

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | undefined)[]>(sheet, { header: 1 })

      let successCount = 0
      let failCount = 0
      const errorList: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0] || !String(row[0]).trim()) continue

        const name = String(row[0]).trim()
        const password = row[1] ? String(row[1]).trim() : ''

        if (!password) {
          failCount++
          errorList.push(`الصف ${i + 1}: "${name}" — كلمة المرور مفقودة`)
          continue
        }

        if (password.length < 6) {
          failCount++
          errorList.push(`الصف ${i + 1}: "${name}" — كلمة المرور أقل من 6 أحرف`)
          continue
        }

        const email = getCleanEmail(name)
        setProgress(`جاري إنشاء: ${name} (${i + 1}/${rows.length})`)

        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: 'employee',
            },
          },
        })

        if (signUpError) {
          failCount++
          errorList.push(`"${name}": ${signUpError.message || 'خطأ غير معروف في السيرفر'}`)
        } else {
          successCount++
          const newUserId = signUpData?.user?.id
          if (newUserId) {
            await supabase.from('profiles').update({ email }).eq('id', newUserId)
          }
        }
      }

      setResult({ success: successCount, fail: failCount, errors: errorList })
      setProgress(null)
      if (successCount > 0) {
        onImported?.()
      }
    } catch (err) {
      setProgress(null)
      setResult({ success: 0, fail: 0, errors: [(err as Error).message || 'خطأ غير معروف في السيرفر'] })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="backdrop-blur-2xl bg-white/60 rounded-3xl border border-white/40 shadow-xl shadow-black/5 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <FileSpreadsheet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-neutral-900">إدارة الموظفين</h3>
          <p className="text-sm text-neutral-500">استيراد موظفين جدد من ملف إكسل</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="hidden"
        disabled={importing}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-emerald-400 bg-white/40 hover:bg-emerald-50/40 transition flex flex-col items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {importing ? (
          <>
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-sm text-neutral-600">{progress || 'جاري الاستيراد...'}</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-neutral-400 group-hover:text-emerald-500 transition" />
            <div className="text-center">
              <span className="text-sm font-medium text-neutral-700 group-hover:text-emerald-600 transition">
                استيراد الموظفين من ملف إكسل
              </span>
              <p className="text-xs text-neutral-400 mt-1">العمود الأول: الاسم — العمود الثاني: كلمة المرور</p>
            </div>
          </>
        )}
      </button>

      {result && !importing && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              تم بنجاح: {result.success}
            </span>
            {result.fail > 0 && (
              <span className="flex items-center gap-1.5 text-red-500">
                <AlertCircle className="w-4 h-4" />
                فشل: {result.fail}
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-1.5">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
