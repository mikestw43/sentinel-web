'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Account = {
  id: string; nickname: string; api_key: string; is_active: boolean
  is_online: boolean; account_number: string; broker_name: string
  currency: string; created_at: string; last_seen: string
}

type Profile = { id: string; max_slots: number; package_tier: string; status: string; role: string }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profile, setProfile] = useState<Profile|null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [nickname, setNickname] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState({text:'',type:'success'})
  const [copiedId, setCopiedId] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const [showKey, setShowKey] = useState<Record<string,boolean>>({})
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = authProfile?.role === 'admin'

  const load = useCallback(async () => {
    if (!user) return
    if (authProfile) setProfile(authProfile as any)
    const { data: accs } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (accs) setAccounts(accs)
    setDataLoading(false)
  }, [user, authProfile])

  useEffect(() => {
    if (!authLoading && !user) { router.push('/'); return }
    if (!authLoading && user) load()
  }, [authLoading, user, load])

  function showMsg(text: string, type = 'success') {
    setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: 'success' }), 3000)
  }

  async function addAccount() {
    if (!nickname.trim()) { showMsg('Please enter account name', 'error'); return }
    if (!isAdmin && accounts.length >= (profile?.max_slots || 1)) { showMsg('Slot limit reached', 'error'); return }
    setAdding(true)
    const { error } = await supabase.from('accounts').insert({ user_id: user!.id, nickname: nickname.trim() }).select().single()
    if (error) { showMsg('Error: ' + error.message, 'error'); setAdding(false); return }
    showMsg('✓ Account added!')
    setNickname(''); setShowAdd(false); setAdding(false); load()
  }

  async function deleteAccount(id: string) {
    await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    showMsg('✓ Account removed'); setConfirmDelete(null); load()
  }

  function copyKey(key: string, id: string) {
    navigator.clipboard.writeText(key)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  function toggleKey(id: string) { setShowKey(prev => ({ ...prev, [id]: !prev[id] })) }

  const slotsUsed = accounts.filter(a => a.is_active).length
  const slotsMax = isAdmin ? 999 : (profile?.max_slots || 1)
  const slotPct = Math.min(100, slotsUsed / slotsMax * 100)
  const slotFull = !isAdmin && slotsUsed >= slotsMax

  function tierColor(t: string) { return t === 'elite' ? 'text-red-400' : t === 'pro' ? 'text-purple-400' : t === 'basic' ? 'text-sky-400' : 'text-sky-400/40' }
  function tierBorder(t: string) { return t === 'elite' ? 'border-red-400/55' : t === 'pro' ? 'border-purple-400/55' : t === 'basic' ? 'border-sky-400/55' : 'border-sky-400/20' }

  const gridBg = { backgroundImage: 'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }
  const clipBtn = { clipPath: 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))' }

  if (authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-[#040d1a] flex items-center justify-center font-vt text-3xl text-sky-400 tracking-[0.2em]">LOADING...</div>
  )

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <div className="fixed inset-0 pointer-events-none z-0" style={gridBg} />

      {/* HEADER */}
      <header className="bg-[#071428] border-b border-sky-400/20 sticky top-0 z-50"
        style={{ boxShadow: '0 1px 20px rgba(56,189,248,0.08)' }}>
        <div className="max-w-3xl mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-400 flex items-center justify-center font-vt text-lg text-[#040d1a] flex-shrink-0"
            style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)', boxShadow: '0 0 10px rgba(56,189,248,0.5)' }}>S</div>
          <div className="font-vt text-xl text-sky-400 tracking-[0.18em]"
            style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>MY ACCOUNTS</div>
          {isAdmin && (
            <span className="font-vt text-xs text-yellow-400 border border-yellow-400/30 px-2 py-0.5 tracking-widest">
              ADMIN
            </span>
          )}
          <button onClick={() => router.push('/dashboard')}
            className="ml-auto font-vt text-base text-sky-400/60 border border-sky-400/20 px-3 py-1 hover:text-sky-400 hover:border-sky-400 transition-colors cursor-pointer bg-transparent">
            ← DASHBOARD
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 relative z-10">

        {/* MSG */}
        {msg.text && (
          <div className={`font-vt text-lg px-4 py-2 mb-3 tracking-wide ${msg.type === 'success' ? 'bg-green-400/10 border border-green-400/30 text-green-400' : 'bg-red-400/10 border border-red-400/30 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* SLOT BAR */}
        <div className="bg-[#071428] border border-sky-400/15 p-4 mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <div className="font-vt text-lg text-white tracking-wide mb-1.5">
              ACCOUNT SLOTS — {slotsUsed}/{isAdmin ? '∞' : slotsMax} USED
            </div>
            <div className="h-1.5 bg-[#040d1a] overflow-hidden">
              <div className={`h-full transition-all ${slotFull ? 'bg-red-400' : 'bg-sky-400'}`}
                style={{ width: isAdmin ? '0%' : `${slotPct}%`, boxShadow: slotFull ? '0 0 6px #f87171' : '0 0 6px #38bdf8' }} />
            </div>
            <div className="text-[11px] text-sky-400/40 mt-1 font-mono">
              {isAdmin ? 'UNLIMITED SLOTS · ADMIN' : `${slotsMax - slotsUsed} slot${slotsMax - slotsUsed !== 1 ? 's' : ''} remaining · ${profile?.package_tier?.toUpperCase() || 'FREE'} PLAN`}
            </div>
          </div>
          <span className={`font-vt text-sm px-3 py-1 border ${isAdmin ? 'text-yellow-400 border-yellow-400/40' : tierColor(profile?.package_tier || 'free') + ' ' + tierBorder(profile?.package_tier || 'free')}`}>
            {isAdmin ? 'ADMIN' : profile?.package_tier?.toUpperCase() || 'FREE'}
          </span>
          <button disabled={slotFull || showAdd} onClick={() => setShowAdd(true)}
            className="font-vt text-base px-4 py-2 bg-sky-400 text-[#040d1a] cursor-pointer hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={clipBtn}>
            + ADD ACCOUNT
          </button>
        </div>

        {/* ADD FORM */}
        {showAdd && (
          <div className="bg-[#071428] border border-sky-400/20 border-t-2 border-t-sky-400 p-4 mb-4">
            <div className="font-vt text-lg text-sky-400 tracking-wide mb-3">NEW MT5 ACCOUNT</div>
            <div className="mb-3">
              <label className="block text-[11px] text-sky-400/60 tracking-widest mb-1">ACCOUNT NAME / NICKNAME <span className="text-red-400">*</span></label>
              <input className="w-full bg-[#040d1a] border border-sky-400/20 text-white font-mono text-sm px-3 py-2 outline-none focus:border-sky-400 transition-colors placeholder:text-sky-400/20"
                type="text" placeholder="e.g. HoldBro, Prop Firm A" value={nickname}
                onChange={e => setNickname(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAccount()} />
              <div className="text-[11px] text-sky-400/35 mt-1">This name will appear on your dashboard</div>
            </div>
            <div className="flex gap-2">
              <button onClick={addAccount} disabled={adding}
                className="font-vt text-base px-5 py-2 bg-sky-400 text-[#040d1a] cursor-pointer hover:bg-sky-300 disabled:opacity-50 transition-colors">
                {adding ? 'CREATING...' : 'CREATE ACCOUNT'}
              </button>
              <button onClick={() => { setShowAdd(false); setNickname('') }}
                className="font-vt text-base px-4 py-2 bg-transparent border border-sky-400/20 text-sky-400/50 hover:text-sky-400 hover:border-sky-400 cursor-pointer transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* SECTION HDR */}
        <div className="font-vt text-lg text-sky-400 tracking-[0.15em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/30 after:to-transparent"
          style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
          CONNECTED ACCOUNTS
        </div>

        {accounts.filter(a => a.is_active).length === 0 && (
          <div className="font-vt text-base text-sky-400/30 py-10 text-center border border-dashed border-sky-400/10">
            NO ACCOUNTS YET — ADD YOUR FIRST MT5 ACCOUNT
          </div>
        )}

        {accounts.filter(a => a.is_active).map(acc => (
          <div key={acc.id} className={`bg-[#071428] border border-sky-400/15 border-l-[3px] p-4 mb-2.5 ${acc.is_online ? 'border-l-sky-400' : 'border-l-red-400 opacity-70'}`}>
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <div className="font-vt text-[22px] text-white tracking-wide">{acc.nickname}</div>
                <div className="text-[11px] text-sky-400/40 mt-0.5 font-mono">
                  {acc.account_number ? `#${acc.account_number} · ` : ''}
                  {acc.broker_name || 'Not connected yet'} · Added {new Date(acc.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`font-vt text-[13px] px-2 py-0.5 border ${acc.is_online ? 'text-green-400 border-green-400/40' : 'text-red-400 border-red-400/40'}`}>
                {acc.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* API KEY */}
            <div className="bg-[#040d1a] border border-sky-400/15 px-3.5 py-2.5 mb-2.5">
              <div className="text-[10px] text-sky-400/40 tracking-widest mb-1.5">API KEY — ใช้ใน EA · ⚠ ห้ามแชร์</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`font-vt text-[15px] text-sky-400 flex-1 break-all tracking-wide transition-all ${showKey[acc.id] ? '' : 'blur-sm select-none cursor-pointer'}`}
                  onClick={() => !showKey[acc.id] && toggleKey(acc.id)}>
                  {acc.api_key}
                </div>
                <button onClick={() => toggleKey(acc.id)}
                  className={`font-vt text-xs px-2.5 py-1 border cursor-pointer transition-colors bg-transparent whitespace-nowrap ${showKey[acc.id] ? 'border-sky-400/30 text-sky-400/70 hover:border-sky-400 hover:text-sky-400' : 'border-yellow-400/40 text-yellow-400/80 hover:border-yellow-400 hover:text-yellow-400'}`}>
                  {showKey[acc.id] ? '🙈 HIDE' : '👁 SHOW'}
                </button>
                <button onClick={() => copyKey(acc.api_key, acc.id)}
                  className={`font-vt text-xs px-2.5 py-1 border cursor-pointer transition-colors bg-transparent whitespace-nowrap ${copiedId === acc.id ? 'border-green-400 text-green-400' : 'border-sky-400/30 text-sky-400/70 hover:border-sky-400 hover:text-sky-400'}`}>
                  {copiedId === acc.id ? '✓ COPIED' : '⎘ COPY'}
                </button>
              </div>
            </div>

            {/* INSTRUCTIONS */}
            {!acc.is_online && (
              <div className="bg-sky-400/4 border border-sky-400/12 border-l-[3px] border-l-sky-400/40 px-3.5 py-2.5 mb-2.5 text-[11px] text-sky-400/55 leading-loose">
                ⓘ วิธีเชื่อมต่อ MT5:<br />
                1. ดาวน์โหลด <code className="font-vt text-sm text-sky-400 bg-sky-400/8 px-1">MikeSentinel_v2_1.mq5</code> แล้ววางใน MT5 Experts folder<br />
                2. Attach EA บน Chart ใดก็ได้<br />
                3. ใส่ <code className="font-vt text-sm text-sky-400 bg-sky-400/8 px-1">API Key</code> ด้านบนใน EA Settings<br />
                4. เพิ่ม URL ใน MT5 → Tools → Options → Expert Advisors → Allow WebRequest<br />
                5. URL: <code className="font-vt text-sm text-sky-400 bg-sky-400/8 px-1">https://xrusjyxhnkqejutbafbo.supabase.co</code>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setConfirmDelete(acc.id)}
                className="font-vt text-xs px-2.5 py-1 bg-transparent border border-red-400/30 text-red-400/60 hover:border-red-400 hover:text-red-400 hover:bg-red-400/8 cursor-pointer transition-colors">
                🗑 REMOVE
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#071428] border border-red-400/40 border-t-2 border-t-red-400 p-6 max-w-sm w-full">
            <div className="font-vt text-2xl text-red-400 tracking-wide mb-2.5">⚠ REMOVE ACCOUNT</div>
            <div className="text-xs text-sky-400/60 mb-4 leading-relaxed">This will disconnect the MT5 account from SENTINEL. Historical data will be preserved.</div>
            <div className="flex gap-2">
              <button onClick={() => deleteAccount(confirmDelete)}
                className="flex-1 font-vt text-base py-2 bg-transparent border border-red-400/50 text-red-400 hover:bg-red-400/10 cursor-pointer transition-colors">✓ CONFIRM</button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 font-vt text-base py-2 bg-transparent border border-sky-400/30 text-sky-400 hover:bg-sky-400/8 cursor-pointer transition-colors">✕ CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
