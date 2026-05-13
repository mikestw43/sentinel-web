'use client'
import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type Account = {
  id: string; nickname: string; broker_name: string; account_number: string
  is_online: boolean; last_seen: string; balance: number; equity: number
  floating_pl: number; today_pl: number; open_orders: number; margin_level: number
  drawdown_pct: number; buy_lots: number; sell_lots: number; total_lots: number
  margin: number; currency: string; pending_orders: number
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'card'|'compact'>('card')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('portfolio')
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const fetchAccounts = useCallback(async () => {
    if (!user) return []
    const { data: accs } = await supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true)
    if (!accs) return []
    const withSnap = await Promise.all(accs.map(async acc => {
      const { data: snap } = await supabase.from('snapshots').select('*').eq('account_id', acc.id).order('captured_at', { ascending: false }).limit(1).single()
      return { ...acc, ...(snap || {}) }
    }))
    return withSnap
  }, [user])

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: fetchAccounts,
    enabled: !!user,
    staleTime: 4000,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (!authLoading && !user) { router.push('/'); return }
    if (!authLoading && profile?.status !== 'approved') { router.push('/'); return }
  }, [authLoading, user, profile])

  useEffect(() => {
    if (accountsData) setAccounts(accountsData)
  }, [accountsData])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snapshots' }, () => {
        queryClient.invalidateQueries({ queryKey: ['accounts', user.id] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['accounts', user.id] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const filtered = accounts.filter(a => {
    if (filter === 'online') return a.is_online
    if (filter === 'offline') return !a.is_online
    if (filter === 'profit') return (a.today_pl || 0) > 0
    if (filter === 'loss') return (a.today_pl || 0) < 0
    return true
  })

  const totalBalance  = accounts.reduce((s,a) => s + (a.balance||0), 0)
  const totalEquity   = accounts.reduce((s,a) => s + (a.equity||0), 0)
  const totalFloating = accounts.reduce((s,a) => s + (a.floating_pl||0), 0)
  const totalBuyLots  = accounts.reduce((s,a) => s + (a.buy_lots||0), 0)
  const totalSellLots = accounts.reduce((s,a) => s + (a.sell_lots||0), 0)
  const totalPending  = accounts.reduce((s,a) => s + (a.pending_orders||0), 0)
  const onlineCount   = accounts.filter(a => a.is_online).length

  function fmt(n:number, d=2) { return (n||0).toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d}) }
  function fmtPL(n:number) { return ((n||0) >= 0 ? '+' : '') + fmt(n||0) }
  function plColor(n:number) { return (n||0) >= 0 ? 'text-green-400' : 'text-red-400' }
  function plHex(n:number) { return (n||0) >= 0 ? '#4ade80' : '#f87171' }
  function ddColor(dd:number) { return dd >= 30 ? '#f87171' : dd >= 10 ? '#fbbf24' : '#4ade80' }
  function isOffline(a:Account) {
    if (!a.last_seen) return true
    return Date.now() - new Date(a.last_seen).getTime() > 10*60*1000
  }
  function handleNavClick(id:string) {
    if (id === 'performance') router.push('/history')
    else setActiveTab(id)
  }

  if (authLoading) return (
    <div className="fixed inset-0 bg-[#040d1a] flex items-center justify-center font-vt text-3xl text-sky-400 tracking-[0.2em]">
      LOADING SENTINEL...
    </div>
  )

  const navTabs = [
    {id:'portfolio', label:'PORTFOLIO'},
    {id:'health', label:'ACCOUNT HEALTH'},
    {id:'calendar', label:'CALENDAR'},
    {id:'performance', label:'PERFORMANCE'},
  ]
  const mobTabs = [
    {id:'portfolio', icon:'⊞', label:'PORTFOLIO'},
    {id:'health', icon:'♥', label:'HEALTH'},
    {id:'calendar', icon:'📅', label:'CALENDAR'},
    {id:'performance', icon:'📊', label:'PERF'},
  ]

  return (
    <div className="bg-[#040d1a] min-h-screen pb-16 md:pb-0" onClick={() => menuOpen && setMenuOpen(false)}>
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{backgroundImage:'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>

      {/* HEADER */}
      <header className="bg-[#071428] border-b border-sky-400/20 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-[56px] flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-sky-400 flex items-center justify-center font-vt text-xl text-[#040d1a]"
              style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>S</div>
            <div>
              <div className="font-vt text-2xl text-sky-400 tracking-[0.18em] leading-none">SENTINEL</div>
              <div className="text-[9px] text-sky-400/40 tracking-[0.12em]">MT5 TRADING DASHBOARD</div>
            </div>
          </div>
          <nav className="hidden md:flex flex-1 h-[56px]">
            {navTabs.map(t => (
              <button key={t.id}
                className={`h-[56px] px-5 font-vt text-lg tracking-widest border-b-2 cursor-pointer whitespace-nowrap transition-all ${activeTab===t.id?'text-sky-400 border-sky-400':'text-sky-400/40 border-transparent hover:text-sky-400 hover:border-sky-400/40'}`}
                onClick={() => handleNavClick(t.id)}>{t.label}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <button className="w-9 h-9 border border-sky-400/25 bg-[#0a1d3a] flex items-center justify-center cursor-pointer hover:border-sky-400/50 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* User menu */}
            <div className="relative flex items-center gap-1.5 bg-[#0a1d3a] border border-sky-400/25 px-2.5 py-1.5 cursor-pointer hover:border-sky-400/50 transition-colors"
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>
              <div className="w-6 h-6 bg-sky-400 rounded-full flex items-center justify-center font-vt text-sm text-[#040d1a]">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="font-vt text-base text-sky-400/80 tracking-widest">{profile?.username?.toUpperCase() || 'USER'}</span>
              <span className="text-[10px] text-sky-400/40">▼</span>
              {menuOpen && (
                <div className="absolute top-[44px] right-0 bg-[#071428] border border-sky-400/25 min-w-[220px] z-50 shadow-2xl"
                  onClick={e => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b border-sky-400/10">
                    <div className="font-vt text-xl text-slate-200">{profile?.username?.toUpperCase()}</div>
                    <div className="text-xs text-yellow-400 tracking-widest mt-0.5">● {profile?.role?.toUpperCase() || 'USER'}</div>
                  </div>
                  {[
                    {label:'👤 MY ACCOUNTS', onClick:() => router.push('/accounts')},
                    ...(profile?.role==='admin'?[{label:'👥 USER MANAGEMENT', onClick:() => router.push('/admin')}]:[]),
                    {label:'👤 MY PROFILE', onClick:() => {}},
                    {label:'📥 DOWNLOADS', onClick:() => {}},
                    {label:'📚 EA LIBRARY', onClick:() => {}},
                  ].map((item, i) => (
                    <button key={i} onClick={item.onClick}
                      className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-sky-400/70 hover:bg-sky-400/8 hover:text-sky-400 w-full text-left transition-colors border-b border-white/3">
                      {item.label}
                    </button>
                  ))}
                  <button onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-400/70 hover:bg-red-400/8 hover:text-red-400 w-full text-left transition-colors">
                    → LOGOUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="bg-[#071428] border-b border-sky-400/10 overflow-hidden">
        <div className="flex gap-8 px-4 py-1.5 whitespace-nowrap"
          style={{animation:'scroll 40s linear infinite'}}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState='paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState='running')}>
          <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
          {['XAUUSD','EURUSD','BTCUSD','GBPUSD','USDJPY','NASDAQ','SP500','XAUUSD','EURUSD','BTCUSD','GBPUSD','USDJPY','NASDAQ','SP500'].map((s,i) => (
            <span key={i} className="font-vt text-sm flex gap-2 items-center">
              <span className="text-sky-400/70 tracking-wider">{s}</span>
              <span className="text-slate-300">{(1800+Math.random()*600).toFixed(2)}</span>
              <span className={Math.random()>0.5?'text-green-400':'text-red-400'}>{Math.random()>0.5?'▲':'▼'}{(Math.random()*1.5).toFixed(2)}%</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pt-4 relative z-10">
        {activeTab === 'portfolio' && <>

          {/* PORTFOLIO OVERVIEW */}
          <div className="font-vt text-lg tracking-[0.14em] text-sky-400 flex items-center gap-2 mb-2 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/35 after:to-transparent">
            PORTFOLIO OVERVIEW
          </div>
          <div className="font-vt text-xs text-sky-400/40 tracking-[0.12em] flex items-center gap-1.5 mb-3 before:content-['◆'] before:text-[8px]">
            ALL VALUES IN USD
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { label:'ACCOUNTS', val:`${onlineCount}/${accounts.length}`, sub: onlineCount===accounts.length&&accounts.length>0?'All online':`${accounts.length-onlineCount} offline`, subColor: onlineCount===accounts.length&&accounts.length>0?'#4ade80':'#fbbf24', accent:'sky' },
              { label:'TOTAL BALANCE', val:`$${fmt(totalBalance)}`, sub:'incl. all accounts', accent:'sky' },
              { label:'TOTAL EQUITY', val:`$${fmt(totalEquity)}`, sub:`▲ ${totalBalance>0?Math.abs((totalEquity-totalBalance)/totalBalance*100).toFixed(2):'0.00'}% vs balance`, subColor:totalEquity>=totalBalance?'#4ade80':'#f87171', accent:'green', valColor:'#4ade80' },
              { label:'FLOATING P/L', val:fmtPL(totalFloating), valColor:plHex(totalFloating), sub:'Unrealized', accent:'sky' },
              { label:'OPEN LOTS', val:(totalBuyLots+totalSellLots).toFixed(2), valColor:'#38bdf8', sub:`B:${totalBuyLots.toFixed(2)} / S:${totalSellLots.toFixed(2)}`, accent:'sky' },
              { label:'PENDING', val:String(totalPending), valColor:'#fbbf24', sub:'total pending', accent:'yellow' },
            ].map((c, i) => (
              <div key={i} className="bg-[#0a1d3a] border border-sky-400/15 px-3 py-3 relative overflow-hidden">
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accent==='green'?'bg-green-400':c.accent==='yellow'?'bg-yellow-400':'bg-sky-400'}`}/>
                <div className="text-[10px] text-sky-400/50 tracking-[0.12em] mb-1.5 font-mono">{c.label}</div>
                <div className="font-vt text-2xl leading-none" style={{color:c.valColor||'#e2e8f0'}}>{c.val}</div>
                {c.sub && <div className="text-[10px] mt-1 font-mono" style={{color:c.subColor||'rgba(56,189,248,0.4)'}}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* MY ACCOUNTS header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="font-vt text-lg text-sky-400 tracking-[0.14em] flex items-center gap-1.5 before:content-['◆'] before:text-xs">MY ACCOUNTS</div>
            <div className="flex gap-1 flex-wrap">
              {['All','Online','Offline','Profit','Loss'].map(f => (
                <button key={f}
                  className={`border font-vt text-sm px-3 py-0.5 cursor-pointer transition-all tracking-wider ${filter===f.toLowerCase()?'bg-sky-400/15 border-sky-400 text-sky-400':'border-sky-400/20 text-sky-400/50 hover:border-sky-400/50 hover:text-sky-400'}`}
                  onClick={() => setFilter(f.toLowerCase())}>{f}</button>
              ))}
            </div>
            <span className="font-vt text-sm text-sky-400/50 border border-sky-400/15 px-2 py-0.5">{filtered.length}/{accounts.length}</span>
            <div className="flex gap-1 ml-auto">
              <button className={`border font-vt text-sm px-2.5 py-0.5 cursor-pointer transition-all tracking-wider ${view==='card'?'border-sky-400 text-sky-400 bg-sky-400/10':'border-sky-400/20 text-sky-400/40 hover:border-sky-400'}`}
                onClick={() => setView('card')}>⊞ CARD</button>
              <button className={`border font-vt text-sm px-2.5 py-0.5 cursor-pointer transition-all tracking-wider ${view==='compact'?'border-sky-400 text-sky-400 bg-sky-400/10':'border-sky-400/20 text-sky-400/40 hover:border-sky-400'}`}
                onClick={() => setView('compact')}>≡ COMPACT</button>
            </div>
          </div>

          {/* CARD VIEW */}
          {view === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
              {filtered.map(acc => {
                const offline = isOffline(acc)
                const dd = acc.drawdown_pct || 0
                const ddCls = dd>=30?'text-red-400 border-red-400/40':dd>=10?'text-yellow-400 border-yellow-400/40':'text-green-400 border-green-400/40'
                const bal = acc.balance||0, eq = acc.equity||0
                const eqPct = bal>0?Math.min(100, eq/bal*100):100
                const eqBarColor = offline?'bg-red-400':dd>=30?'bg-red-400':dd>=10?'bg-yellow-400':'bg-green-400'
                const ml = acc.margin_level||0
                const mlColor = ml>0&&ml<150?'text-red-400':ml<300?'text-yellow-400':'text-green-400'
                const todayColor = (acc.today_pl||0)>=0?'text-green-400':'text-red-400'
                const floatColor = (acc.floating_pl||0)>=0?'text-green-400':'text-red-400'
                const eqColor = eq>bal?'text-green-400':eq===bal?'text-sky-400':'text-red-400'
                return (
                  <div key={acc.id} className={`bg-[#0a1d3a] border border-sky-400/20 border-l-2 p-4 transition-all hover:border-sky-400/40 ${offline?'border-l-red-400 opacity-70':'border-l-sky-400'}`}>
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${offline?'bg-red-400':'bg-green-400 animate-pulse'}`}/>
                        <div>
                          <div className={`font-vt text-2xl tracking-wide leading-none ${offline?'text-red-400':'text-slate-100'}`}>{acc.nickname}</div>
                          <div className="text-[11px] text-sky-400/40 mt-0.5 flex items-center gap-1.5 font-mono">
                            #{acc.account_number||'—'}
                            <span className="px-1 border border-sky-400/25 text-sky-400/60 text-[10px]">{acc.currency||'USD'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`font-vt text-sm px-2 py-0.5 border ${offline?'text-red-400 border-red-400/40':ddCls}`}>
                        {offline?'OFFLINE':'DD '+fmt(dd)+'%'}
                      </span>
                    </div>

                    {/* equity bar */}
                    <div className="h-[3px] bg-sky-400/8 mb-3">
                      <div className={`h-full transition-all ${eqBarColor}`} style={{width:eqPct.toFixed(0)+'%'}}/>
                    </div>

                    {offline && <div className="font-vt text-sm text-red-400 bg-red-400/8 border border-red-400/20 px-2.5 py-1 mb-3">⚠ OFFLINE</div>}

                    {/* stats grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        {label:'Balance', val:fmt(bal), cls:'text-slate-200'},
                        {label:'Equity', val:fmt(eq), cls:eqColor},
                        {label:'Orders', val:`${acc.open_orders||0} open`, cls:(acc.open_orders||0)>0?'text-yellow-400':'text-slate-200'},
                        {label:'Margin', val:fmt(acc.margin||0), cls:mlColor},
                        {label:'Margin Lvl', val:ml>0?fmt(ml,0)+'%':'—', cls:mlColor},
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="text-[10px] text-sky-400/40 tracking-wide mb-0.5 font-mono">{s.label}</div>
                          <div className={`font-vt text-lg leading-none ${s.cls}`}>{s.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* TODAY / FLOATING */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[#071428] border border-sky-400/10 px-3 py-2">
                        <div className="text-[10px] text-sky-400/40 tracking-widest mb-1 font-mono">TODAY</div>
                        <div className={`font-vt text-xl ${todayColor}`}>{fmtPL(acc.today_pl||0)}</div>
                      </div>
                      <div className="bg-[#071428] border border-sky-400/10 px-3 py-2">
                        <div className="text-[10px] text-sky-400/40 tracking-widest mb-1 font-mono">FLOATING P/L</div>
                        <div className={`font-vt text-xl ${floatColor}`}>{fmtPL(acc.floating_pl||0)}</div>
                      </div>
                    </div>

                    {/* LOT EXPOSURE */}
                    <div className="flex items-center gap-2 mb-3 text-[10px] text-sky-400/40 tracking-widest font-mono">
                      LOT EXPOSURE
                      <span className="font-vt text-sm text-green-400 border border-green-400/30 px-2 py-0.5">B:{fmt(acc.buy_lots||0)}</span>
                      <span className="font-vt text-sm text-red-400 border border-red-400/30 px-2 py-0.5">S:{fmt(acc.sell_lots||0)}</span>
                    </div>

                    {acc.broker_name && (
                      <div className="text-[11px] text-sky-400/35 tracking-wide mb-3 flex items-center gap-1 font-mono before:content-['◆'] before:text-[8px]">
                        {acc.broker_name}
                      </div>
                    )}

                    <button onClick={() => router.push(`/orders?account=${acc.id}`)}
                      className="font-vt text-sm tracking-widest px-4 py-1.5 border border-sky-400/25 text-sky-400/60 hover:border-sky-400 hover:text-sky-400 transition-all cursor-pointer bg-transparent">
                      ORDERS
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* COMPACT VIEW */}
          {view === 'compact' && (
            <div className="mb-4">
              <div className="hidden md:grid grid-cols-[16px_180px_1fr_110px_100px_120px] gap-2.5 bg-sky-400/5 border-b border-sky-400/15 font-vt text-sm tracking-widest text-sky-400/50 px-4 py-2">
                <span/><span>ACCOUNT</span><span>BALANCE</span><span>TODAY P/L</span><span>FLOATING</span><span>DD</span>
              </div>
              {filtered.map(acc => {
                const offline = isOffline(acc)
                return (
                  <div key={acc.id} className={`flex md:grid md:grid-cols-[16px_180px_1fr_110px_100px_120px] gap-2.5 items-center bg-[#0a1d3a] border border-sky-400/10 border-l-2 px-4 py-2.5 mb-1 cursor-pointer hover:border-sky-400/30 transition-all ${offline?'border-l-red-400 opacity-60':'border-l-sky-400'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${offline?'bg-red-400':'bg-green-400 animate-pulse'}`}/>
                    <div>
                      <div className="font-vt text-lg text-slate-200">{acc.nickname}</div>
                      <div className="text-[10px] text-sky-400/40 font-mono">{fmt(acc.balance||0)} {acc.currency||'USD'}</div>
                    </div>
                    <div className="font-vt text-base text-sky-400/60">{fmt(acc.balance||0)}</div>
                    <div className={`font-vt text-base ${plColor(acc.today_pl||0)}`}>{fmtPL(acc.today_pl||0)}</div>
                    <div className={`font-vt text-base ${plColor(acc.floating_pl||0)}`}>{fmtPL(acc.floating_pl||0)}</div>
                    <div className="font-vt text-sm" style={{color:ddColor(acc.drawdown_pct||0)}}>DD {(acc.drawdown_pct||0).toFixed(2)}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </>}

        {activeTab !== 'portfolio' && (
          <div className="font-vt text-xl text-sky-400/40 py-16 text-center border border-sky-400/10">
            {activeTab.toUpperCase()} — COMING SOON
          </div>
        )}
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#071428] border-t border-sky-400/15 flex md:hidden z-50">
        {mobTabs.map(t => (
          <button key={t.id} className="flex-1 py-2 pb-2.5 text-center bg-transparent border-none cursor-pointer"
            onClick={() => handleNavClick(t.id)}>
            <span className="text-lg block mb-0.5">{t.icon}</span>
            <span className={`font-vt text-xs tracking-wide ${activeTab===t.id?'text-sky-400':'text-sky-400/40'}`}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
