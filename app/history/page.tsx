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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!user) return
    const { data: accs } = await supabase.from('accounts').select('id,nickname,currency').eq('user_id', user.id).eq('is_active', true)
    if (accs) setAccounts(accs)
    const accIds = accs?.map(a => a.id) || []
    if (accIds.length === 0) { setDataLoading(false); return }
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
    const { data: daily } = await supabase.from('daily_stats').select('*').in('account_id', accIds).gte('trade_date', yearStart).order('trade_date', { ascending: false })
    if (daily) setStats(daily)
    setDataLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) { router.push('/'); return }
    if (user) load()
  }, [authLoading, user, load])

  const filtered = selectedAccount === 'all' ? stats : stats.filter(s => s.account_id === selectedAccount)

  const byDate = filtered.reduce((acc, s) => {
    const d = s.trade_date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {} as Record<string, DailyStat[]>)

  const dayPL = (d: string) => (byDate[d] || []).reduce((s, x) => s + (x.pl_usd || 0), 0)
  const dayOrders = (d: string) => (byDate[d] || []).reduce((s, x) => s + (x.orders_count || 0), 0)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthDates = Object.keys(byDate).filter(d => d.startsWith(monthKey))
  const monthPL = monthDates.reduce((s, d) => s + dayPL(d), 0)
  const monthOrders = monthDates.reduce((s, d) => s + dayOrders(d), 0)
  const monthWinDays = monthDates.filter(d => dayPL(d) > 0)
  const bestDay = monthDates.length > 0 ? monthDates.reduce((a, b) => dayPL(a) > dayPL(b) ? a : b) : null
  const worstDay = monthDates.length > 0 ? monthDates.reduce((a, b) => dayPL(a) < dayPL(b) ? a : b) : null
  const avgDaily = monthDates.length > 0 ? monthPL / monthDates.length : 0

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const monthlyPL = months.map((_, mi) => {
    const mk = `${year}-${String(mi + 1).padStart(2, '0')}`
    return Object.keys(byDate).filter(d => d.startsWith(mk)).reduce((s, d) => s + dayPL(d), 0)
  })
  const maxMonthly = Math.max(...monthlyPL.map(Math.abs), 1)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const calDays: (number | null)[] = Array(startOffset).fill(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)
  while (calDays.length % 5 !== 0) calDays.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < calDays.length; i += 5) weeks.push(calDays.slice(i, i + 5))

  const maxDayPL = Math.max(...monthDates.map(d => Math.abs(dayPL(d))), 1)

  function fmt(n: number, d = 2) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
  function fmtK(n: number) {
    const abs = Math.abs(n)
    const sign = n >= 0 ? '+' : '-'
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}k`
    return `${sign}$${fmt(abs, 2)}`
  }
  function fmtPL(n: number) { return (n >= 0 ? '+' : '-') + '$' + fmt(Math.abs(n)) }
  function plHex(n: number) { return n > 0 ? '#4ade80' : n < 0 ? '#f87171' : 'rgba(56,189,248,0.4)' }
  function fmtMonthLabel(date: Date) { return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() }
  function goToday() { setCurrentMonth(new Date()) }
  function prevMonth() { setCurrentMonth(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentMonth(new Date(year, month + 1, 1)) }
  function dayKey(d: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
  function isToday(d: number) {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d
  }
  function isCurrentMonth() {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month
  }
  function weekPL(weekIdx: number) {
    return weeks[weekIdx].reduce((s: number, d: number | null) => {
      if (!d) return s
      return s + dayPL(dayKey(d))
    }, 0)
  }
  function weekOrders(weekIdx: number) {
    return weeks[weekIdx].reduce((s: number, d: number | null) => {
      if (!d) return s
      return s + dayOrders(dayKey(d))
    }, 0)
  }
  function fmtDayShort(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }
  function cellBg(pl: number | null): string {
    if (pl === null || pl === 0) return '#0a1628'
    const intensity = Math.min(Math.abs(pl) / maxDayPL, 1)
    if (pl > 0) {
      const r = Math.round(10 + intensity * 5)
      const g = Math.round(30 + intensity * 45)
      const b = Math.round(20 + intensity * 15)
      return `rgb(${r},${g},${b})`
    } else {
      const r = Math.round(35 + intensity * 50)
      const g = Math.round(10 + intensity * 5)
      const b = Math.round(10 + intensity * 5)
      return `rgb(${r},${g},${b})`
    }
  }
  function cellBorder(pl: number | null): string {
    if (pl === null || pl === 0) return 'rgba(56,189,248,0.05)'
    const intensity = Math.min(Math.abs(pl) / maxDayPL, 1)
    if (pl > 0) return `rgba(74,222,128,${0.15 + intensity * 0.35})`
    return `rgba(248,113,113,${0.15 + intensity * 0.35})`
  }

  if (authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-[#040d1a] flex items-center justify-center font-vt text-3xl text-sky-400 tracking-[0.2em]"
      style={{ textShadow: '0 0 20px rgba(56,189,248,0.8)' }}>
      LOADING HISTORY...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#060e1f] pb-8">
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* HEADER */}
      <header className="bg-[#080f20] border-b border-sky-400/15 sticky top-0 z-50"
        style={{ boxShadow: '0 1px 20px rgba(56,189,248,0.06)' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-[52px] flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-sky-400 flex items-center justify-center font-vt text-lg font-bold text-[#040d1a]"
              style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)', boxShadow: '0 0 12px rgba(56,189,248,0.5)' }}>S</div>
            <div className="font-vt text-xl text-sky-400 tracking-[0.18em] font-bold"
              style={{ textShadow: '0 0 10px rgba(56,189,248,0.4)' }}>SENTINEL</div>
          </div>
          <nav className="hidden md:flex flex-1 h-[52px]">
            {[
              { id: 'portfolio', label: 'PORTFOLIO' },
              { id: 'health', label: 'ACCOUNT HEALTH' },
              { id: 'calendar', label: 'CALENDAR' },
              { id: 'performance', label: 'PERFORMANCE' },
            ].map(t => (
              <button key={t.id}
                className={`h-[52px] px-4 font-vt text-sm tracking-widest border-b-2 cursor-pointer whitespace-nowrap transition-all ${t.id === 'performance' ? 'text-sky-400 border-sky-400' : 'text-white/30 border-transparent hover:text-sky-400/70'}`}
                style={t.id === 'performance' ? { textShadow: '0 0 8px rgba(56,189,248,0.5)' } : {}}
                onClick={() => t.id !== 'performance' && router.push('/dashboard')}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <select className="bg-[#0d1e3a] border border-sky-400/20 text-sky-400 font-vt text-xs px-3 py-1.5 cursor-pointer outline-none tracking-wider"
              value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="all">ALL ACCOUNTS</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 pt-4 relative z-10">

        {/* TOP ROW: Monthly PL + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

          {/* MONTHLY P/L */}
          <div className="bg-[#0a1628] border border-sky-400/12 px-6 py-6 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ borderTop: '2px solid rgba(56,189,248,0.3)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.012) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="font-vt text-[11px] text-white/40 tracking-[0.25em] mb-3 z-10">{fmtMonthLabel(currentMonth)}</div>
            <div className="font-vt text-4xl md:text-5xl font-bold mb-2 z-10"
              style={{ color: plHex(monthPL) }}>
              {fmtPL(monthPL)}
            </div>
            <div className="font-mono text-[11px] text-white/30 tracking-wider mb-5 z-10">{monthOrders} orders this month</div>
            <div className="flex items-center gap-3 z-10">
              <button onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center border border-sky-400/20 text-white/40 hover:text-sky-400 hover:border-sky-400/50 transition-all cursor-pointer bg-transparent font-vt text-lg">
                ‹
              </button>
              {!isCurrentMonth() && (
                <button onClick={goToday}
                  className="font-vt text-[11px] text-sky-400 border border-sky-400/40 px-4 py-1.5 hover:bg-sky-400/10 transition-all cursor-pointer bg-transparent tracking-[0.15em]">
                  TODAY
                </button>
              )}
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center border border-sky-400/20 text-white/40 hover:text-sky-400 hover:border-sky-400/50 transition-all cursor-pointer bg-transparent font-vt text-lg">
                ›
              </button>
            </div>
          </div>

          {/* STATS 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'BEST DAY', val: bestDay ? fmtPL(dayPL(bestDay)) : '+$0.00', sub: bestDay ? fmtDayShort(bestDay) : '—', color: '#4ade80', top: 'rgba(74,222,128,0.5)' },
              { label: 'WORST DAY', val: worstDay ? fmtPL(dayPL(worstDay)) : '-$0.00', sub: worstDay ? fmtDayShort(worstDay) : '—', color: '#f87171', top: 'rgba(248,113,113,0.5)' },
              { label: 'WIN DAYS', val: `${monthWinDays.length}/${monthDates.length}`, sub: monthDates.length > 0 ? `${Math.round(monthWinDays.length / monthDates.length * 100)}% win rate` : '—', color: '#4ade80', top: 'rgba(74,222,128,0.5)' },
              { label: 'AVG DAILY', val: fmtPL(avgDaily), sub: 'USD equiv', color: plHex(avgDaily), top: avgDaily >= 0 ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)' },
            ].map((c, i) => (
              <div key={i} className="bg-[#0a1628] border border-white/5 px-4 py-4 relative overflow-hidden"
                style={{ borderTop: `2px solid ${c.top}` }}>
                <div className="font-mono text-[10px] text-white/45 tracking-[0.15em] mb-2">{c.label}</div>
                <div className="font-vt text-xl md:text-2xl font-bold" style={{ color: c.color }}>{c.val}</div>
                <div className="font-mono text-[10px] text-white/30 mt-1.5">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY BAR CHART */}
        <div className="bg-[#0a1628] border border-white/5 px-4 pt-3 pb-3 mb-3">
          <div className="font-mono text-[10px] text-white/35 tracking-[0.2em] mb-3">MONTHLY P/L {year} (USD)</div>
          <div className="flex items-center gap-0.5 h-20 relative">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/8" />
            {monthlyPL.map((pl, i) => {
              const pct = Math.abs(pl) / maxMonthly * 40
              const isCurrentM = i === month
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full relative group cursor-pointer">
                  <div className="flex-1 flex flex-col justify-end w-full">
                    {pl > 0 && (
                      <div className="transition-all mx-auto"
                        style={{ height: `${pct}px`, background: '#4ade80', opacity: isCurrentM ? 1 : 0.4, width: '65%', borderRadius: '2px 2px 0 0' }} />
                    )}
                  </div>
                  <div className="h-px w-full bg-white/8" />
                  <div className="flex-1 flex flex-col justify-start w-full">
                    {pl < 0 && (
                      <div className="transition-all mx-auto"
                        style={{ height: `${pct}px`, background: '#f87171', opacity: isCurrentM ? 1 : 0.4, width: '65%', borderRadius: '0 0 2px 2px' }} />
                    )}
                  </div>
                  {pl !== 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-vt text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#0a1628] px-1.5 py-0.5 border border-white/10"
                      style={{ color: plHex(pl) }}>
                      {fmtK(pl)}
                    </div>
                  )}
                  <div className={`font-mono text-[9px] mt-1.5 tracking-wide ${isCurrentM ? 'text-sky-400' : 'text-white/20'}`}>
                    {months[i]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CALENDAR */}
        <div className="bg-[#0a1628] border border-white/5 overflow-hidden mb-6">
          {/* Calendar title bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
            <div className="font-mono text-[10px] text-white/35 tracking-[0.2em]">DAILY P/L CALENDAR (USD)</div>
            <div className="font-mono text-[10px] text-white/25 tracking-[0.12em]">{fmtMonthLabel(currentMonth)}</div>
          </div>

          {/* Day headers */}
          <div className="grid border-b border-white/6" style={{ gridTemplateColumns: 'repeat(5,1fr) 96px' }}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(d => (
              <div key={d} className="font-mono text-[10px] text-center py-2.5 tracking-[0.12em] text-white/35 border-r border-white/5">{d}</div>
            ))}
            <div className="font-mono text-[10px] text-center py-2.5 tracking-[0.12em] text-sky-400/60" style={{ background: 'rgba(56,189,248,0.04)' }}>WEEK</div>
          </div>

          {weeks.map((week, wi) => {
            const wPL = weekPL(wi)
            const wOrders = weekOrders(wi)
            return (
              <div key={wi} className="grid border-b border-white/4 last:border-0" style={{ gridTemplateColumns: 'repeat(5,1fr) 96px' }}>
                {week.map((d, di) => {
                  if (!d) return (
                    <div key={di} className="border-r min-h-[76px]"
                      style={{ background: '#06101e', borderColor: 'rgba(255,255,255,0.03)' }} />
                  )
                  const dk = dayKey(d)
                  const pl = byDate[dk] ? dayPL(dk) : null
                  const orders = byDate[dk] ? dayOrders(dk) : 0
                  const today = isToday(d)
                  const bg = cellBg(pl)
                  const border = cellBorder(pl)
                  return (
                    <div key={di}
                      className="border-r min-h-[76px] p-2.5 transition-all flex flex-col"
                      style={{ background: bg, borderColor: border }}>
                      {today ? (
                        <div className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center mb-2 flex-shrink-0"
                          style={{ boxShadow: '0 0 8px rgba(56,189,248,0.7)' }}>
                          <span className="font-vt text-xs font-bold text-[#040d1a] leading-none">{d}</span>
                        </div>
                      ) : (
                        <div className={`font-vt text-sm mb-2 leading-none ${pl !== null ? 'text-white/50' : 'text-white/18'}`}>{d}</div>
                      )}
                      {pl !== null && (
                        <div className="font-vt text-sm font-bold leading-none flex-1"
                          style={{ color: pl >= 0 ? '#4ade80' : '#f87171' }}>
                          {fmtK(pl)}
                        </div>
                      )}
                      {orders > 0 && (
                        <div className="font-mono text-[9px] mt-auto text-white/22 leading-none">
                          {orders} orders
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* WEEK col */}
                <div className="min-h-[76px] px-3 py-2.5 flex flex-col justify-center"
                  style={{ background: 'rgba(56,189,248,0.025)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="font-mono text-[9px] text-white/25 tracking-[0.1em] mb-1.5">WK {wi + 1}</div>
                  <div className="font-vt text-sm font-bold leading-none"
                    style={{ color: wPL > 0 ? '#4ade80' : wPL < 0 ? '#f87171' : 'rgba(255,255,255,0.15)' }}>
                    {wPL !== 0 ? fmtK(wPL) : '$0.00'}
                  </div>
                  {wOrders > 0 && (
                    <div className="font-mono text-[9px] mt-1.5 text-white/20">{wOrders} orders</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
