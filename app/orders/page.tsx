'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Order = {
  id: string; account_id: string; updated_at: string
  ticket: number; symbol: string; order_type: string
  lots: number; open_price: number; current_price: number
  stop_loss: number; take_profit: number; swap: number; commission: number
}
type Account = { id: string; nickname: string; currency: string }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('time')
  const [dataLoading, setDataLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    if(!user) return
    const { data:accs } = await supabase.from('accounts').select('id,nickname,currency').eq('user_id',user.id).eq('is_active',true)
    if(accs) setAccounts(accs)
    const accIds = accs?.map(a=>a.id)||[]
    if(accIds.length===0){ setDataLoading(false); return }
    const { data:ords } = await supabase.from('orders').select('*').in('account_id',accIds)
    if(ords) setOrders(ords)
    setDataLoading(false)
  },[user])

  useEffect(()=>{
    if(!authLoading && !user){ router.push('/'); return }
    if(user){ load(); const i=setInterval(load,5000); return ()=>clearInterval(i) }
  },[authLoading, user, load])

  function fmt(n:number,d=2){ return (n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}) }
  function calcProfit(o:Order){ return ((o.current_price||0)-(o.open_price||0))*(o.order_type==='sell'?-1:1)*(o.lots||0)*100 }
  function plColor(n:number){ return n>=0?'text-success':'text-danger' }
  function plHex(n:number){ return n>=0?'#22c55e':'#f87171' }
  function timeSince(d:string){ const s=Math.floor((Date.now()-new Date(d).getTime())/1000); return s<60?s+'s':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':Math.floor(s/86400)+'d' }

  let filtered = orders
  if(selectedAccount!=='all') filtered = filtered.filter(o=>o.account_id===selectedAccount)
  if(filterType!=='all') filtered = filtered.filter(o=>o.order_type===filterType)
  filtered = [...filtered].sort((a,b)=>{
    if(sortBy==='symbol') return a.symbol.localeCompare(b.symbol)
    if(sortBy==='profit') return calcProfit(b)-calcProfit(a)
    if(sortBy==='lots') return (b.lots||0)-(a.lots||0)
    return new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()
  })

  const totalProfit = filtered.reduce((s,o)=>s+calcProfit(o),0)
  const totalLots = filtered.reduce((s,o)=>s+(o.lots||0),0)
  const buyCount = filtered.filter(o=>o.order_type==='buy').length
  const sellCount = filtered.filter(o=>o.order_type==='sell').length
  const gridBg = {backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}
  const selCls = "bg-bg-secondary border border-accent/25 text-accent font-vt text-base px-2.5 py-1.5 cursor-pointer outline-none"

  if(authLoading||dataLoading) return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center font-vt text-3xl text-accent tracking-[0.2em]">LOADING ORDERS...</div>
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 pointer-events-none z-0" style={gridBg}/>
      <header className="bg-bg-secondary border-b border-accent/15 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center font-vt text-lg text-bg-primary flex-shrink-0"
            style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>S</div>
          <div className="font-vt text-xl text-accent tracking-[0.18em]">OPEN ORDERS</div>
          <div className="ml-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"/>
            <span className="text-[11px] text-success tracking-widest">LIVE</span>
          </div>
          <button onClick={()=>router.push('/dashboard')}
            className="ml-auto font-vt text-base text-accent/60 border border-accent/20 px-3 py-1 hover:text-accent hover:border-accent transition-colors cursor-pointer bg-transparent">
            ← DASHBOARD
          </button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-4 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {[
            {label:'OPEN ORDERS',val:String(filtered.length),color:'#38bdf8',accent:'bg-accent'},
            {label:'TOTAL PROFIT',val:(totalProfit>=0?'+':'')+fmt(totalProfit),color:plHex(totalProfit),accent:totalProfit>=0?'bg-success':'bg-danger'},
            {label:'TOTAL LOTS',val:fmt(totalLots),color:'#38bdf8',accent:'bg-accent'},
            {label:'BUY / SELL',val:`${buyCount} / ${sellCount}`,color:'#e2e8f0',accent:'bg-accent'},
          ].map((c,i)=>(
            <div key={i} className="bg-bg-secondary border border-accent/15 px-3.5 py-3 relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accent}`}/>
              <div className="text-[10px] text-accent/45 tracking-widest mb-1">{c.label}</div>
              <div className="font-vt text-2xl" style={{color:c.color}}>{c.val}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <span className="text-[11px] text-accent/40 tracking-widest">ACCOUNT:</span>
          <select className={selCls} value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}>
            <option value="all">ALL ACCOUNTS</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.nickname}</option>)}
          </select>
          <span className="text-[11px] text-accent/40 tracking-widest">TYPE:</span>
          <select className={selCls} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="all">ALL</option>
            <option value="buy">BUY</option>
            <option value="sell">SELL</option>
          </select>
          <span className="text-[11px] text-accent/40 tracking-widest">SORT:</span>
          <select className={selCls} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="time">TIME</option>
            <option value="symbol">SYMBOL</option>
            <option value="profit">PROFIT</option>
            <option value="lots">LOTS</option>
          </select>
          <button onClick={load} className="ml-auto font-vt text-sm px-3 py-1.5 border border-accent/30 text-accent/60 hover:text-accent hover:border-accent cursor-pointer transition-colors bg-transparent">↺ REFRESH</button>
        </div>
        <div className="hidden md:grid grid-cols-[80px_100px_60px_90px_90px_90px_90px_80px_70px] gap-2 bg-accent/5 border-b border-accent/15 font-vt text-sm tracking-wide text-accent/50 px-3 py-2 mb-1">
          <span>TICKET</span><span>SYMBOL</span><span>TYPE</span><span>LOTS</span><span>OPEN</span><span>CURRENT</span><span>PROFIT</span><span>SL / TP</span><span>AGE</span>
        </div>
        {filtered.length===0 && <div className="font-vt text-base text-accent/30 py-16 text-center border border-dashed border-accent/10">NO OPEN ORDERS</div>}
        {filtered.map(o=>{
          const profit=calcProfit(o); const isBuy=o.order_type==='buy'
          const acc=accounts.find(a=>a.id===o.account_id)
          return (
            <div key={o.id} className={`grid grid-cols-2 md:grid-cols-[80px_100px_60px_90px_90px_90px_90px_80px_70px] gap-2 items-center bg-bg-secondary border border-accent/10 border-l-[3px] px-3 py-2.5 mb-1 hover:border-accent/25 transition-all ${isBuy?'border-l-success':'border-l-danger'}`}>
              <div><div className="font-vt text-base text-text-primary">#{o.ticket}</div><div className="text-[10px] text-accent/40">{acc?.nickname||'—'}</div></div>
              <div className="font-vt text-lg text-accent tracking-wide">{o.symbol}</div>
              <div className={`font-vt text-sm px-2 py-0.5 border text-center ${isBuy?'text-success border-success/40':'text-danger border-danger/40'}`}>{o.order_type?.toUpperCase()}</div>
              <div className="font-vt text-base text-text-primary">{fmt(o.lots,2)}</div>
              <div className="font-vt text-base text-text-primary">{fmt(o.open_price,2)}</div>
              <div className="font-vt text-base text-accent">{fmt(o.current_price,2)}</div>
              <div className={`font-vt text-base ${plColor(profit)}`}>{profit>=0?'+':''}{fmt(profit)}</div>
              <div className="text-[11px]"><span className="text-danger">{o.stop_loss?fmt(o.stop_loss,2):'—'}</span><span className="text-accent/30"> / </span><span className="text-success">{o.take_profit?fmt(o.take_profit,2):'—'}</span></div>
              <div className="text-[11px] text-accent/40 font-mono">{timeSince(o.updated_at)}</div>
            </div>
          )
        })}
        {filtered.length>0&&<div className="flex justify-between items-center mt-3 px-3 py-2 bg-bg-secondary border border-accent/10 font-vt text-sm">
          <span className="text-accent/50">{filtered.length} ORDERS · {fmt(totalLots)} LOTS</span>
          <span className={`text-base ${plColor(totalProfit)}`}>TOTAL: {totalProfit>=0?'+':''}{fmt(totalProfit)}</span>
        </div>}
      </div>
    </div>
  )
}