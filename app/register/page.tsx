'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COUNTRIES = [
  { code: '+66', iso: 'th', label: 'Thailand' },
  { code: '+1',  iso: 'us', label: 'United States' },
  { code: '+44', iso: 'gb', label: 'United Kingdom' },
  { code: '+81', iso: 'jp', label: 'Japan' },
  { code: '+65', iso: 'sg', label: 'Singapore' },
  { code: '+60', iso: 'my', label: 'Malaysia' },
  { code: '+62', iso: 'id', label: 'Indonesia' },
  { code: '+63', iso: 'ph', label: 'Philippines' },
  { code: '+84', iso: 'vn', label: 'Vietnam' },
  { code: '+86', iso: 'cn', label: 'China' },
  { code: '+852', iso: 'hk', label: 'Hong Kong' },
  { code: '+82', iso: 'kr', label: 'South Korea' },
  { code: '+91', iso: 'in', label: 'India' },
  { code: '+971', iso: 'ae', label: 'UAE' },
  { code: '+49', iso: 'de', label: 'Germany' },
  { code: '+33', iso: 'fr', label: 'France' },
  { code: '+61', iso: 'au', label: 'Australia' },
  { code: '+7',  iso: 'ru', label: 'Russia' },
  { code: '+55', iso: 'br', label: 'Brazil' },
  { code: '+27', iso: 'za', label: 'South Africa' },
]

