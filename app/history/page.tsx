'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type DailyStat = {
  id: string; account_id: string; trade_date: string
  pl_usd: number; orders_count: number; currency: string
  nickname_snapshot: string
}
type Account = { id: string; nickname: string; currency: string }

export default function HistoryPage() {
  const [stats, setStats] = useState<DailyStat[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [dataLoading, setDataLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async()=>{
    if(!user) return
    const { data:accs } = await supabase.from('accounts').select('id,nickname,currency').eq('user_id',user.id).eq('is_active',true)
    if(accs) setAccounts(accs)
    const accIds = accs?.map(a=>a.id)||[]
    if(accIds.length===0){ setDataLoading(false); return }
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate()-parseInt(dateRange))
    const { data:daily } = await supabase.from('daily_stats').select('*').in('account_id',accIds).gte('trade_date',fromDate.toISOString().slice(0,10)).order('trade_date',{ascending:false})
    if(daily) setStats(daily)
    setDataLoading(false)
  },[user, dateRange])

  useEffect(()=>{
    if(!authLoading && !user){ router.push('/'); return }
    if(user) load()
  },[authLoading, user, load])

  const filtered = selectedAccount==='all' ? stats : stats.filter(s=>s.account_id===selectedAccount)
  const byDate = filtered.reduce((acc,s)=>{ const d=s.trade_date; if(!acc[d]) acc[d]=[]; acc[d].push(s); return acc },{} as Record<string,DailyStat[]>)
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a))
  const totalPL = filtered.reduce((s,d)=>s+(d.pl_usd||0),0)
  const totalTrades = filtered.reduce((s,d)=>s+(d.orders_count||0),0)
  const winDays = dates.filter(d=>byDate[d].reduce((s,x)=>s+(x.pl_usd||0),0)>0).length
  const lossDays = dates.filter(d=>byDate[d].reduce((s,x)=>s+(x.pl_usd||0),0)<0).length

  function fmt(n:number){ return (n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) }
  function fmtPL(n:number){ return ((n||0)>=0?'+':'')+fmt(n) }
  function plColor(n:number){ return (n||0)>0?'text-success':(n||0)<0?'text-danger':'text-accent/50' }
  function plHex(n:number){ return (n||0)>0?'#22c55e':(n||0)<0?'#f87171':'rgba(56,189,248,0.5)' }
  function fmtDate(d:string){ return new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}) }

  const gridBg = {backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}
  const selCls = "bg-bg-secondary border border-accent/25 text-accent font-vt text-base px-2.5 py-1.5 cursor-pointer outline-none"

  if(authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center font-vt text-3xl text-accent tracking-[0.2em]">LOADING HISTORY...</div>
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 pointer-events-none z-0" style={gridBg}/>

      <header className="bg-bg-secondary border-b border-accent/15 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center font-vt text-lg text-bg-primary"
            style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>S</div>
          <div className="font-vt text-xl text-accent tracking-[0.18em]">HISTORY</div>
          <button onClick={()=>router.push('/dashboard')}
            className="ml-auto font-vt text-base text-accent/60 border border-accent/20 px-3 py-1 hover:text-accent hover:border-accent transition-colors cursor-pointer bg-transparent">
            ← DASHBOARD
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 relative z-10">

        {/* PERFORMANCE SUMMARY */}
        <div className="font-vt text-lg text-accent tracking-[0.15em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-accent/30 after:to-transparent">
          PERFORMANCE SUMMARY
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {[
            { label:'TOTAL P/L', val:fmtPL(totalPL), color:plHex(totalPL), accent:totalPL>=0?'bg-success':'bg-danger' },
            { label:'TOTAL TRADES', val:String(totalTrades), color:'#38bdf8', accent:'bg-accent' },
            { label:'WIN DAYS', val:String(winDays), color:'#22c55e', accent:'bg-success' },
            { label:'LOSS DAYS', val:String(lossDays), color:'#f87171', accent:'bg-danger' },
          ].map((c,i)=>(
            <div key={i} className="bg-bg-secondary border border-accent/15 px-3.5 py-3 relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accent}`}/>
              <div className="text-[10px] text-accent/45 tracking-[0.1em] mb-1">{c.label}</div>
              <div className="font-vt text-2xl" style={{color:c.color}}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* CHART */}
        {dates.length > 0 && (
          <div className="bg-bg-secondary border border-accent/12 p-4 mb-4">
            <div className="font-vt text-sm text-accent tracking-wide mb-3">◆ DAILY P/L CHART</div>
            <div className="flex items-end gap-0.5 h-20">
              {[...dates].reverse().slice(-30).map(d=>{
                const dayPL = byDate[d].reduce((s,x)=>s+(x.pl_usd||0),0)
                const maxAbs = Math.max(...dates.map(dd=>Math.abs(byDate[dd].reduce((s,x)=>s+(x.pl_usd||0),0))),1)
                const pct = Math.abs(dayPL)/maxAbs*100
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-0.5" title={`${fmtDate(d)}: ${fmtPL(dayPL)}`}>
                    <div className="w-full min-h-[2px] transition-all opacity-80"
                      style={{height:pct+'%',background:dayPL>0?'#22c55e':dayPL<0?'#f87171':'rgba(56,189,248,0.2)'}}/>
                    <div className="text-[8px] text-accent/30 rotate-180" style={{writingMode:'vertical-rl'}}>{d.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <span className="text-[11px] text-accent/40 tracking-widest">ACCOUNT:</span>
          <select className={selCls} value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}>
            <option value="all">ALL ACCOUNTS</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.nickname}</option>)}
          </select>
          <span className="text-[11px] text-accent/40 tracking-widest">PERIOD:</span>
          <select className={selCls} value={dateRange} onChange={e=>setDateRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 1 year</option>
          </select>
        </div>

        {/* DAILY LIST */}
        <div className="font-vt text-lg text-accent tracking-[0.15em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-accent/30 after:to-transparent">
          DAILY BREAKDOWN
        </div>

        {dates.length===0 && (
          <div className="font-vt text-base text-accent/30 py-10 text-center border border-dashed border-accent/10">NO TRADE HISTORY FOUND</div>
        )}

        {dates.map(d=>{
          const dayStats = byDate[d]
          const dayPL = dayStats.reduce((s,x)=>s+(x.pl_usd||0),0)
          const dayTrades = dayStats.reduce((s,x)=>s+(x.orders_count||0),0)
          const borderColor = dayPL>0?'border-l-success':dayPL<0?'border-l-danger':'border-l-accent/30'
          return (
            <div key={d} className="mb-3">
              <div className={`flex items-center justify-between bg-bg-secondary border border-accent/12 border-l-[3px] ${borderColor} px-3.5 py-2 mb-1`}>
                <div>
                  <div className="font-vt text-lg text-text-primary tracking-wide">{fmtDate(d)}</div>
                  <div className="text-[11px] text-accent/40 mt-0.5">{dayTrades} trade{dayTrades!==1?'s':''} · {dayStats.length} account{dayStats.length!==1?'s':''}</div>
                </div>
                <div className={`font-vt text-xl ${plColor(dayPL)}`}>{fmtPL(dayPL)}</div>
              </div>
              {dayStats.length>1 && dayStats.map(s=>(
                <div key={s.id} className="flex items-center justify-between bg-bg-primary border border-accent/6 px-3.5 py-1.5 pl-5 mb-0.5">
                  <div>
                    <div className="text-xs text-accent/60 tracking-wide">{s.nickname_snapshot||accounts.find(a=>a.id===s.account_id)?.nickname||'Account'}</div>
                    <div className="text-[11px] text-accent/35">{s.orders_count} trade{s.orders_count!==1?'s':''}</div>
                  </div>
                  <div className={`font-vt text-base ${plColor(s.pl_usd||0)}`}>{fmtPL(s.pl_usd||0)}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
