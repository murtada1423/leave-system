import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogIn, Calendar, User, Lock, AlertCircle } from 'lucide-react'

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export default function LoginPage({ onLogin }: { onLogin?: () => void }) {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const trySignIn = async (email: string, password: string) => {
    console.log('Attempting login for email:', email)
    return supabase.auth.signInWithPassword({ email, password })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const trimmedInput = fullName.trim()
    const trimmedPassword = password.trim()

    const h = hashName(trimmedInput)

    // Try each email format in order
    const candidates = [`leave.${h}@example.com`, `user_${h}@leave.system`]

    for (const email of candidates) {
      const { error: err } = await trySignIn(email, trimmedPassword)
      if (!err) {
        setLoading(false)
        onLogin?.()
        return
      }
    }

    setLoading(false)
    setError('بيانات الدخول غير صحيحة. تأكد من الاسم وكلمة المرور.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[36rem] h-[36rem] bg-indigo-300/40 dark:bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[36rem] h-[36rem] bg-amber-300/40 dark:bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-rose-200/30 dark:bg-rose-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-white/40 dark:border-slate-700/40 shadow-xl shadow-black/5 dark:shadow-black/20 p-6 md:p-10 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-18 h-18 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
              <Calendar className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">نظام إدارة الإجازات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">سجل دخولك للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="fullName">
                الاسم الثلاثي
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                  placeholder="أدخل اسمك الثلاثي"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                <input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-sm rounded-2xl px-4 py-3 bg-red-500/10 dark:bg-red-500/15 border border-red-300/30 dark:border-red-500/30 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-semibold text-sm hover:from-indigo-500 hover:to-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              {loading ? (
                'جاري...'
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
