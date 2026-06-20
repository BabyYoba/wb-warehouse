'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Package, Loader2, Eye, EyeOff, Mail } from 'lucide-react'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<Mode>('password')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingApple, setLoadingApple]   = useState(false)
  const [error, setError]       = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const handlePassword = async () => {
    if (!email || !password) { setError('Заполни все поля'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Неверный email или пароль'); setLoading(false); return }
    router.push('/'); router.refresh()
  }

  const handleMagicLink = async () => {
    if (!email) { setError('Введи email'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) { setError('Ошибка отправки. Проверь email.'); setLoading(false); return }
    setMagicSent(true)
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoadingGoogle(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleApple = async () => {
    setLoadingApple(true)
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') mode === 'password' ? handlePassword() : handleMagicLink()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: 'var(--brand)' }}>
            <Package size={28} color="white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Склад WB</h1>
            <p className="text-sm text-gray-500 mt-1">Войдите в свой аккаунт</p>
          </div>
        </div>

        {magicSent ? (
          <div className="card p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Mail size={24} className="text-green-600"/>
            </div>
            <div className="font-semibold text-gray-800">Проверь почту</div>
            <div className="text-sm text-gray-500">
              Мы отправили ссылку для входа на <strong>{email}</strong>.<br/>
              Нажми на неё — и ты войдёшь автоматически.
            </div>
            <button className="text-sm text-blue-600 hover:underline" onClick={() => setMagicSent(false)}>
              Отправить снова
            </button>
          </div>
        ) : (
          <div className="card p-6 space-y-4">

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="btn btn-secondary justify-center py-2.5 gap-2"
                onClick={handleGoogle}
                disabled={loadingGoogle}
              >
                {loadingGoogle ? <Loader2 size={16} className="animate-spin"/> : (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Google
              </button>

              <button
                className="btn btn-secondary justify-center py-2.5 gap-2"
                onClick={handleApple}
                disabled={loadingApple}
              >
                {loadingApple ? <Loader2 size={16} className="animate-spin"/> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                )}
                Apple
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200"/>
              <span className="text-xs text-gray-400">или</span>
              <div className="flex-1 h-px bg-gray-200"/>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
              {([['password', 'Пароль'], ['magic', 'Magic Link']] as [Mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
                  style={{
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>

            {/* Password (only in password mode) */}
            {mode === 'password' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Пароль</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            )}

            {mode === 'magic' && (
              <p className="text-xs text-gray-400">
                Мы отправим ссылку для входа на твой email — пароль не нужен.
              </p>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              className="btn btn-primary w-full justify-center py-2.5"
              onClick={mode === 'password' ? handlePassword : handleMagicLink}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin"/>Загрузка...</>
                : mode === 'password' ? 'Войти' : 'Отправить ссылку'
              }
            </button>

          </div>
        )}

      </div>
    </div>
  )
}
