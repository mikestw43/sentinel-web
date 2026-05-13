'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Profile = {
  id: string; username: string; full_name: string; role: string
  status: string; package_tier: string; max_slots: number
  created_at: string; approved_at: string; email: string; phone: string
}
type AccountInfo = {
  id: string; nickname: string; is_online: boolean; is_active: boolean
  account_number: string; broker_name: string; currency: string
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [msg, setMsg] = useState({text:'',type:'success'})
  const [selectedUser, setSelectedUser] = useState<Profile|null>(null)
  const [userAccounts, setUserAccounts] = useState<AccountInfo[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const ADMIN_URL = 'https://xrusjyxhnkqejutbafbo.supabase.co/functions/v1/admin-actions'

  const load = useCallback(async () => {
    if(!user) return
    const { data:all } = await supabase.from('profiles').select('*').order('created_at',{ascending:false})
    if(all) setProfiles(all)
    setDataLoading(false)
  },[user])

  useEffect(()=>{
    if(!authLoading && !user){ router.push('/'); return }
    if(!authLoading && profile?.role !== 'admin'){ router.push('/dashboard'); return }
    if(user) load()
  },[authLoading, user, profile, load])

  function showMsg(text:string, type='success'){ setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:'success'}),3000) }

  async function callAdmin(body:object){
    const { data:{ session } } = await supabase.auth.getSession()
    const res = await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session?.access_token},body:JSON.stringify(body)})
    return res.json()
  }
  async function approve(id:string){ await supabase.from('profiles').update({status:'approved',approved_at:new Date().toISOString()}).eq('id',id); showMsg('✓ User approved!'); load() }
  async function reject(id:string){ await supabase.from('profiles').update({status:'rejected'}).eq('id',id); showMsg('✓ User rejected'); load() }
  async function setPackage(id:string, tier:string){
    const slots = tier==='free'?1:tier==='basic'?3:tier==='pro'?10:99
    await supabase.from('profiles').update({package_tier:tier,max_slots:slots}).eq('id',id)
    showMsg('✓ Package updated!'); load()
    if(selectedUser?.id===id) setSelectedUser(p=>p?{...p,package_tier:tier,max_slots:slots}:p)
  }
  async function setRole(id:string, role:string){ await supabase.from('profiles').update({role}).eq('id',id); showMsg('✓ Role updated!'); load() }
  async function resetPassword(email:string){
    const res = await callAdmin({action:'reset_password',email})
    if(res.success) showMsg('✓ Reset email sent to '+email); else showMsg('✗ '+res.error,'error')
  }
  async function deleteUser(id:string){
    const res = await callAdmin({action:'delete_user',user_id:id})
    if(res.success){ showMsg('✓ User deleted'); setConfirmDelete(null); setSelectedUser(null); load() }
    else showMsg('✗ '+res.error,'error')
  }
  async function openDetail(p:Profile){
    const { data:{ session } } = await supabase.auth.getSession()
    let email = '—'
    try { const res = await fetch(ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session?.access_token},body:JSON.stringify({action:'get_user_email',user_id:p.id})}); const data = await res.json(); if(data.email) email=data.email } catch {}
    setSelectedUser({...p,email})
    const { data } = await supabase.from('accounts').select('*').eq('user_id',p.id)
    setUserAccounts(data||[])
  }

  const pending = profiles.filter(p=>p.status==='pending')
  const approved = profiles.filter(p=>p.status==='approved')
  const listToShow = activeTab==='pending'?pending:activeTab==='approved'?approved:profiles

  function statusColor(s:string){ return s==='approved'?'text-success border-success/55':s==='rejected'?'text-danger border-danger/55':'text-warning border-warning/55' }
  function statusHex(s:string){ return s==='approved'?'#22c55e':s==='rejected'?'#f87171':'#fbbf24' }
  function tierColor(t:string){ return t==='elite'?'#f87171':t==='pro'?'#a78bfa':t==='basic'?'#38bdf8':'rgba(56,189,248,0.4)' }

  const gridBg = {backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}
  const selCls = "bg-bg-primary border border-accent/25 text-accent font-vt text-sm px-1.5 py-0.5 cursor-pointer outline-none"
  const roleCls = "bg-bg-primary border border-warning/25 text-warning font-vt text-sm px-1.5 py-0.5 cursor-pointer outline-none"

  if(authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center font-vt text-3xl text-accent tracking-[0.2em]">LOADING ADMIN...</div>
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 pointer-events-none z-0" style={gridBg}/>

      <header className="bg-bg-secondary border-b border-accent/15 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center font-vt text-lg text-bg-primary"
            style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>S</div>
          <div className="font-vt text-xl text-accent tracking-[0.18em]">SENTINEL</div>
          <span className="text-[10px] px-2 py-0.5 bg-warning/15 border border-warning/40 text-warning tracking-widest">ADMIN PANEL</span>
          <button onClick={()=>router.push('/dashboard')}
            className="ml-auto font-vt text-base text-accent/60 border border-accent/20 px-3 py-1 hover:text-accent hover:border-accent transition-colors cursor-pointer bg-transparent">
            ← DASHBOARD
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 relative z-10">
        {msg.text && <div className={`font-vt text-lg px-4 py-2 mb-3 tracking-wide ${msg.type==='success'?'bg-success/10 border border-success/30 text-success':'bg-danger/10 border border-danger/30 text-danger'}`}>{msg.text}</div>}

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {[
            {label:'PENDING',val:pending.length,color:'#fbbf24',accent:'bg-warning'},
            {label:'APPROVED',val:approved.length,color:'#22c55e',accent:'bg-success'},
            {label:'TOTAL USERS',val:profiles.length,color:'#38bdf8',accent:'bg-accent'},
            {label:'ADMINS',val:profiles.filter(p=>p.role==='admin').length,color:'#fbbf24',accent:'bg-warning'},
          ].map((c,i)=>(
            <div key={i} className="bg-bg-secondary border border-accent/15 px-3.5 py-3 relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accent}`}/>
              <div className="text-[10px] text-accent/45 tracking-widest mb-1">{c.label}</div>
              <div className="font-vt text-3xl" style={{color:c.color}}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex border-b border-accent/15 mb-3.5">
          {[{id:'pending',label:'PENDING'},{id:'approved',label:'APPROVED'},{id:'all',label:'ALL USERS'}].map(t=>(
            <button key={t.id}
              className={`font-vt text-lg px-4 py-2 border-b-2 cursor-pointer transition-all bg-transparent tracking-wide whitespace-nowrap ${activeTab===t.id?'text-accent border-accent':'text-accent/45 border-transparent hover:text-accent'}`}
              onClick={()=>setActiveTab(t.id)}>
              {t.label}
              {t.id==='pending'&&pending.length>0&&<span className="ml-1.5 text-xs bg-danger/20 text-danger rounded-full px-1.5 py-0.5">{pending.length}</span>}
            </button>
          ))}
        </div>

        <div className="font-vt text-lg text-accent tracking-[0.15em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-accent/30 after:to-transparent">
          {activeTab==='pending'?'PENDING APPROVAL':activeTab==='approved'?'APPROVED USERS':'ALL USERS'}
        </div>

        {listToShow.length===0 && <div className="font-vt text-base text-accent/30 py-8 text-center border border-accent/8">NO USERS IN THIS LIST</div>}

        {listToShow.map(p=>(
          <div key={p.id} className="bg-bg-secondary border border-accent/12 border-l-[3px] px-4 py-3 mb-1.5 flex flex-wrap items-center gap-2.5 cursor-pointer hover:border-accent/30 transition-all"
            style={{borderLeftColor:statusHex(p.status)}} onClick={()=>openDetail(p)}>
            <div className="flex-1 min-w-[150px]">
              <div className="font-vt text-xl text-text-primary tracking-wide">{p.username?.toUpperCase()}</div>
              <div className="text-[10px] text-accent/40 mt-0.5">{p.full_name||'—'} · {new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {[
                {val:p.status?.toUpperCase(), color:statusHex(p.status)},
                {val:p.package_tier?.toUpperCase(), color:tierColor(p.package_tier)},
                {val:`${p.max_slots} SLOTS`, color:'rgba(56,189,248,0.6)'},
                ...(p.role==='admin'?[{val:'ADMIN',color:'#fbbf24'}]:[]),
              ].map((b,i)=>(
                <span key={i} className="font-vt text-[11px] px-1.5 py-0.5 border" style={{color:b.color,borderColor:b.color+'55'}}>{b.val}</span>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap items-center" onClick={e=>e.stopPropagation()}>
              {p.status==='pending'&&<>
                <button className="font-vt text-xs px-2.5 py-1 border border-success/40 text-success hover:bg-success/10 cursor-pointer transition-colors bg-transparent" onClick={()=>approve(p.id)}>✓ APPROVE</button>
                <button className="font-vt text-xs px-2.5 py-1 border border-danger/40 text-danger hover:bg-danger/10 cursor-pointer transition-colors bg-transparent" onClick={()=>reject(p.id)}>✕ REJECT</button>
              </>}
              <select className={selCls} value={p.package_tier} onChange={e=>setPackage(p.id,e.target.value)}>
                <option value="free">FREE</option><option value="basic">BASIC</option><option value="pro">PRO</option><option value="elite">ELITE</option>
              </select>
              <select className={roleCls} value={p.role} onChange={e=>setRole(p.id,e.target.value)}>
                <option value="user">USER</option><option value="admin">ADMIN</option>
              </select>
              <button className="font-vt text-xs px-2.5 py-1 border border-accent/30 text-accent hover:bg-accent/8 cursor-pointer transition-colors bg-transparent" onClick={(e)=>{e.stopPropagation();openDetail(p)}}>DETAIL</button>
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL PANEL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setSelectedUser(null)}>
          <div className="bg-bg-secondary border border-accent/30 border-t-2 border-t-accent w-full max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-vt text-2xl text-accent tracking-wide">{selectedUser.username?.toUpperCase()}</div>
              <button onClick={()=>setSelectedUser(null)} className="font-vt text-lg text-accent/50 border border-accent/20 px-2.5 py-0.5 hover:text-danger hover:border-danger cursor-pointer bg-transparent transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              {[
                {label:'USERNAME', val:selectedUser.username||'—', color:'#38bdf8', full:false},
                {label:'ROLE', val:selectedUser.role?.toUpperCase(), color:selectedUser.role==='admin'?'#fbbf24':'#38bdf8', full:false},
                {label:'FULL NAME', val:selectedUser.full_name||'—', color:'', full:true},
                {label:'EMAIL', val:selectedUser.email||'—', color:'', full:true, small:true},
                {label:'PHONE', val:selectedUser.phone||'—', color:'', full:true, small:true},
                {label:'STATUS', val:selectedUser.status?.toUpperCase(), color:statusHex(selectedUser.status), full:false},
                {label:'PACKAGE', val:selectedUser.package_tier?.toUpperCase(), color:tierColor(selectedUser.package_tier), full:false},
                {label:'MAX SLOTS', val:String(selectedUser.max_slots), color:'', full:false},
                {label:'ACCOUNTS', val:String(userAccounts.length), color:'', full:false},
                {label:'REGISTERED', val:new Date(selectedUser.created_at).toLocaleDateString(), color:'', full:false, small:true},
                {label:'APPROVED', val:selectedUser.approved_at?new Date(selectedUser.approved_at).toLocaleDateString():'—', color:'', full:false, small:true},
              ].map((f,i)=>(
                <div key={i} className={`bg-bg-primary px-2.5 py-2 ${f.full?'col-span-2':''}`}>
                  <div className="text-[10px] text-accent/40 tracking-widest mb-0.5">{f.label}</div>
                  <div className={`font-vt ${f.small?'text-base':'text-lg'}`} style={{color:f.color||'#e2e8f0'}}>{f.val}</div>
                </div>
              ))}
            </div>

            {userAccounts.length>0&&<>
              <div className="font-vt text-sm text-accent tracking-wide mb-2">◆ MT5 ACCOUNTS</div>
              {userAccounts.map(acc=>(
                <div key={acc.id} className="bg-bg-primary border border-accent/10 border-l-[3px] px-3 py-2 mb-1.5 flex items-center justify-between"
                  style={{borderLeftColor:acc.is_online?'#22c55e':'#f87171'}}>
                  <div>
                    <div className="font-vt text-lg text-text-primary">{acc.nickname}</div>
                    <div className="text-[10px] text-accent/40">#{acc.account_number||'—'} · {acc.broker_name||'—'} · {acc.currency||'USD'}</div>
                  </div>
                  <span className="font-vt text-xs border px-1.5 py-0.5" style={{color:acc.is_online?'#22c55e':'#f87171',borderColor:acc.is_online?'rgba(34,197,94,0.35)':'rgba(248,113,113,0.35)'}}>
                    {acc.is_online?'ONLINE':'OFFLINE'}
                  </span>
                </div>
              ))}
            </>}
            {userAccounts.length===0&&<div className="font-vt text-sm text-accent/30 py-3 text-center border border-accent/8">NO ACCOUNTS CONNECTED</div>}

            <div className="flex gap-2 flex-wrap mt-3.5 pt-3.5 border-t border-accent/10">
              <select className={selCls+' text-sm px-2 py-1.5'} value={selectedUser.package_tier} onChange={e=>setPackage(selectedUser.id,e.target.value)}>
                <option value="free">FREE</option><option value="basic">BASIC</option><option value="pro">PRO</option><option value="elite">ELITE</option>
              </select>
              <button className="font-vt text-sm px-3 py-1.5 border border-warning/40 text-warning hover:bg-warning/8 cursor-pointer transition-colors bg-transparent"
                onClick={()=>{ const email=selectedUser.email||prompt('Enter user email:')||''; if(email) resetPassword(email) }}>📧 RESET PASSWORD</button>
              <button className="font-vt text-sm px-3 py-1.5 border border-danger/30 text-danger hover:bg-danger/8 cursor-pointer transition-colors bg-transparent"
                onClick={()=>setConfirmDelete(selectedUser.id)}>🗑 DELETE USER</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-danger/40 border-t-2 border-t-danger p-6 max-w-sm w-full">
            <div className="font-vt text-2xl text-danger tracking-wide mb-2.5">⚠ DELETE USER</div>
            <div className="text-xs text-accent/60 mb-4 leading-relaxed">This will permanently delete the user and all their data. This action cannot be undone.</div>
            <div className="flex gap-2">
              <button onClick={()=>deleteUser(confirmDelete)} className="flex-1 font-vt text-base py-2 bg-transparent border border-danger/50 text-danger hover:bg-danger/10 cursor-pointer transition-colors">✓ CONFIRM DELETE</button>
              <button onClick={()=>setConfirmDelete(null)} className="flex-1 font-vt text-base py-2 bg-transparent border border-accent/30 text-accent hover:bg-accent/8 cursor-pointer transition-colors">✕ CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
