import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 401 })

    // Verify API key
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (accErr || !account) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const d = await req.json()
    const now = new Date().toISOString()

    // Update account info
    const updateData: Record<string, unknown> = { is_online: true, last_seen: now }
    if (d.account_number) updateData.account_number = d.account_number
    if (d.broker_name)    updateData.broker_name    = d.broker_name
    if (d.server_name)    updateData.server_name    = d.server_name
    if (d.currency)       updateData.currency       = d.currency
    if (d.leverage)       updateData.leverage       = d.leverage

    await supabase.from('accounts').update(updateData).eq('id', account.id)

    // Calculate values
    const balance      = parseFloat(d.balance)      || 0
    const equity       = parseFloat(d.equity)       || 0
    const margin       = parseFloat(d.margin)       || 0
    const drawdown_pct = balance > 0 ? Math.max(0, (balance - equity) / balance * 100) : 0
    const margin_level = margin > 0 ? equity / margin * 100 : null

    // Insert snapshot
    await supabase.from('snapshots').insert({
      account_id:     account.id,
      captured_at:    now,
      balance,
      equity,
      free_margin:    parseFloat(d.free_margin)    || 0,
      margin,
      margin_level,
      drawdown_pct,
      floating_pl:    parseFloat(d.floating_pl)    || 0,
      today_pl:       parseFloat(d.today_pl)       || 0,
      open_orders:    parseInt(d.open_orders)      || 0,
      pending_orders: parseInt(d.pending_orders)   || 0,
      buy_lots:       parseFloat(d.buy_lots)       || 0,
      sell_lots:      parseFloat(d.sell_lots)      || 0,
      total_lots:     parseFloat(d.total_lots)     || 0,
    })

    // Keep only latest 200 snapshots
    const { data: snaps } = await supabase
      .from('snapshots')
      .select('id, captured_at')
      .eq('account_id', account.id)
      .order('captured_at', { ascending: false })

    if (snaps && snaps.length > 200) {
      const toDelete = snaps.slice(200).map(s => s.id)
      await supabase.from('snapshots').delete().in('id', toDelete)
    }

    // Update orders
    await supabase.from('orders').delete().eq('account_id', account.id)
    if (Array.isArray(d.orders) && d.orders.length > 0) {
      await supabase.from('orders').insert(
        d.orders.map((o: Record<string, unknown>) => ({
          account_id:    account.id,
          updated_at:    now,
          ticket:        o.ticket,
          symbol:        o.symbol,
          order_type:    o.type,
          lots:          o.lots,
          open_price:    o.open_price,
          current_price: o.current_price,
          stop_loss:     o.stop_loss,
          take_profit:   o.take_profit,
          swap:          o.swap    || 0,
          commission:    o.commission || 0,
          profit:        o.profit  || 0,
          open_time:     o.open_time,
          comment:       o.comment
        }))
      )
    }

    // Daily stats — UTC+7
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: existing } = await supabase
      .from('daily_stats')
      .select('id')
      .eq('account_id', account.id)
      .eq('trade_date', today)
      .single()

    if (existing) {
      await supabase.from('daily_stats').update({
        pl_usd:        parseFloat(d.today_pl)          || 0,
        orders_count:  parseInt(d.closed_orders_today) || 0,
      }).eq('id', existing.id)
    } else {
      await supabase.from('daily_stats').insert({
        account_id:   account.id,
        trade_date:   today,
        pl_usd:       parseFloat(d.today_pl)          || 0,
        orders_count: parseInt(d.closed_orders_today) || 0,
        currency:     d.currency || 'USD',
        nickname_snapshot: account.nickname,
      })
    }

    return NextResponse.json({ success: true, received_at: now })

  } catch (e) {
    console.error('Push error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
