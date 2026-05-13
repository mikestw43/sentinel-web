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

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthDates = Object.keys(byDate).filter(d => d.startsWith(monthKey))
  const monthPL = monthDates.reduce((s, d) => s + dayPL(d), 0)
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

  function fmt(n: number, d = 2) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
  function fmtK(n: number) {
    const abs = Math.abs(n)
    const sign = n >= 0 ? '+' : '-'
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
    return `${sign}$${fmt(abs, 0)}`
  }
  function fmtPL(n: number) { return (n >= 0 ? '+' : '-') + '$' + fmt(Math.abs(n)) }
  function plHex(n: number) { return n > 0 ? '#4ade80' : n < 0 ? '#f87171' : 'rgba(56,189,248,0.4)' }
  function fmtMonthLabel(date: Date) { return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() }
  function prevMonth() { setCurrentMonth(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentMonth(new Date(year, month + 1, 1)) }
  function dayKey(d: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
  function isToday(d: number) {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d
  }
  function weekPL(weekIdx: number) {
    return weeks[weekIdx].reduce((s: number, d: number | null) => {
      if (!d) return s
      return s + dayPL(dayKey(d))
    }, 0)
  }
  function fmtDayShort(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }

  if (authLoading || dataLoading) return (
    <div className="fixed inset-0 bg-[#040d1a] flex items-center justify-center font-vt text-3xl text-sky-400 tracking-[0.2em]"
      style={{ textShadow: '0 0 20px rgba(56,189,248,0.8)' }}>
      LOADING HISTORY...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#040d1a] pb-8">
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* HEADER */}
      <header className="bg-[#071428] border-b border-sky-400/20 sticky top-0 z-50"
        style={{ boxShadow: '0 1px 20px rgba(56,189,248,0.08)' }}>
        <div className="max-w-[1400px] mx-auto px-3 h-[56px] flex items-center gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-sky-400 flex items-center justify-center font-vt text-lg text-[#040d1a]"
              style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)', boxShadow: '0 0 12px rgba(56,189,248,0.6)' }}>S</div>
            <div className="font-vt text-xl text-sky-400 tracking-[0.18em]"
              style={{ textShadow: '0 0 10px rgba(56,189,248,0.5)' }}>SENTINEL</div>
          </div>
          <nav className="hidden md:flex flex-1 h-[56px]">
            {[
              { id: 'portfolio', label: 'PORTFOLIO' },
              { id: 'health', label: 'ACCOUNT HEALTH' },
              { id: 'calendar', label: 'CALENDAR' },
              { id: 'performance', label: 'PERFORMANCE' },
            ].map(t => (
              <button key={t.id}
                className={`h-[56px] px-4 font-vt text-base tracking-widest border-b-2 cursor-pointer whitespace-nowrap transition-all ${t.id === 'performance' ? 'text-sky-400 border-sky-400' : 'text-sky-400/50 border-transparent hover:text-sky-400'}`}
                style={t.id === 'performance' ? { textShadow: '0 0 8px rgba(56,189,248,0.6)' } : {}}
                onClick={() => t.id !== 'performance' && router.push('/dashboard')}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <select className="bg-[#0a1d3a] border border-sky-400/25 text-sky-400 font-vt text-sm px-2 py-1.5 cursor-pointer outline-none max-w-[140px]"
              value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="all">ALL ACCOUNTS</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.nickname}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-3 pt-3 relative z-10">

        {/* PERFORMANCE TITLE */}
        <div className="font-vt text-base tracking-[0.14em] text-sky-400 flex items-center gap-2 mb-3 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/40 after:to-transparent"
          style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
          PERFORMANCE
        </div>

        {/* MONTHLY P/L BIG */}
        <div className="bg-[#071428] border border-sky-400/20 px-4 py-4 mb-3 text-center relative overflow-hidden"
          style={{ boxShadow: 'inset 0 0 40px rgba(56,189,248,0.03)' }}>
          <div className="font-vt text-sm text-sky-400/60 tracking-[0.2em] mb-1">{fmtMonthLabel(currentMonth)}</div>
          <div className="font-vt text-4xl md:text-5xl mb-3"
            style={{ color: plHex(monthPL), textShadow: `0 0 20px ${plHex(monthPL)}66` }}>
            {fmtPL(monthPL)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={prevMonth}
              className="font-vt text-sm text-sky-400/60 border border-sky-400/20 px-2.5 py-1 hover:text-sky-400 hover:border-sky-400 transition-all cursor-pointer bg-transparent">
              ◄ PREV
            </button>
            <span className="font-vt text-base text-sky-400 tracking-widest px-2"
              style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
              {fmtMonthLabel(currentMonth)}
            </span>
            <button onClick={nextMonth}
              className="font-vt text-sm text-sky-400/60 border border-sky-400/20 px-2.5 py-1 hover:text-sky-400 hover:border-sky-400 transition-all cursor-pointer bg-transparent">
              NEXT ►
            </button>
          </div>
        </div>

        {/* MONTHLY STATS */}
        <div className="font-vt text-base tracking-[0.14em] text-sky-400 flex items-center gap-2 mb-2 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/40 after:to-transparent"
          style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
          MONTHLY STATS
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {[
            { label: 'BEST DAY', val: bestDay ? fmtPL(dayPL(bestDay)) : '+$0.00', sub: bestDay ? fmtDayShort(bestDay) : '—', color: '#4ade80', accent: 'bg-green-400' },
            { label: 'WORST DAY', val: worstDay ? fmtPL(dayPL(worstDay)) : '-$0.00', sub: worstDay ? fmtDayShort(worstDay) : '—', color: '#f87171', accent: 'bg-red-400' },
            { label: 'WIN DAYS', val: String(monthWinDays.length), sub: `of ${monthDates.length} days`, color: '#4ade80', accent: 'bg-green-400' },
            { label: 'AVG DAILY', val: fmtPL(avgDaily), sub: 'USD equiv', color: plHex(avgDaily), accent: avgDaily >= 0 ? 'bg-green-400' : 'bg-red-400' },
          ].map((c, i) => (
            <div key={i} className="bg-[#071428] border border-sky-400/15 px-3 py-2.5 relative overflow-hidden"
              style={{ clipPath: 'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))' }}>
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accent}`}
                style={{ boxShadow: `0 0 6px ${c.color}` }} />
              <div className="text-[10px] text-sky-400/60 tracking-[0.12em] mb-0.5 font-mono">{c.label}</div>
              <div className="font-vt text-xl md:text-2xl" style={{ color: c.color, textShadow: `0 0 8px ${c.color}66` }}>{c.val}</div>
              <div className="text-[10px] text-sky-400/40 mt-0.5 font-mono">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* MONTHLY BAR CHART */}
        <div className="font-vt text-base tracking-[0.14em] text-sky-400 flex items-center gap-2 mb-2 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/40 after:to-transparent"
          style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
          MONTHLY P/L {year} (USD)
        </div>
        <div className="bg-[#071428] border border-sky-400/15 px-3 pt-5 pb-2 mb-3">
          <div className="flex items-center gap-0.5 h-24 relative">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-sky-400/15" />
            {monthlyPL.map((pl, i) => {
              const pct = Math.abs(pl) / maxMonthly * 44
              const isCurrentMonth = i === month
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full relative group">
                  <div className="flex-1 flex flex-col justify-end w-full">
                    {pl > 0 && (
                      <div className="transition-all mx-auto"
                        style={{
                          height: `${pct}px`,
                          background: '#4ade80',
                          boxShadow: isCurrentMonth ? '0 0 10px #4ade8099' : '0 0 4px #4ade8033',
                          opacity: isCurrentMonth ? 1 : 0.65,
                          width: '70%',
                        }} />
                    )}
                  </div>
                  <div className="h-px w-full bg-sky-400/15" />
                  <div className="flex-1 flex flex-col justify-start w-full">
                    {pl < 0 && (
                      <div className="transition-all mx-auto"
                        style={{
                          height: `${pct}px`,
                          background: '#f87171',
                          boxShadow: isCurrentMonth ? '0 0 10px #f8717199' : '0 0 4px #f8717133',
                          opacity: isCurrentMonth ? 1 : 0.65,
                          width: '70%',
                        }} />
                    )}
                  </div>
                  {pl !== 0 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 font-vt text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ color: plHex(pl) }}>
                      {fmtK(pl)}
                    </div>
                  )}
                  <div className={`font-vt text-[9px] tracking-wide mt-0.5 ${isCurrentMonth ? 'text-sky-400' : 'text-sky-400/35'}`}>
                    {months[i]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DAILY CALENDAR */}
        <div className="font-vt text-base tracking-[0.14em] text-sky-400 flex items-center gap-2 mb-2 before:content-['◆'] before:text-xs after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-sky-400/40 after:to-transparent"
          style={{ textShadow: '0 0 8px rgba(56,189,248,0.4)' }}>
          DAILY P/L CALENDAR (USD)
        </div>
        <div className="bg-[#071428] border border-sky-400/15 overflow-hidden mb-4">
          {/* Header */}
          <div className="grid grid-cols-6 border-b border-sky-400/10">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'WEEK'].map((d, i) => (
              <div key={d} className={`font-vt text-[10px] md:text-sm text-center py-1.5 tracking-widest border-r border-sky-400/8 last:border-0 ${i === 5 ? 'text-sky-400 bg-sky-400/5' : 'text-sky-400/50'}`}>{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => {
            const wPL = weekPL(wi)
            return (
              <div key={wi} className="grid grid-cols-6 border-b border-sky-400/8 last:border-0">
                {week.map((d, di) => {
                  if (!d) return <div key={di} className="border-r border-sky-400/8 min-h-[48px] md:min-h-[64px]" />
                  const dk = dayKey(d)
                  const pl = byDate[dk] ? dayPL(dk) : null
                  const today = isToday(d)
                  return (
                    <div key={di}
                      className={`border-r border-sky-400/8 min-h-[48px] md:min-h-[64px] p-1 md:p-2 transition-all ${today ? 'ring-1 ring-sky-400/50' : ''} ${pl !== null && pl > 0 ? 'bg-green-400/5' : pl !== null && pl < 0 ? 'bg-red-400/5' : ''}`}>
                      <div className={`font-vt text-sm flex items-center gap-0.5 ${today ? 'text-sky-400' : 'text-sky-400/50'}`}>
                        {today && <span className="w-1 h-1 bg-sky-400 rounded-full flex-shrink-0"
                          style={{ boxShadow: '0 0 4px #38bdf8' }} />}
                        {d}
                      </div>
                      {pl !== null && (
                        <div className="font-vt text-[10px] md:text-sm mt-0.5"
                          style={{ color: plHex(pl), textShadow: `0 0 6px ${plHex(pl)}44` }}>
                          {fmtK(pl)}
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* WEEK */}
                <div className="bg-sky-400/3 min-h-[48px] md:min-h-[64px] p-1 md:p-2 flex flex-col justify-center">
                  <div className="font-vt text-[9px] text-sky-400/40 tracking-widest mb-0.5">Wk{wi + 1}</div>
                  <div className="font-vt text-[11px] md:text-base"
                    style={{ color: plHex(wPL), textShadow: `0 0 6px ${plHex(wPL)}33` }}>
                    {wPL !== 0 ? fmtK(wPL) : '$0'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
