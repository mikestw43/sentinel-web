'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: username, password })
    if (error) { setError('Invalid username or password'); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-[#040d1a] flex items-center justify-center font-mono"
      style={{backgroundImage:'linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px)',backgroundSize:'40px 40px'}}>

      {/* corner brackets */}
      <div className="fixed top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-sky-400"/>
      <div className="fixed top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-sky-400"/>
      <div className="fixed bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-sky-400"/>
      <div className="fixed bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-sky-400"/>

      <div className="w-full max-w-md px-4 z-10">

        {/* logo outside box */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-400 mb-3"
            style={{clipPath:'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)'}}>
            <span className="font-['VT323'] text-3xl text-[#040d1a]">S</span>
          </div>
          <div className="font-['VT323'] text-4xl text-sky-400 tracking-[0.2em]">SENTINEL</div>
          <div className="text-xs text-sky-400/40 tracking-[0.15em] mt-1">MT5 TRADING DASHBOARD</div>
        </div>

        {/* box — no border */}
        <div className="bg-[#071428] px-6 py-6">

          {/* operator login header */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sky-400 text-sm">◆</span>
            <span className="font-['VT323'] text-xl text-sky-400 tracking-[0.15em]">OPERATOR LOGIN</span>
            <div className="flex-1 h-px bg-sky-400/25 ml-1"/>
          </div>

          {error && (
            <div className="bg-red-400/10 border border-red-400/30 text-red-400 text-xs px-3 py-2 mb-4 tracking-wide">
              ⚠ {error}
            </div>
          )}

          {/* username */}
          <div className="mb-4">
            <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1.5">USERNAME</label>
            <input
              type="text" value={username}
              onChange={e=>setUsername(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              className="w-full bg-white border-0 text-[#040d1a] font-mono text-sm py-2.5 px-3 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* password */}
          <div className="mb-5">
            <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1.5">PASSWORD</label>
            <input
              type="password" value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              className="w-full bg-white border-0 text-[#040d1a] font-mono text-sm py-2.5 px-3 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* access system btn */}
          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-sky-400 text-[#040d1a] font-['VT323'] text-2xl tracking-[0.2em] py-3 cursor-pointer hover:bg-sky-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            <span>▶</span>
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}</span>
          </button>

          {/* divider */}
          <div className="flex items-center gap-2.5 my-4 text-sky-400/30 text-xs tracking-widest">
            <div className="flex-1 h-px bg-sky-400/15"/>OR<div className="flex-1 h-px bg-sky-400/15"/>
          </div>

          {/* google — dark bg */}
          <button onClick={handleGoogleLogin} disabled={googleLoading}
            className="w-full bg-[#0a1d3a] border border-sky-400/20 text-sky-400 font-['VT323'] text-xl tracking-[0.15em] py-2.5 cursor-pointer flex items-center justify-center gap-2.5 hover:bg-sky-400/8 hover:border-sky-400/40 disabled:opacity-50 transition-all">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
          </button>

          {/* footer inside box */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-sky-400/10">
            <div className="flex items-center gap-1.5 text-xs text-sky-400/40 tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
              SYSTEM ONLINE · SECURE
            </div>
            <button onClick={()=>router.push('/register')}
              className="font-['VT323'] text-lg text-sky-400 tracking-widest hover:text-sky-300 transition-colors cursor-pointer bg-transparent border-0">
              SIGN UP →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
