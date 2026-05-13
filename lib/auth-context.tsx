'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type User = { id: string; email: string }
type Profile = {
  id: string; username: string; full_name: string; role: string
  status: string; package_tier: string; max_slots: number
}
type AuthCtx = { user: User|null; profile: Profile|null; loading: boolean; signOut: ()=>void }

const Ctx = createContext<AuthCtx>({ user:null, profile:null, loading:true, signOut:()=>{} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if(data) setProfile(data)
  }

  useEffect(()=>{
    supabase.auth.getUser().then(({ data:{ user } })=>{
      if(!user){ setLoading(false); return }
      setUser({ id: user.id, email: user.email||'' })
      fetchProfile(user.id).then(()=>setLoading(false))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session)=>{
      if(!session){ setUser(null); setProfile(null); setLoading(false) }
      else {
        setUser({ id: session.user.id, email: session.user.email||'' })
        fetchProfile(session.user.id)
      }
    })
    return () => listener.subscription.unsubscribe()
  },[])

  async function signOut(){
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
    router.push('/')
  }

  return <Ctx.Provider value={{ user, profile, loading, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)