function Flag({ iso, size=20 }: { iso: string, size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w${size}/${iso}.png`}
      width={size} height={Math.round(size*0.75)} alt={iso}
      className="block flex-shrink-0 object-cover"
      onError={(e)=>{ (e.target as HTMLImageElement).style.display='none' }}
    />
  )
}

const inputCls = "w-full bg-[#040d1a] border border-sky-400/20 text-slate-200 font-mono text-sm py-2 pl-7 pr-3 outline-none focus:border-sky-400 focus:bg-[#071428] placeholder:text-slate-600 transition-colors"
const clipSm = {clipPath:'polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))'}
const clipMd = {clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))'}

export default function RegisterPage() {
  const [form, setForm] = useState({ username:'', fullname:'', email:'', password:'', phone:'' })
  const [dialCode, setDialCode] = useState('+66')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ref, setRef] = useState('')
  const [ddOpen, setDdOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function set(k:string,v:string){ setForm(f=>({...f,[k]:v})) }
  const selectedCountry = COUNTRIES.find(c=>c.code===dialCode)||COUNTRIES[0]

  async function handleSubmit(){
    if(!form.username||!form.email||!form.password){ setError('Please fill in all required fields'); return }
    if(!form.phone.trim()){ setError('Phone number is required'); return }
    if(form.password.length<8){ setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const fullPhone = dialCode + ' ' + form.phone.trim()
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options:{ data:{ username: form.username, full_name: form.fullname, phone: fullPhone } }
    })
    if(error){ setError(error.message); setLoading(false); return }
    setRef('SNT-'+Math.floor(100000+Math.random()*900000))
    setDone(true); setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 bg-[#040d1a] flex items-center justify-center overflow-auto p-8 font-mono"
      style={{backgroundImage:'linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px)',backgroundSize:'40px 40px'}}
      onClick={()=>ddOpen&&setDdOpen(false)}
    >
      {/* corners */}
      <div className="fixed top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-sky-400"/>
      <div className="fixed top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-sky-400"/>
      <div className="fixed bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-sky-400"/>
      <div className="fixed bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-sky-400"/>

      <div className="w-full max-w-md z-10">
        <div className="bg-[#071428] border border-sky-400/25 border-b-2 border-b-sky-400 p-8"
          style={clipMd}>

          {/* logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-sky-400 flex items-center justify-content flex-shrink-0"
              style={{clipPath:'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)'}}>
              <span className="font-vt text-xl text-[#040d1a] w-full text-center">S</span>
            </div>
            <div>
              <div className="font-vt text-2xl text-sky-400 tracking-[0.2em]">SENTINEL</div>
              <div className="text-[10px] text-sky-400/40 tracking-[0.12em]">MT5 TRADING DASHBOARD</div>
            </div>
          </div>

          {!done ? <>
            <div className="font-vt text-2xl text-slate-200 tracking-[0.15em] mb-1">REQUEST ACCESS</div>
            <div className="text-xs text-sky-400/50 tracking-wide mb-5">Free account — Admin will approve within 24hrs</div>

            {error && <div className="bg-red-400/10 border border-red-400/30 text-red-400 text-xs px-3 py-2 mb-4">⚠ {error}</div>}

            {/* row 2 */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div>
                <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1">USERNAME<span className="text-red-400 ml-0.5">*</span></label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400 text-xs pointer-events-none">▶</span>
                  <input className={inputCls} style={clipSm} type="text" placeholder="mike_trader" value={form.username} onChange={e=>set('username',e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1">FULL NAME</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400 text-xs pointer-events-none">▶</span>
                  <input className={inputCls} style={clipSm} type="text" placeholder="Mike Smith" value={form.fullname} onChange={e=>set('fullname',e.target.value)}/>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1">EMAIL<span className="text-red-400 ml-0.5">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400 text-xs pointer-events-none">▶</span>
                <input className={inputCls} style={clipSm} type="email" placeholder="mike@example.com" value={form.email} onChange={e=>set('email',e.target.value)}/>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1">PASSWORD<span className="text-red-400 ml-0.5">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-400 text-xs pointer-events-none">▶</span>
                <input className={inputCls} style={clipSm} type="password" placeholder="min 8 characters" value={form.password} onChange={e=>set('password',e.target.value)}/>
              </div>
            </div>

            {/* phone + country */}
            <div className="mb-4">
              <label className="block text-xs text-sky-400/60 tracking-[0.15em] mb-1">PHONE<span className="text-red-400 ml-0.5">*</span></label>
              <div className="flex" onClick={e=>e.stopPropagation()}>
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 bg-[#040d1a] border border-sky-400/20 border-r-0 text-sky-400 text-xs px-2.5 py-2 cursor-pointer whitespace-nowrap h-full transition-colors ${ddOpen?'border-sky-400 bg-[#071428]':'hover:border-sky-400'}`}
                    onClick={()=>setDdOpen(o=>!o)}
                  >
                    <Flag iso={selectedCountry.iso} size={18}/>
                    <span className="text-sky-400 text-xs">{selectedCountry.code}</span>
                    <span className="text-sky-400/50 text-[9px]">{ddOpen?'▲':'▼'}</span>
                  </button>
                  {ddOpen && (
                    <div className="absolute top-full left-0 w-52 bg-[#071428] border border-sky-400/30 z-50 max-h-60 overflow-y-auto shadow-2xl">
                      {COUNTRIES.map(c=>(
                        <div key={c.code} className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-sky-400/10 border-b border-sky-400/5"
                          onClick={()=>{setDialCode(c.code);setDdOpen(false)}}>
                          <Flag iso={c.iso} size={18}/>
                          <span className="flex-1 text-sky-400/70 text-xs">{c.label}</span>
                          <span className="text-sky-400 text-xs font-mono">{c.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="tel" placeholder="8x xxx xxxx" value={form.phone}
                  onChange={e=>set('phone',e.target.value)}
                  className="flex-1 bg-[#040d1a] border border-sky-400/20 text-slate-200 font-mono text-sm py-2 px-3 outline-none focus:border-sky-400 focus:bg-[#071428] placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-sky-400 text-[#040d1a] font-vt text-xl tracking-[0.2em] py-2.5 mt-1 cursor-pointer hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={clipMd}>
              {loading ? '[ SUBMITTING... ]' : '[ SUBMIT REQUEST ]'}
            </button>
            <button onClick={()=>router.push('/')}
              className="w-full bg-transparent border-none text-sky-400/50 font-mono text-xs tracking-widest py-2.5 mt-1.5 cursor-pointer hover:text-sky-400 transition-colors">
              ← Back to Login
            </button>
          </> : (
            <div className="text-center py-4">
              <span className="font-vt text-6xl text-green-500 block mb-3">✓</span>
              <div className="font-vt text-3xl text-green-500 tracking-[0.2em] mb-2">REQUEST SENT!</div>
              <div className="text-xs text-sky-400/60 tracking-wide leading-loose">
                Your access request has been submitted.<br/>
                Admin will review and approve within 24 hours.<br/>
                Check your email for confirmation.
              </div>
              <div className="font-vt text-lg text-sky-400 bg-[#040d1a] border border-sky-400/25 px-5 py-2 inline-block mt-5 tracking-[0.2em]">
                {ref}
              </div>
              <button onClick={()=>router.push('/')}
                className="block w-full text-sky-400 font-mono text-xs tracking-widest py-2.5 mt-6 cursor-pointer hover:text-sky-300 transition-colors">
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
