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

type Profile = { id: string; max_slots: number; package_tier: string; status: string }

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

  const load = useCallback(async()=>{
    if(!user) return
    if(authProfile) setProfile(authProfile as any)
    const { data:accs } = await supabase.from('accounts').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
    if(accs) setAccounts(accs)
    setDataLoading(false)
  },[user, authProfile])

  useEffect(()=>{
    if(!authLoading && !user){ router.push('/'); return }
    if(!authLoading && user) load()
  },[authLoading, user, load])

  function showMsg(text:string,type='success'){
    setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:'success'}),3000)
  }
  async function addAccount(){
    if(!nickname.trim()){ showMsg('Please enter account name','error'); return }
    if(accounts.length>=(profile?.max_slots||1)){ showMsg('Slot limit reached','error'); return }
    setAdding(true)
    const { error } = await supabase.from('accounts').insert({ user_id: user!.id, nickname: nickname.trim() }).select().single()
    if(error){ showMsg('Error: '+error.message,'error'); setAdding(false); return }
    showMsg('✓ Account added!')
    setNickname(''); setShowAdd(false); setAdding(false); load()
  }
  async function deleteAccount(id:string){
    await supabase.from('accounts').update({is_active:false}).eq('id',id)
    showMsg('✓ Account removed'); setConfirmDelete(null); load()
  }
  function copyKey(key:string, id:string){
    navigator.clipboard.writeText(key)
    setCopiedId(id); setTimeout(()=>setCopiedId(null),2000)
  }
  function toggleKey(id:string){ setShowKey(prev=>({...prev,[id]:!prev[id]})) }

  const slotsUsed = accounts.filter(a=>a.is_active).length
  const slotsMax = profile?.max_slots||1
  const slotPct = Math.min(100,slotsUsed/slotsMax*100)

  function tierColor(t:string){ return t==='elite'?'text-red-400':t==='pro'?'text-purple-400':t==='basic'?'text-sky-400':'text-sky-400/40' }
  function tierBorder(t:string){ return t==='elite'?'border-red-400/55':t==='pro'?'border-purple-400/55':t==='basic'?'border-sky-400/55':'border-sky-400/20' }

  const gridBg = {backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}
  const clipBtn = {clipPath:'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))'}

  if(authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center font-vt text-3xl text-accent tracking-[0.2em]">LOADING...</div>
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 pointer-events-none z-0" style={gridBg}/>

      {/* HEADER */}
      <header className="bg-bg-secondary border-b border-accent/15 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center font-vt text-lg text-bg-primary flex-shrink-0"
            style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>S</div>
          <div className="font-vt text-xl text-accent tracking-[0.18em]">MY ACCOUNTS</div>
          <button onClick={()=>router.push('/dashboard')}
            className="ml-auto font-vt text-base text-accent/60 border border-accent/20 px-3 py-1 hover:text-accent hover:border-accent transition-colors cursor-pointer bg-transparent">
            ← DASHBOARD
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 relative z-10">

        {/* MSG */}
        {msg.text && (
          <div className={`font-vt text-lg px-4 py-2 mb-3 tracking-wide ${msg.type==='success'?'bg-success/10 border border-success/30 text-success':'bg-danger/10 border border-danger/30 text-danger'}`}>
            {msg.text}
          </div>
        )}

        {/* SLOT BAR */}
        <div className="bg-bg-secondary border border-accent/15 p-4 mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <div className="font-vt text-lg text-text-primary tracking-wide mb-1.5">ACCOUNT SLOTS — {slotsUsed}/{slotsMax} USED</div>
            <div className="h-1.5 bg-bg-card overflow-hidden">
              <div className={`h-full transition-all ${slotsUsed>=slotsMax?'bg-danger':'bg-accent'}`} style={{width:`${slotPct}%`}}/>
            </div>
            <div className="text-[11px] text-text-muted mt-1">{slotsMax-slotsUsed} slot{slotsMax-slotsUsed!==1?'s':''} remaining · {profile?.package_tier?.toUpperCase()} PLAN</div>
          </div>
          <span className={`font-vt text-sm px-3 py-1 border ${tierColor(profile?.package_tier||'free')} ${tierBorder(profile?.package_tier||'free')}`}>
            {profile?.package_tier?.toUpperCase()}
          </span>
          <button disabled={slotsUsed>=slotsMax||showAdd} onClick={()=>setShowAdd(true)}
            className="font-vt text-base px-4 py-2 bg-accent text-bg-primary cursor-pointer hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={clipBtn}>
            + ADD ACCOUNT
          </button>
        </div>

        {/* ADD FORM */}
        {showAdd && (
          <div className="bg-bg-secondary border border-accent/20 border-t-2 border-t-accent p-4 mb-4">
            <div className="font-vt text-lg text-accent tracking-wide mb-3">NEW MT5 ACCOUNT</div>
            <div className="mb-3">
              <label className="block text-[11px] text-accent/60 tracking-widest mb-1">ACCOUNT NAME / NICKNAME <span className="text-danger">*</span></label>
              <input className="w-full bg-bg-primary border border-accent/20 text-text-primary font-mono text-sm px-3 py-2 outline-none focus:border-accent transition-colors placeholder:text-text-muted/40"
                type="text" placeholder="e.g. HoldBro, Prop Firm A" value={nickname}
                onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAccount()}/>
              <div className="text-[11px] text-accent/35 mt-1">This name will appear on your dashboard</div>
            </div>
            <div className="flex gap-2">
              <button onClick={addAccount} disabled={adding}
                className="font-vt text-base px-5 py-2 bg-accent text-bg-primary cursor-pointer hover:bg-sky-300 disabled:opacity-50 transition-colors">
                {adding?'CREATING...':'CREATE ACCOUNT'}
              </button>
              <button onClick={()=>{setShowAdd(false);setNickname('')}}
                className="font-vt text-base px-4 py-2 bg-transparent border border-accent/20 text-accent/50 hover:text-accent hover:border-accent cursor-pointer transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* SECTION HDR */}
        <div className="font-vt text-lg text-accent tracking-[0.15em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-accent/30 after:to-transparent">
          CONNECTED ACCOUNTS
        </div>

        {accounts.filter(a=>a.is_active).length===0 && (
          <div className="font-vt text-base text-accent/30 py-10 text-center border border-dashed border-accent/10">
            NO ACCOUNTS YET — ADD YOUR FIRST MT5 ACCOUNT
          </div>
        )}

        {accounts.filter(a=>a.is_active).map(acc=>(
          <div key={acc.id} className={`bg-bg-secondary border border-accent/15 border-l-[3px] p-4 mb-2.5 ${acc.is_online?'border-l-accent':'border-l-danger opacity-70'}`}>
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <div className="font-vt text-[22px] text-text-primary tracking-wide">{acc.nickname}</div>
                <div className="text-[11px] text-accent/40 mt-0.5">
                  {acc.account_number?`#${acc.account_number} · `:''}
                  {acc.broker_name||'Not connected yet'} · Added {new Date(acc.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`font-vt text-[13px] px-2 py-0.5 border ${acc.is_online?'text-success border-success/40':'text-danger border-danger/40'}`}>
                {acc.is_online?'ONLINE':'OFFLINE'}
              </span>
            </div>

            {/* API KEY */}
            <div className="bg-bg-primary border border-accent/15 px-3.5 py-2.5 mb-2.5">
              <div className="text-[10px] text-accent/40 tracking-widest mb-1.5">API KEY — ใช้ใน EA · ⚠ ห้ามแชร์</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`font-vt text-[15px] text-accent flex-1 break-all tracking-wide transition-all ${showKey[acc.id]?'':'blur-sm select-none cursor-pointer'}`}
                  onClick={()=>!showKey[acc.id]&&toggleKey(acc.id)}>
                  {acc.api_key}
                </div>
                <button onClick={()=>toggleKey(acc.id)}
                  className={`font-vt text-xs px-2.5 py-1 border cursor-pointer transition-colors bg-transparent whitespace-nowrap ${showKey[acc.id]?'border-accent/30 text-accent/70 hover:border-accent hover:text-accent':'border-yellow-400/40 text-yellow-400/80 hover:border-yellow-400 hover:text-yellow-400'}`}>
                  {showKey[acc.id]?'🙈 HIDE':'👁 SHOW'}
                </button>
                <button onClick={()=>copyKey(acc.api_key,acc.id)}
                  className={`font-vt text-xs px-2.5 py-1 border cursor-pointer transition-colors bg-transparent whitespace-nowrap ${copiedId===acc.id?'border-success text-success':'border-accent/30 text-accent/70 hover:border-accent hover:text-accent'}`}>
                  {copiedId===acc.id?'✓ COPIED':'⎘ COPY'}
                </button>
              </div>
            </div>

            {/* INSTRUCTIONS */}
            {!acc.is_online && (
              <div className="bg-accent/4 border border-accent/12 border-l-[3px] border-l-accent/40 px-3.5 py-2.5 mb-2.5 text-[11px] text-accent/55 leading-loose">
                ⓘ วิธีเชื่อมต่อ MT5:<br/>
                1. ดาวน์โหลด <code className="font-vt text-sm text-accent bg-accent/8 px-1">MikeSentinel_v2_1.mq5</code> แล้ววางใน MT5 Experts folder<br/>
                2. Attach EA บน Chart ใดก็ได้<br/>
                3. ใส่ <code className="font-vt text-sm text-accent bg-accent/8 px-1">API Key</code> ด้านบนใน EA Settings<br/>
                4. เพิ่ม URL ใน MT5 → Tools → Options → Expert Advisors → Allow WebRequest<br/>
                5. URL: <code className="font-vt text-sm text-accent bg-accent/8 px-1">https://xrusjyxhnkqejutbafbo.supabase.co</code>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={()=>setConfirmDelete(acc.id)}
                className="font-vt text-xs px-2.5 py-1 bg-transparent border border-danger/30 text-danger/60 hover:border-danger hover:text-danger hover:bg-danger/8 cursor-pointer transition-colors">
                🗑 REMOVE
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-danger/40 border-t-2 border-t-danger p-6 max-w-sm w-full">
            <div className="font-vt text-2xl text-danger tracking-wide mb-2.5">⚠ REMOVE ACCOUNT</div>
            <div className="text-xs text-accent/60 mb-4 leading-relaxed">This will disconnect the MT5 account from SENTINEL. Historical data will be preserved.</div>
            <div className="flex gap-2">
              <button onClick={()=>deleteAccount(confirmDelete)}
                className="flex-1 font-vt text-base py-2 bg-transparent border border-danger/50 text-danger hover:bg-danger/10 cursor-pointer transition-colors">✓ CONFIRM</button>
              <button onClick={()=>setConfirmDelete(null)}
                className="flex-1 font-vt text-base py-2 bg-transparent border border-accent/30 text-accent hover:bg-accent/8 cursor-pointer transition-colors">✕ CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
